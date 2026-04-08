# 🧊 LSF Smart Fridge

Aplicación web inteligente que analiza fotos de tu nevera con IA para detectar ingredientes y sugerir recetas personalizadas.

## 🚀 Características

- 📸 **Subida de fotos** — Sube una o varias fotos de tu nevera
- 🗜️ **Compresión automática** — Las imágenes se optimizan en el navegador antes de enviar
- 🤖 **Análisis con IA** — Usa Gemini 2.5 Flash para detectar ingredientes
- 👨‍🍳 **Recetas personalizadas** — 3 recetas basadas en tus ingredientes
- ✨ **Regenerar recetas** — Genera 3 recetas alternativas (una vez)
- 📱 **Mobile-first** — Diseño optimizado para móviles

## 🛠️ Tecnologías

- **Frontend:** Next.js 15 + React 19
- **Backend:** Next.js API Routes
- **IA:** Google Gemini 2.5 Flash (Vision)
- **Compresión:** Canvas API (client-side)
- **Estilos:** CSS puro con design tokens

## 📦 Instalación local

```bash
# 1. Clonar repositorio
git clone https://github.com/TU_USUARIO/web-nevera.git
cd web-nevera

# 2. Instalar dependencias
npm install

# 3. Configurar API Key
cp .env.local.example .env.local
# Edita .env.local y añade tu GEMINI_API_KEY

# 4. Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🔑 Obtener API Key de Gemini

1. Ve a [Google AI Studio](https://aistudio.google.com/)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en **"Get API Key"** → **"Create API Key"**
4. Copia la API Key y pégala en `.env.local`

## 🌐 Deploy en Vercel

### Opción A: Deploy desde GitHub

1. **Sube el código a GitHub:**
   ```bash
   git add .
   git commit -m "LSF Smart Fridge - primera versión"
   git push origin main
   ```

2. **Conecta con Vercel:**
   - Ve a [vercel.com](https://vercel.com)
   - Haz clic en **"Add New Project"**
   - Importa tu repositorio de GitHub
   - En **Environment Variables**, añade:
     - `GEMINI_API_KEY` = tu API key
   - Haz clic en **"Deploy"**

### Opción B: Deploy desde CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel

# Cuando pregunte por variables de entorno, añade GEMINI_API_KEY
```

## 📱 Uso

1. Abre la app en tu móvil
2. Pulsa "Subir fotos" y toma fotos de tu nevera
3. Pulsa "Analizar nevera"
4. Revisa los ingredientes detectados y las recetas sugeridas
5. Opcionalmente, pulsa "Generar nuevas recetas" para alternativas

## 📁 Estructura del proyecto

```
web-nevera/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.js      # API endpoint para análisis
│   ├── globals.css            # Diseño completo (design tokens)
│   ├── layout.js              # Layout raíz con SEO
│   └── page.js                # Página principal (SPA)
├── lib/
│   └── imageCompressor.js     # Utilidad de compresión
├── .env.local.example         # Variables de entorno ejemplo
├── .gitignore
├── jsconfig.json
├── next.config.mjs
├── package.json
└── README.md
```

## ⚡ Rendimiento

- Las imágenes se redimensionan a máx. 1200px antes de enviar
- Formato WebP con fallback a JPEG (calidad 70%)
- Una imagen de 16MB se reduce a ~100-300KB
- Sin recarga de página (SPA con estados)
- Lazy loading para imágenes de preview

## 📝 Licencia

MIT © LSF
