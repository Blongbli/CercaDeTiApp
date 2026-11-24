import { config } from '../config.js';
import { CATALOG } from '../catalog.js';
import { withAffiliate } from '../affiliate.js';

// Cambio aproximado a euros para poder comparar ofertas del extranjero con las
// de España. Es ORIENTATIVO (no incluye envío ni aduanas), solo para ordenar.
const FX_TO_EUR = { us: 0.92 };

// Convierte un precio en texto ("23,99 €", "1.299,00 €", "$45.00") a número.
// Maneja el formato europeo (punto de miles, coma decimal) y el anglosajón.
function parsePrice(input) {
  if (typeof input === 'number') return input;
  if (!input) return 0;
  let s = String(input).replace(/[^\d.,]/g, '');
  if (s.includes('.') && s.includes(',')) {
    // Ambos presentes: el último separador es el decimal.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Búsqueda en el catálogo local (fallback sin clave de API).
// A los productos "online" sin enlace se les añade una búsqueda de Google Shopping,
// para que el botón "Ver oferta" de la app sea probable con datos de ejemplo.
function searchCatalog(q) {
  const query = q.toLowerCase();
  return CATALOG.filter(
    (item) =>
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
  ).map((item) => ({
    ...item,
    link:
      item.link ||
      (item.type === 'online'
        ? `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item.name)}`
        : null),
  }));
}

// Consulta a Serper (Google Shopping) para un país/idioma dados. Devuelve un
// array de productos normalizados. `foreign` marca ofertas del extranjero (se
// convierten a € con `fx` y se etiqueta la tienda con 🌍).
async function serperShopping(q, opts = {}) {
  const gl = opts.gl || config.country;
  const hl = opts.hl || config.language;
  const fx = opts.fx || 1;
  const foreign = !!opts.foreign;

  const res = await fetch('https://google.serper.dev/shopping', {
    method: 'POST',
    headers: { 'X-API-KEY': config.serperKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q, gl, hl }),
  });
  if (!res.ok) throw new Error(`Serper respondió ${res.status}`);
  const data = await res.json();

  return (data.shopping || [])
    .slice(0, 20)
    .map((r, idx) => ({
      id: `serper-${foreign ? 'x-' : ''}${r.productId || idx}`,
      name: r.title,
      price: Math.round(parsePrice(r.price) * fx * 100) / 100,
      store: foreign ? `🌍 ${r.source || 'Tienda extranjera'}` : r.source || 'Tienda online',
      type: 'online',
      category: q.toLowerCase(),
      link: withAffiliate(r.link || null),
      thumbnail: r.imageUrl || null,
      rating: typeof r.rating === 'number' ? r.rating : null,
      foreign,
    }))
    .filter((p) => p.name);
}

// Búsqueda real vía SerpAPI (Google Shopping). Alternativa a Serper.
async function searchWithSerpApi(q) {
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google_shopping');
  url.searchParams.set('q', q);
  url.searchParams.set('gl', config.country);
  url.searchParams.set('hl', config.language);
  url.searchParams.set('api_key', config.serpApiKey);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`SerpAPI respondió ${res.status}`);
  const data = await res.json();

  const products = (data.shopping_results || [])
    .slice(0, 20)
    .map((r, idx) => ({
      id: `serp-${r.product_id || idx}`,
      name: r.title,
      price: typeof r.extracted_price === 'number' ? r.extracted_price : parsePrice(r.price),
      store: r.source || 'Tienda online',
      type: 'online',
      category: q.toLowerCase(),
      link: withAffiliate(r.link || r.product_link || null),
      thumbnail: r.thumbnail || null,
      rating: typeof r.rating === 'number' ? r.rating : null,
    }))
    .filter((p) => p.name);

  return { source: 'serpapi', products };
}

// Quita duplicados por nombre+tienda (para mezclar España + extranjero sin repetir).
function dedupe(list) {
  const seen = new Set();
  return list.filter((p) => {
    const key = `${(p.name || '').toLowerCase()}|${(p.store || '').toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Reintenta la búsqueda de Serper si viene vacía. Google Shopping es algo
// intermitente y a veces devuelve 0 en un intento y resultados en el siguiente.
async function serperShoppingRetry(q, opts, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    const items = await serperShopping(q, opts);
    if (items.length) return items;
    if (i < retries) await new Promise((r) => setTimeout(r, 250));
  }
  return [];
}

// FASE 2 — Búsqueda real de productos online.
// - Reintenta si viene vacía (intermitencia de Google Shopping).
// - Si España no da resultados (o si el usuario activa "extranjero"), busca
//   también en EEUU y convierte a € (cubre inglés y palabras poco comunes).
// - Si todo falla, cae al catálogo local (degradado elegante).
export async function searchOnline(q, opts = {}) {
  const intl = !!opts.intl;
  const useSerper = config.serperKey && config.onlineProvider !== 'serpapi';
  const useSerpApi = config.serpApiKey && config.onlineProvider !== 'serper';

  try {
    if (useSerper) {
      const local = await serperShoppingRetry(q, {}, 1);
      const needForeign = intl || local.length === 0;
      if (!needForeign) return { source: 'serper', products: local };

      const foreign = await serperShopping(q, { gl: 'us', hl: 'en', foreign: true, fx: FX_TO_EUR.us }).catch((e) => {
        console.warn('[online] búsqueda internacional falló:', e.message);
        return [];
      });
      const products = dedupe([...local, ...foreign]).slice(0, 30);
      const source = local.length === 0 && foreign.length ? 'serper-fallback-us' : intl ? 'serper+intl' : 'serper';
      return { source, products };
    }
    if (useSerpApi) return await searchWithSerpApi(q);
  } catch (e) {
    console.warn('[online] fuente real falló, uso catálogo:', e.message);
    return { source: 'catalog', products: searchCatalog(q) };
  }

  return { source: 'catalog', products: searchCatalog(q) };
}
