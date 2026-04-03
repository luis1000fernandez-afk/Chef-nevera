export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Solo se permite POST' });
    }

    const API_KEY = process.env.GEMINI_API_KEY;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req.body)
            }
        );

        const data = await response.json();
        return res.status(200).json(data);
        
    } catch (error) {
        return res.status(500).json({ error: 'Error comunicando con Gemini' });
    }
}
