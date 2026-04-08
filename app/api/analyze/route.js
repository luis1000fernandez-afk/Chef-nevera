/**
 * API Route: /api/analyze
 * 
 * Recibe imágenes en base64, las envía a Gemini para detectar ingredientes,
 * y luego genera recetas basadas en esos ingredientes.
 */

import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

// Configuración del modelo
const MODEL_NAME = 'gemini-1.5-flash';

// Inicializar cliente Gemini
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno.');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Analiza las imágenes para detectar ingredientes
 */
async function detectIngredients(ai, images) {
  const imageParts = images.map((img) => ({
    inlineData: {
      data: img.data,
      mimeType: img.mimeType,
    },
  }));

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Analiza estas fotografías de una nevera/frigorífico y detecta TODOS los ingredientes y alimentos visibles.

INSTRUCCIONES:
1. Identifica cada alimento/ingrediente que puedas distinguir en las imágenes
2. Sé lo más específico posible (ej: "pechuga de pollo" en vez de solo "carne")
3. Incluye también condimentos, salsas, bebidas, y cualquier producto alimenticio visible
4. Si ves envases con etiquetas legibles, menciona el producto específico

FORMATO DE RESPUESTA:
Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{
  "ingredientes": ["ingrediente1", "ingrediente2", "ingrediente3"]
}

NO incluyas explicaciones adicionales, SOLO el JSON.`,
          },
          ...imageParts,
        ],
      },
    ],
  });

  // Extraer JSON de la respuesta
  const text = response.text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error('No se pudo extraer la lista de ingredientes de la respuesta.');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.ingredientes || [];
}

/**
 * Genera recetas basadas en los ingredientes detectados
 */
async function generateRecipes(ai, ingredientes, isRegeneration = false) {
  const prompt = isRegeneration
    ? `Con estos ingredientes disponibles: ${ingredientes.join(', ')}.

Genera 3 recetas COMPLETAMENTE DIFERENTES a las que habrías sugerido anteriormente.
Sé creativo y propón platos variados (uno puede ser un entrante, otro un plato principal, y otro un postre o merienda si los ingredientes lo permiten).`
    : `Con estos ingredientes disponibles: ${ingredientes.join(', ')}.

Genera 3 recetas que se puedan preparar usando PRINCIPALMENTE estos ingredientes.
Si alguna receta necesita un ingrediente básico extra (sal, aceite, agua), puedes incluirlo.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${prompt}

FORMATO DE RESPUESTA:
Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{
  "recetas": [
    {
      "nombre": "Nombre de la Receta",
      "ingredientes": ["200g de ingrediente1", "1 unidad de ingrediente2"],
      "pasos": [
        "Paso 1: descripción detallada",
        "Paso 2: descripción detallada",
        "Paso 3: descripción detallada"
      ]
    }
  ]
}

REGLAS:
- Exactamente 3 recetas
- Los ingredientes con cantidades específicas
- Los pasos deben ser claros y detallados
- Las recetas deben ser realistas y fáciles de preparar en casa
- NO incluyas texto adicional, SOLO el JSON`,
          },
        ],
      },
    ],
  });

  const text = response.text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error('No se pudo extraer las recetas de la respuesta.');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.recetas || [];
}

/**
 * POST /api/analyze
 * Body: { images: [{ data: base64, mimeType: string }], regenerate?: boolean, ingredientes?: string[] }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { images, regenerate, ingredientes: existingIngredients } = body;

    const ai = getClient();

    // Si es regeneración, solo generamos nuevas recetas con ingredientes existentes
    if (regenerate && existingIngredients) {
      const recetas = await generateRecipes(ai, existingIngredients, true);
      return NextResponse.json({ recetas });
    }

    // Flujo normal: detectar ingredientes + generar recetas
    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron imágenes.' },
        { status: 400 }
      );
    }

    // Paso 1: Detectar ingredientes
    const ingredientes = await detectIngredients(ai, images);

    if (ingredientes.length === 0) {
      return NextResponse.json(
        { error: 'No se pudieron detectar ingredientes en las imágenes. Intenta con fotos más claras.' },
        { status: 422 }
      );
    }

    // Paso 2: Generar recetas
    const recetas = await generateRecipes(ai, ingredientes);

    return NextResponse.json({ ingredientes, recetas });
  } catch (error) {
    console.error('Error en /api/analyze:', error);

    // Manejo específico de errores
    if (error.message?.includes('API_KEY')) {
      return NextResponse.json(
        { error: 'Error de configuración: API Key no válida.' },
        { status: 500 }
      );
    }

    if (error.message?.includes('SAFETY')) {
      return NextResponse.json(
        { error: 'Las imágenes no pudieron ser procesadas por restricciones de seguridad.' },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Error interno del servidor. Inténtalo de nuevo.' },
      { status: 500 }
    );
  }
}

// Body size configuration handled in next.config.mjs
