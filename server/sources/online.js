import { config, features } from '../config.js';
import { CATALOG } from '../catalog.js';

// Búsqueda en el catálogo local (fallback sin clave de API).
function searchCatalog(q) {
  const query = q.toLowerCase();
  return CATALOG.filter(
    (item) =>
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
  );
}

// FASE 2 — Búsqueda real de productos online vía SerpAPI (Google Shopping).
// Si no hay SERPAPI_KEY, devuelve el catálogo local filtrado.
export async function searchOnline(q) {
  if (!features.online) {
    return { source: 'catalog', products: searchCatalog(q) };
  }

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
    .slice(0, 24)
    .map((r, idx) => ({
      id: `serp-${r.product_id || idx}`,
      name: r.title,
      price: typeof r.extracted_price === 'number' ? r.extracted_price : 0,
      store: r.source || 'Tienda online',
      type: 'online',
      category: q.toLowerCase(),
      link: r.link || r.product_link || null,
      thumbnail: r.thumbnail || null,
    }))
    .filter((p) => p.name);

  return { source: 'serpapi', products };
}
