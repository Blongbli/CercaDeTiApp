import 'dotenv/config';

const serpApiKey = process.env.SERPAPI_KEY || '';
const serperKey = process.env.SERPER_KEY || '';
const googlePlacesKey = process.env.GOOGLE_PLACES_KEY || '';
const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
const geminiKey = process.env.GEMINI_API_KEY || '';

// Proveedor de búsqueda online: serper | serpapi | catalog.
// Por defecto se autodetecta según la clave disponible (serper tiene prioridad).
const onlineProviderRaw = (
  process.env.ONLINE_PROVIDER || (serperKey ? 'serper' : serpApiKey ? 'serpapi' : 'catalog')
).toLowerCase();
const onlineProvider = ['serper', 'serpapi', 'catalog'].includes(onlineProviderRaw)
  ? onlineProviderRaw
  : 'catalog';

// Proveedor de tiendas físicas: overpass (gratis) | google | none.
const placesProviderRaw = (process.env.PLACES_PROVIDER || 'overpass').toLowerCase();
const placesProvider = ['overpass', 'google', 'none'].includes(placesProviderRaw)
  ? placesProviderRaw
  : 'overpass';

// Proveedor de IA (solo en /recomendar, nunca automático): gemini | claude | none.
const aiProviderRaw = (
  process.env.AI_PROVIDER || (geminiKey ? 'gemini' : anthropicKey ? 'claude' : 'none')
).toLowerCase();
const aiProvider = ['gemini', 'claude', 'none'].includes(aiProviderRaw) ? aiProviderRaw : 'none';

// Radio de búsqueda de tiendas (metros). Recomendado 1500, máx 3000.
const searchRadius = Math.min(3000, Number(process.env.SEARCH_RADIUS_M || 1500));

// Monetización (opcional): etiqueta de afiliado de Amazon. Vacío = desactivado.
const amazonAffiliateTag = process.env.AMAZON_AFFILIATE_TAG || '';

export const config = {
  port: process.env.PORT || 3000,
  serpApiKey,
  serperKey,
  onlineProvider,
  googlePlacesKey,
  anthropicKey,
  geminiKey,
  country: process.env.SEARCH_COUNTRY || 'es',
  language: process.env.SEARCH_LANGUAGE || 'es',
  searchRadius,
  placesProvider,
  aiProvider,
  amazonAffiliateTag,
};

// Qué fuentes están realmente operativas.
export const features = {
  online: !!serperKey || !!serpApiKey, // FASE 2 — sin clave usa el catálogo de ejemplo
  places:
    placesProvider === 'overpass' ||
    (placesProvider === 'google' && !!googlePlacesKey),
  ai:
    (aiProvider === 'gemini' && !!geminiKey) ||
    (aiProvider === 'claude' && !!anthropicKey),
};
