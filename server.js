const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { Configuration, OpenAIApi } = require('openai');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey) {
  console.warn('Advertencia: define OPENAI_API_KEY en .env (o en variables de entorno de Render).');
}

const configuration = new Configuration({ apiKey: openaiKey });
const openai = new OpenAIApi(configuration);

async function askOpenAI(prompt) {
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
    const result = await askOpenAI(prompt);
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
    const result = await askOpenAI(prompt);
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
