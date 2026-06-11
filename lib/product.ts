import type { Product } from './server';

// Clave estable para identificar un producto (favoritos, dedup).
// Tolera datos faltantes sin romperse.
export function productKey(p: Partial<Product>): string {
  const name = (p.name ?? '').trim().toLowerCase();
  const store = (p.store ?? '').trim().toLowerCase();
  const price = p.price != null ? String(p.price) : '';
  const link = (p.link ?? '').trim().toLowerCase();
  return [name, store, price, link].join('|');
}

// Distancia en metros: usa el campo `distance` si existe; si no, intenta
// deducirla del texto de la tienda (ej. "MediaMarkt (a 450m)" o "Fnac (a 1.2km)").
export function parseDistanceFromStore(store?: string | null): number | null {
  if (!store) return null;
  const m = store.match(/a\s+([\d.,]+)\s*(km|m)\b/i);
  if (!m) return null;
  const val = parseFloat(m[1].replace(',', '.'));
  if (isNaN(val)) return null;
  return m[2].toLowerCase() === 'km' ? val * 1000 : val;
}

export function distanceMeters(p: Product): number | null {
  if (typeof p.distance === 'number') return p.distance;
  return parseDistanceFromStore(p.store);
}

export function formatDistance(meters: number | null): string | null {
  if (meters == null) return null;
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export function hasPrice(p: Product): boolean {
  return typeof p.price === 'number' && p.price > 0;
}

export function canRoute(p: Product): boolean {
  return (p.lat != null && p.lng != null) || !!(p.address && p.address.trim());
}

export type TagContext = {
  cheapestKey?: string | null;
  nearestKey?: string | null;
  bestPickId?: string | null;
};

// Etiquetas deducibles localmente para una tarjeta.
export function computeTags(p: Product, ctx: TagContext): string[] {
  const tags: string[] = [];
  const key = productKey(p);
  if (ctx.bestPickId && p.id === ctx.bestPickId) tags.push('Mejor opción');
  if (ctx.cheapestKey && key === ctx.cheapestKey) tags.push('Más barato');
  if (ctx.nearestKey && key === ctx.nearestKey) tags.push('Más cercano');
  tags.push(p.type === 'online' ? 'Online' : 'Cerca de ti');
  return tags;
}

// Calcula qué producto es el más barato y el más cercano de una lista.
export function tagContextFor(list: Product[], bestPickId?: string | null): TagContext {
  let cheapest: Product | null = null;
  let nearest: Product | null = null;
  let nearestDist = Infinity;
  for (const p of list) {
    if (hasPrice(p) && (cheapest == null || p.price < cheapest.price)) cheapest = p;
    const d = distanceMeters(p);
    if (d != null && d < nearestDist) {
      nearestDist = d;
      nearest = p;
    }
  }
  return {
    cheapestKey: cheapest ? productKey(cheapest) : null,
    nearestKey: nearest ? productKey(nearest) : null,
    bestPickId: bestPickId ?? null,
  };
}
