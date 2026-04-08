/**
 * API Route: /api/analyze (Corregida)
 */

import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

// Configuración del modelo estable
// Se usa gemini-1.5-flash para máxima compatibilidad y velocidad
const MODEL_NAME = 'gemini-1.5-flash';

// Inicializar cliente Gemini con el SDK correcto (@google/genai)
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no configurada. Por favor, añádela en Vercel.');
  }
  return new GoogleGenAI({ apiKey });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { images, regenerate, ingredientes: existingIngredients } = body;

    const ai = getClient();

    // 1. CASO: REGENERAR RECETAS (Añadir 3 nuevas a las anteriores)
    if (regenerate && existingIngredients) {
      const prompt = `Con estos ingredientes: ${existingIngredients.join(', ')}.
      Genera 3 recetas distintas a las habituales.
      Responde SOLO JSON: { "recetas": [{ "nombre": "", "ingredientes": [], "pasos": [] }] }`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const text = response.text.trim().replace(/```json/g, "").replace(/```/g, "");
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return NextResponse.json(JSON.parse(jsonMatch ? jsonMatch[0] : text));
    }

    // 2. CASO: ANÁLISIS COMPLETO (Ingredientes + Recetas Iniciales)
    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'No se enviaron imágenes.' }, { status: 400 });
    }

    const imageParts = images.map((img) => ({
      inlineData: { data: img.data, mimeType: img.mimeType },
    }));

    const prompt = `Analiza la nevera y detecta ingredientes. Luego sugiere 3 recetas.
    Responde SOLO JSON con esta estructura exacta (en español):
    {
      "ingredientes": ["tomate", "queso"],
      "recetas": [
        {
          "nombre": "Ensalada Caprese",
          "ingredientes": ["2 tomates", "100g queso"],
          "pasos": ["Cortar", "Mezclar"]
        }
      ]
    }`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }, ...imageParts] }],
    });

    const text = response.text.trim().replace(/```json/g, "").replace(/```/g, "");
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error en API:', error);
    return NextResponse.json({ 
      error: `Error de IA: ${error.message}. Verifica que tu API KEY sea correcta.` 
    }, { status: 500 });
  }
}
