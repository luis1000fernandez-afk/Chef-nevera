import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

// Nombre del modelo estable
const MODEL_NAME = "gemini-1.5-flash";

export async function POST(req) {
  try {
    const { images } = await req.json();
    
    // Inicializamos la IA con la llave que tienes en Vercel
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Preparamos las fotos
    const imageParts = images.map((img) => ({
      inlineData: {
        data: img.data,
        mimeType: img.mimeType,
      },
    }));

    const prompt = "Analiza estas imágenes de una nevera. Lista los ingredientes visibles y sugiere 3 recetas. Responde SOLO en formato JSON con esta estructura: { 'ingredients': [], 'recipes': [{ 'name': '', 'description': '' }] }";

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();
    
    // Limpiamos el texto por si la IA devuelve símbolos de Markdown (```json)
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    return NextResponse.json(JSON.parse(cleanText));
  } catch (error) {
    console.error("Error en Gemini:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}