import { config } from '../config.js';
import { haversine } from '../util.js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Clasifica la búsqueda del usuario en tipos de tienda/servicio de OpenStreetMap,
// para mostrar tiendas físicas RELEVANTES al producto (no cualquier comercio).
// Si no reconoce el producto, cae a comercios generales.
const CATEGORIES = [
  { kw: ['portátil', 'portatil', 'ordenador', 'laptop', 'pc', 'tablet', 'móvil', 'movil', 'teléfono', 'telefono', 'smartphone', 'iphone', 'android', 'auricular', 'casco', 'altavoz', 'televis', ' tv', 'monitor', 'consola', 'playstation', 'xbox', 'nintendo', 'videojuego', 'ratón', 'raton', 'teclado', 'cámara', 'camara', 'electrón', 'electron', 'cargador', 'ssd', 'router', 'impresora'], shops: ['electronics', 'computer', 'mobile_phone', 'hifi', 'camera', 'radiotechnics'] },
  { kw: ['hamburguesa', 'pizza', 'kebab', 'bocadillo', 'sushi', 'comida', 'comer', 'burger', 'tapas', 'menú', 'menu del dia', 'desayuno', 'almuerzo', 'cena', 'pollo asado', 'restaurante'], amenities: ['fast_food', 'restaurant', 'cafe'] },
  { kw: ['camiseta', 'ropa', 'pantal', 'vestido', 'abrigo', 'chaqueta', 'sudadera', 'moda', 'jersey', 'falda', 'camisa'], shops: ['clothes', 'fashion', 'boutique'] },
  { kw: ['zapatilla', 'zapato', 'calzado', 'bota', 'sneaker', 'deportiva'], shops: ['shoes'] },
  { kw: ['libro', 'novela', 'revista', 'cómic', 'comic'], shops: ['books'] },
  { kw: ['medicament', 'farmacia', 'ibuprofeno', 'paracetamol', 'pastilla', 'jarabe'], amenities: ['pharmacy'] },
  { kw: ['juguete', 'lego', 'muñec', 'puzzle', 'juego de mesa', 'peluche'], shops: ['toys'] },
  { kw: ['mueble', 'silla', 'mesa', 'sofá', 'sofa', 'lámpara', 'lampara', 'colchón', 'colchon', 'armario', 'estantería', 'estanteria'], shops: ['furniture', 'houseware', 'interior_decoration', 'bed'] },
  { kw: ['bici', 'bicicleta', 'patinete'], shops: ['bicycle'] },
  { kw: ['balón', 'balon', 'pesa', 'mancuerna', 'raqueta', 'deporte', 'fitness', 'running', 'fútbol', 'futbol'], shops: ['sports'] },
  { kw: ['herramienta', 'taladro', 'tornillo', 'bricolaje', 'pintura', 'clavo', 'martillo'], shops: ['doityourself', 'hardware', 'trade'] },
  { kw: ['leche', 'fruta', 'verdura', 'pan', 'huevo', 'arroz', 'aceite', 'alimentación', 'alimentacion', 'supermercado'], shops: ['supermarket', 'convenience', 'greengrocer', 'bakery'] },
  { kw: ['flor', 'ramo', 'planta'], shops: ['florist', 'garden_centre'] },
  { kw: ['gafa', 'lente'], shops: ['optician'] },
  { kw: ['joya', 'anillo', 'reloj', 'pulsera', 'collar'], shops: ['jewelry', 'watches'] },
  { kw: ['perfume', 'maquillaje', 'cosmétic', 'cosmetic', 'crema'], shops: ['cosmetics', 'chemist', 'perfumery'] },
  { kw: ['mascota', 'perro', 'gato', 'pienso'], shops: ['pet'] },
  { kw: ['café', 'cafe', 'capuchino'], amenities: ['cafe'] },
];

const FALLBACK_SHOPS = ['department_store', 'mall', 'variety_store', 'supermarket', 'convenience'];

function storeFiltersFor(q) {
  const query = ` ${String(q || '').toLowerCase()} `;
  const shops = new Set();
  const amenities = new Set();
  for (const cat of CATEGORIES) {
    if (cat.kw.some((k) => query.includes(k))) {
      (cat.shops || []).forEach((s) => shops.add(s));
      (cat.amenities || []).forEach((a) => amenities.add(a));
    }
  }
  if (shops.size === 0 && amenities.size === 0) FALLBACK_SHOPS.forEach((s) => shops.add(s));
  return { shops: [...shops], amenities: [...amenities], matched: shops.size + amenities.size > 0 };
}

function buildAddress(tags) {
  const street = tags['addr:street'];
  const number = tags['addr:housenumber'];
  const city = tags['addr:city'];
  const parts = [];
  if (street) parts.push(number ? `${street} ${number}` : street);
  if (city) parts.push(city);
  return parts.length ? parts.join(', ') : null;
}

// Tiendas físicas cercanas RELEVANTES al producto, vía Overpass / OpenStreetMap (gratis).
export async function searchOverpass(q, lat, lng) {
  if (lat == null || lng == null) return [];

  const r = config.searchRadius;
  // Centro redondeado a 2 decimales (privacidad + cacheabilidad).
  const clat = Number(lat).toFixed(2);
  const clng = Number(lng).toFixed(2);

  const { shops, amenities } = storeFiltersFor(q);
  const clauses = [];
  if (shops.length) {
    const re = shops.join('|');
    clauses.push(`node(around:${r},${clat},${clng})[shop~"^(${re})$"];`);
    clauses.push(`way(around:${r},${clat},${clng})[shop~"^(${re})$"];`);
  }
  if (amenities.length) {
    const re = amenities.join('|');
    clauses.push(`node(around:${r},${clat},${clng})[amenity~"^(${re})$"];`);
    clauses.push(`way(around:${r},${clat},${clng})[amenity~"^(${re})$"];`);
  }

  const query = `[out:json][timeout:25];
(
${clauses.join('\n')}
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
