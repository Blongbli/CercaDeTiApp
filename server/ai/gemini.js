import { config } from '../config.js';

// IA externa vía Gemini REST (sin SDK, sin consumir RAM del portátil).
// Solo se llama desde /recomendar, nunca automáticamente.
export async function recommendWithGemini(products) {
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiKey}`;

  const prompt =
    `Eres un asistente de compras. El usuario duda entre estos productos (precios en €):\n` +
    `${JSON.stringify(products, null, 2)}\n\n` +
    `Recomienda la mejor opción calidad-precio en español, breve y útil. ` +
    `Devuelve SOLO un JSON con esta forma exacta:\n` +
    `{"recommendation": "texto breve", "bestProductId": "id del mejor", "reason": "por qué"}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini respondió ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  let parsed = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = {};
  }

  return {
    recommendation: parsed.recommendation || 'No se pudo generar la recomendación.',
    bestProductId: parsed.bestProductId ?? null,
    reason: parsed.reason || '',
    provider: 'gemini',
  };
}
