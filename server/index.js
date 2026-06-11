import express from 'express';
import cors from 'cors';
import { config, features } from './config.js';
import { searchOnline } from './sources/online.js';
import { searchNearbyStores } from './sources/stores.js';
import { rankItems } from './ranking.js';
import { recommend } from './ai/recommend.js';
import { makeCacheKey, getCache, setCache } from './cache.js';

const app = express();

app.use(cors());
app.use(express.json());

// Estado + fuentes activas.
app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'cercadeti-server',
    serverMode: 'low-resource',
    features,
    endpoints: ['/buscar?q=..&lat=..&lng=..', '/recomendar (POST)', '/config'],
  });
});

// Configuración para la app.
app.get('/config', (req, res) => {
  res.json({
    placesProvider: config.placesProvider, // overpass | google | none
    aiProvider: config.aiProvider, // gemini | claude | none
    cacheEnabled: true,
    onlineSourceEnabled: true,
    serverMode: 'low-resource',
    features, // compat con la app actual
  });
});

// BÚSQUEDA — NO usa IA. Online + tiendas cercanas + ranking barato + caché.
// GET /buscar?q=auriculares&lat=41.38&lng=2.17
app.get('/buscar', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Falta el parámetro de búsqueda "q".' });

  const lat = req.query.lat != null && req.query.lat !== '' ? Number(req.query.lat) : null;
  const lng = req.query.lng != null && req.query.lng !== '' ? Number(req.query.lng) : null;

  // Caché (clave con coords redondeadas a 2 decimales).
  const cacheKey = makeCacheKey({ type: 'buscar', q, lat, lng });
  const cached = getCache(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const [online, places] = await Promise.all([
      searchOnline(q),
      searchNearbyStores(q, lat, lng).catch((e) => {
        console.warn('[stores] error:', e.message);
        return { enabled: false, provider: config.placesProvider, stores: [] };
      }),
    ]);

    // Ranking barato (sin IA) para productos y tiendas.
    const rankedProducts = rankItems(online.products);
    const rankedStores = rankItems(places.stores);

    const payload = {
      query: q,
      count: rankedProducts.items.length,
      results: rankedProducts.items, // con score, badges, reason
      stores: rankedStores.items, // normalizadas + compat (open, location)
      summary: null, // la IA ya NO se ejecuta aquí; usa /recomendar
      bestPickId: rankedProducts.bestId, // calculado por el ranking (sin IA)
      sources: {
        online: online.source, // 'serpapi' | 'catalog'
        places: places.enabled,
        placesProvider: places.provider,
        ai: false,
      },
      cached: false,
    };

    setCache(cacheKey, payload);
    console.log(`[buscar] q="${q}" -> ${payload.count} productos, ${rankedStores.items.length} tiendas (${places.provider})`);
    res.json(payload);
  } catch (e) {
    console.error('[buscar] error:', e);
    res.status(502).json({ error: 'Fallo al buscar productos.', detail: String(e.message) });
  }
});

// RECOMENDAR — IA bajo demanda ("Ayúdame a elegir"). Máx 10 productos.
// POST /recomendar  body: { products: [...] }
app.post('/recomendar', async (req, res) => {
  const products = Array.isArray(req.body?.products) ? req.body.products : [];
  if (products.length === 0) {
    return res.status(400).json({ error: 'Envía "products": [...] (máximo 10).' });
  }
  try {
    const result = await recommend(products);
    res.json(result);
  } catch (e) {
    console.error('[recomendar] error:', e);
    res.status(502).json({
      recommendation: 'No se pudo generar la recomendación ahora mismo.',
      bestProductId: null,
      reason: String(e.message),
      provider: config.aiProvider,
    });
  }
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`✅ CercaDeTi server (low-resource) en http://0.0.0.0:${config.port}`);
  console.log(`   Tiendas:  ${config.placesProvider}${config.placesProvider === 'google' && !config.googlePlacesKey ? ' (sin clave!)' : ''}`);
  console.log(`   IA:       ${config.aiProvider}${features.ai ? '' : ' (no configurada / solo bajo demanda)'}`);
  console.log(`   Online:   ${features.online ? 'SerpAPI' : 'catálogo de ejemplo'}`);
  console.log(`   Caché:    en memoria (TTL 30 min, máx 100)`);
});
