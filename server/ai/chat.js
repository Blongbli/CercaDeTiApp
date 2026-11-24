import { config } from '../config.js';

// Asistente de compras conversacional vía Gemini. Recibe el historial de la
// conversación (roles user/assistant) y, opcionalmente, los productos visibles
// como contexto. Devuelve la respuesta del asistente.
export async function chatWithGemini(messages, productsContext) {
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiKey}`;

  const systemInstruction = {
    parts: [
      {
        text:
          'Eres el asistente de compras de la app CercaDeTi. Ayudas a la persona a decidir qué comprar: ' +
          'haces preguntas útiles cuando falta información, comparas opciones por calidad-precio y ' +
          'recomiendas con criterio y honestidad. Responde SIEMPRE en español, en tono cercano, breve y claro. ' +
          'Si te dan una lista de productos, básate en ella; no inventes precios ni tiendas.',
      },
    ],
  };

  const contents = [];
  if (productsContext && productsContext.length) {
    contents.push({
      role: 'user',
      parts: [{ text: `Contexto — productos visibles ahora:\n${JSON.stringify(productsContext).slice(0, 4000)}` }],
    });
    contents.push({ role: 'model', parts: [{ text: 'Entendido, tendré en cuenta esos productos.' }] });
  }
  for (const m of messages || []) {
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }],
    });
  }

  const body = { contents, systemInstruction, generationConfig: { temperature: 0.6 } };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini respondió ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No he podido responder ahora mismo.';
  return { reply: text, provider: 'gemini' };
}
