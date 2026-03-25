const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { Configuration, OpenAIApi } = require('openai');

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'cambiame',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  console.warn('Advertencia: configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env para habilitar autenticación con Google.');
}

passport.use(new GoogleStrategy({
  clientID: googleClientId || 'NOID',
  clientSecret: googleClientSecret || 'NOSECRET',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
}, function(accessToken, refreshToken, profile, done) {
  const user = {
    id: profile.id,
    name: profile.displayName,
    email: profile.emails?.[0]?.value,
    photo: profile.photos?.[0]?.value
  };
  done(null, user);
}));

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/?auth=failed' }), (req, res) => {
  res.redirect('/?auth=success');
});

app.get('/auth/logout', (req, res) => {
  req.logout(err => {
    if (err) console.error(err);
    res.redirect('/');
  });
});

app.get('/api/user', (req, res) => {
  if (req.user) {
    return res.json({ ok: true, user: req.user });
  }
  res.json({ ok: false, user: null });
});

const openaiKey = process.env.OPENAI_API_KEY;
let openai = null;
if (!openaiKey) {
  console.warn('Advertencia: define OPENAI_API_KEY en .env (o en variables de entorno de Render).');
} else {
  const configuration = new Configuration({ apiKey: openaiKey });
  openai = new OpenAIApi(configuration);
}

function generateCharacterOffline({ name, role, setting, personality }) {
  const n = name || 'Alex';
  const r = role || 'Protagonista';
  const s = setting || 'fantasía moderna';
  const p = personality || 'valiente y curioso';
  return `Personaje: ${n}\nRol: ${r}\nEntorno: ${s}\nPersonalidad: ${p}\n\nBiografía: ${n} creció en un lugar donde las antiguas tradiciones y la tecnología conviven. Siempre ha sentido que su destino es cambiar el mundo.
Motivaciones: Busca justicia y aventura, y quiere proteger a su gente.       
Debilidades: A veces actúa sin pensar y confía demasiado en otros.\nComportamientos típicos: Observador, amigable, empático, toma el liderazgo en crisis.\nEjemplo de diálogo:\n- "No temeré al cambio, lo crearé."\n- "¿Quién quiere explorar conmigo?"\n- "Siento que este lugar guarda un secreto..."`;
}

function generateStoryOffline({ title, characters, theme, length }) {
  const t = title || 'El viaje luminoso';
  const c = characters || 'Un grupo de héroes';
  const th = theme || 'amistad y aventura';
  const l = length || 'mediana';
  return `Título: ${t}\nTema: ${th}\nPersonajes: ${c}\n\nEscenario inicial: En el reino de Liria, donde la magia brota en cada río, comienza la historia de un grupo unido.\nConflicto central: Un antiguo portal amenaza con liberar sombras que corrompen corazones.\nDesarrollo: ${c} se embarca en una misión, enfrentando desafíos que ponen a prueba sus miedos y fortalezas. Sus personalidades marcan cada decisión.\nResolución: Gracias a la confianza y el valor, hallan la fuente de la oscuridad y la transforman en luz; descubren que el verdadero poder está en su unión.`;
}

async function askOpenAI(prompt, fallbackData) {
  if (!openai) {
    if (fallbackData?.type === 'character') return generateCharacterOffline(fallbackData.params);
    if (fallbackData?.type === 'story') return generateStoryOffline(fallbackData.params);
    return 'OpenAI no está configurado. Establece OPENAI_API_KEY en el entorno para usar IA real.';
  }
  const response = await openai.createChatCompletion({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: 'Eres un agente de IA creativo que ayuda a generar historias y personajes.' }, { role: 'user', content: prompt }],
    max_tokens: 800,
    temperature: 0.85,
  });
  return response.data.choices?.[0]?.message?.content || '';
}

app.post('/api/create-character', async (req, res) => {
  try {
    const { name, role, setting, personality } = req.body;
    const prompt = `Crea un personaje detallado para una historia de ficción. Nombre: ${name || 'Aleatorio'}. Rol: ${role || 'Protagonista'}. Entorno: ${setting || 'fantasía moderna'}. Personalidad: ${personality || 'valiente y curioso'}. Incluye:
- Biografía breve
- Motivaciones
- Debilidades
- Comportamientos típicos
- Ejemplo de diálogo (3 líneas)`;
    const result = await askOpenAI(prompt, { type: 'character', params: { name, role, setting, personality } });
    res.json({ ok: true, character: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message || 'Error al generar personaje' });
  }
});

app.post('/api/create-story', async (req, res) => {
  try {
    const { title, characters, theme, length } = req.body;
    const prompt = `Genera una historia creativa con los siguientes parámetros:\nTítulo: ${title || 'Historia mágica'}\nPersonajes: ${characters || 'mismo personaje generados'}\nTema: ${theme || 'amistad y aventura'}\nLongitud: ${length || 'mediana (4-6 párrafos)'}\nIncluye:
- Escenario inicial
- Conflicto central
- Desarrollo con cada personaje actuando según su personalidad
- Resolución inspiradora`
    const result = await askOpenAI(prompt, { type: 'story', params: { title, characters, theme, length } });
    res.json({ ok: true, story: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message || 'Error al generar historia' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
