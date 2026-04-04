export default async function handler(req, res) {
    // 1. Solo aceptamos peticiones POST (datos enviados)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    // 2. Recuperamos TU clave de las variables de entorno de Vercel (¡Invisible!)
    const API_KEY = process.env.GEMINI_API_KEY;

    try {
        const { contents, generationConfig } = req.body;

        // 3. Llamamos a Google desde el servidor usando la versión estable v1 para gemini-1.5-flash
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents, generationConfig })
            }
        );

        const data = await response.json();
        
        // 4. Le devolvemos la respuesta de la IA a tu web, propagando errores si ocurren
        if (!response.ok) {
            return res.status(response.status).json({ error: data.error || 'Error de Gemini API', details: data });
        }
        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: 'Error interno en el servidor proxy Vercel', message: error.message });
    }
}

