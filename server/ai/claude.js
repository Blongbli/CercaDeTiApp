import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';

const client = config.anthropicKey ? new Anthropic({ apiKey: config.anthropicKey }) : null;

const SCHEMA = {
  type: 'object',
  properties: {
    recommendation: { type: 'string', description: 'Recomendación breve en español (2-3 frases).' },
    bestProductId: { type: 'string', description: 'id del producto recomendado.' },
    reason: { type: 'string', description: 'Por qué es la mejor opción.' },
  },
  required: ['recommendation', 'bestProductId', 'reason'],
  additionalProperties: false,
};

// IA vía Claude. Solo se llama desde /recomendar, nunca automáticamente.
export async function recommendWithClaude(products) {
  if (!client) throw new Error('Claude no configurado');

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [
      {
        role: 'user',
        content:
          `El usuario duda entre estos productos (precios en €):\n` +
          `${JSON.stringify(products, null, 2)}\n\n` +
          `Recomienda la mejor opción calidad-precio, en español, breve y útil. ` +
          `Devuelve el id del producto recomendado.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  let parsed = {};
  try {
    parsed = JSON.parse(textBlock?.text || '{}');
  } catch {
    parsed = {};
  }

  return {
    recommendation: parsed.recommendation || 'No se pudo generar la recomendación.',
    bestProductId: parsed.bestProductId ?? null,
    reason: parsed.reason || '',
    provider: 'claude',
  };
}
