import { parseDistanceFromStore } from './util.js';

// Distancia usable: campo distanceMeters si existe; si no, parsea del texto de tienda.
function distOf(item) {
  if (typeof item.distanceMeters === 'number') return item.distanceMeters;
  if (typeof item.distance === 'number') return item.distance;
  return parseDistanceFromStore(item.store);
}

// Ranking barato 0-100 (sin IA). Funciona con datos incompletos.
// Criterios: precio 40 / cercanía 30 / abierto 15 / valoración 15.
export function rankItems(items) {
  if (!Array.isArray(items) || items.length === 0) return { items: [], bestId: null };

  const prices = items.filter((p) => typeof p.price === 'number' && p.price > 0).map((p) => p.price);
  const minP = prices.length ? Math.min(...prices) : null;
  const maxP = prices.length ? Math.max(...prices) : null;

  const dists = items.map(distOf).filter((d) => d != null);
  const minD = dists.length ? Math.min(...dists) : null;
  const maxD = dists.length ? Math.max(...dists) : null;

  let cheapest = null;
  let nearest = null;
  let nearestDist = Infinity;

  const scored = items.map((item) => {
    let score = 0;

    // Precio (40)
    if (typeof item.price === 'number' && item.price > 0 && minP != null) {
      score += maxP === minP ? 40 : 40 * ((maxP - item.price) / (maxP - minP));
      if (cheapest == null || item.price < cheapest.price) cheapest = item;
    }

    // Cercanía (30). Si no hay distancia, valor neutral (no romper, no penalizar de más).
    const d = distOf(item);
    if (d != null && minD != null) {
      score += maxD === minD ? 30 : 30 * ((maxD - d) / (maxD - minD));
      if (d < nearestDist) {
        nearestDist = d;
        nearest = item;
      }
    } else {
      score += 15;
    }

    // Abierto/cerrado (15). null => neutral.
    if (item.isOpen === true) score += 15;
    else if (item.isOpen == null) score += 8;

    // Valoración (15). null => neutral.
    if (typeof item.rating === 'number') score += 15 * (item.rating / 5);
    else score += 8;

    score = Math.round(Math.max(0, Math.min(100, score)));
    return { ...item, score, distanceMeters: d ?? item.distanceMeters ?? null };
  });

  // Mejor opción = mayor score.
  let best = null;
  for (const s of scored) if (best == null || s.score > best.score) best = s;

  const cheapestId = cheapest?.id ?? null;
  const nearestId = nearest?.id ?? null;
  const bestId = best?.id ?? null;

  for (const s of scored) {
    const badges = [];
    if (s.id === bestId) badges.push('Mejor opción');
    if (s.id === cheapestId) badges.push('Más barato');
    if (s.id === nearestId) badges.push('Más cercano');
    if (s.type === 'online') badges.push('Online');
    else if (s.type === 'cerca') badges.push('Cerca de ti');
    if (s.isOpen === true) badges.push('Disponible hoy');
    s.badges = badges;

    const bits = [];
    if (s.id === cheapestId) bits.push('el más barato');
    if (s.id === nearestId) bits.push('el más cercano');
    if (s.isOpen === true) bits.push('abierto ahora');
    if (typeof s.rating === 'number' && s.rating >= 4) bits.push('bien valorado');
    s.reason = bits.length ? `Destaca por ser ${bits.join(' y ')}.` : 'Opción razonable según los datos disponibles.';
  }

  // Ordena por score descendente (ranking básico aplicado en el servidor).
  scored.sort((a, b) => b.score - a.score);
  return { items: scored, bestId };
}
