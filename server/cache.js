// Caché en memoria ultra-ligera. Sin Redis, sin BD: solo un Map.
// Se pierde al reiniciar el servidor (es lo esperado).

const store = new Map(); // key -> { t: timestamp, v: value }
const TTL_MS = 30 * 60 * 1000; // 30 minutos
const MAX_ENTRIES = 100;

// Clave estable: tipo + query normalizada + coords redondeadas a 2 decimales + filtros.
// Redondear coords protege la privacidad (no se guarda ubicación exacta) y mejora los aciertos.
export function makeCacheKey(params = {}) {
  const type = params.type || 'buscar';
  const q = String(params.q || '').trim().toLowerCase();
  const lat = params.lat != null && params.lat !== '' ? Number(params.lat).toFixed(2) : '';
  const lng = params.lng != null && params.lng !== '' ? Number(params.lng).toFixed(2) : '';
  const filters = params.filters ? String(params.filters) : '';
  return [type, q, lat, lng, filters].join('|');
}

export function getCache(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.t > TTL_MS) {
    store.delete(key);
    return null;
  }
  return entry.v;
}

export function setCache(key, value) {
  store.set(key, { t: Date.now(), v: value });
  if (store.size > MAX_ENTRIES) cleanupCache();
}

// Borra entradas caducadas y, si aún sobran, las más antiguas.
export function cleanupCache() {
  const now = Date.now();
  for (const [k, e] of store) {
    if (now - e.t > TTL_MS) store.delete(k);
  }
  if (store.size <= MAX_ENTRIES) return;
  const sorted = [...store.entries()].sort((a, b) => a[1].t - b[1].t);
  for (const [k] of sorted) {
    if (store.size <= MAX_ENTRIES) break;
    store.delete(k);
  }
}
