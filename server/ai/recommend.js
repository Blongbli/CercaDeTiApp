import { config, features } from '../config.js';
import { recommendWithGemini } from './gemini.js';
import { recommendWithClaude } from './claude.js';

const NOT_CONFIGURED = {
  recommendation: 'La recomendación con IA no está configurada.',
  bestProductId: null,
  reason: '',
  provider: 'none',
};

// Recomienda usando el proveedor activo. Envía SOLO datos necesarios:
// nombre, precio, tienda, tipo, distancia, rating, abierto/cerrado.
// NUNCA envía ubicación exacta ni datos personales.
export async function recommend(products) {
  if (!features.ai || config.aiProvider === 'none') return NOT_CONFIGURED;

  const slim = (products || []).slice(0, 10).map((p) => ({
    id: String(p.id ?? ''),
    name: p.name ?? '',
    price: typeof p.price === 'number' ? p.price : null,
    store: p.store ?? null,
    type: p.type ?? null,
    distanceMeters: p.distanceMeters ?? p.distance ?? null,
    rating: p.rating ?? null,
    isOpen: p.isOpen ?? p.open ?? null,
  }));

  if (config.aiProvider === 'gemini') return recommendWithGemini(slim);
  if (config.aiProvider === 'claude') return recommendWithClaude(slim);
  return NOT_CONFIGURED;
}
