# AI Story and Character Builder

Proyecto básico de página web + API para generar personajes e historias con OpenAI.

## Requisitos
- Node.js 18+
- Clave de OpenAI (OPENAI_API_KEY)

## Instalación

```bash
npm install
cp .env.example .env
# agregar API key en .env
npm run dev
```

## Uso
- Visitar http://localhost:3000
- Generar personajes e historias.
- Si no tienes OPENAI_API_KEY, el sistema usará generación interna de ejemplo.

## Configuración OpenAI
- Copia `.env.example` a `.env`
- Define `OPENAI_API_KEY=tu_api_key`
- Arranca con `npm start`

## Despliegue en Render
1. Crear un nuevo servicio Web en Render.
2. Conectar el repositorio Git.
3. Build command: `npm install`
4. Start command: `npm start`
5. Añadir variable de entorno `OPENAI_API_KEY`.
6. Deploy.

