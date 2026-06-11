import { config } from '../config.js';
import { haversine } from '../util.js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const AMENITIES = '^(pharmacy|restaurant|cafe|fast_food|bar)$';

function buildAddress(tags) {
  const street = tags['addr:street'];
  const number = tags['addr:housenumber'];
  const city = tags['addr:city'];
  const parts = [];
  if (street) parts.push(number ? `${street} ${number}` : street);
  if (city) parts.push(city);
  return parts.length ? parts.join(', ') : null;
}

// FASE 1 (server) — Tiendas físicas cercanas vía Overpass / OpenStreetMap (gratis).
// Uso responsable: radio limitado, timeout, resultado acotado. La caché de /buscar
// evita repetir llamadas.
export async function searchOverpass(q, lat, lng) {
  if (lat == null || lng == null) return [];

  const r = config.searchRadius;
  // Centro redondeado a 2 decimales (privacidad + cacheabilidad).
  const clat = Number(lat).toFixed(2);
  const clng = Number(lng).toFixed(2);

  const query = `[out:json][timeout:25];
(
  node(around:${r},${clat},${clng})[shop];
  node(around:${r},${clat},${clng})[amenity~"${AMENITIES}"];
  way(around:${r},${clat},${clng})[shop];
  way(around:${r},${clat},${clng})[amenity~"${AMENITIES}"];
);
out center 30;`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  let data;
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'CercaDeTi/1.0 (proyecto personal)',
      },
      body: 'data=' + encodeURIComponent(query),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Overpass respondió ${res.status}`);
    data = await res.json();
  } finally {
    clearTimeout(timeout);
  }

  const stores = (data.elements || [])
    .map((el) => {
      const tags = el.tags || {};
      const name = tags.name;
      if (!name) return null;
      const elat = el.lat ?? el.center?.lat ?? null;
      const elng = el.lon ?? el.center?.lon ?? null;
      const distanceMeters = elat != null && elng != null ? haversine(Number(lat), Number(lng), elat, elng) : null;
      const category = tags.shop || tags.amenity || null;
      const isOpen = null; // OSM no da abierto/cerrado fiable -> null (no inventar)
      return {
        id: `osm-${el.type}-${el.id}`,
        name,
        type: 'nearby',
        source: 'openstreetmap',
        category,
        lat: elat,
        lng: elng,
        address: buildAddress(tags),
        distanceMeters,
        rating: null, // OSM no tiene rating -> null (no inventar)
        isOpen,
        phone: tags.phone || tags['contact:phone'] || null,
        url: tags.website || tags['contact:website'] || null,
        // compat con la app actual:
        open: isOpen,
        location: elat != null && elng != null ? { lat: elat, lng: elng } : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
    .slice(0, 12);

  return stores;
}
