============================================================
  CERCADETI — GUÍA COMPLETA (app + servidor)
  Última actualización: 2026-06-11
============================================================

QUÉ ES
------------------------------------------------------------
App móvil (Expo / React Native) para buscar productos, con un
servidor propio (Node + Express) que decide de dónde salen los
datos. La app habla SOLO con tu servidor; el servidor combina
varias fuentes, cada una OPCIONAL según las claves que pongas.

Sin ninguna clave, todo funciona igual:
- Productos -> catálogo de ejemplo.
- Tiendas cercanas -> OpenStreetMap / Overpass (GRATIS, sin clave).
- IA -> desactivada (no obligatoria).


============================================================
  ESTRUCTURA DEL PROYECTO
============================================================

CercaDeTiApp/
├── app/                      (pantallas de la app - Expo Router)
│   ├── index.tsx             pantalla principal (buscador)
│   ├── settings.tsx          ajustes (URL del servidor)
│   ├── favorites.tsx         vista de favoritos
│   └── _layout.tsx           navegación
├── components/
│   ├── product-card.tsx      tarjeta de producto reutilizable
│   └── product-detail-modal.tsx  modal de detalle
├── lib/                      (lógica de la app)
│   ├── server.ts             llamadas al servidor + URL configurable
│   ├── storage.ts            historial + favoritos (AsyncStorage)
│   ├── product.ts            clave estable, distancia, etiquetas
│   └── links.ts              abrir oferta / mapas / llamar
├── server/                   (BACKEND - Node/Express)
│   ├── index.js              endpoints /, /config, /buscar, /recomendar
│   ├── config.js             lee .env y decide qué fuentes hay
│   ├── cache.js              caché en memoria (TTL 30 min, máx 100)
│   ├── ranking.js            score 0-100 + badges + reason (SIN IA)
│   ├── util.js               distancia (haversine) y parseo
│   ├── catalog.js            catálogo de ejemplo (fallback)
│   ├── sources/
│   │   ├── online.js         búsqueda online (SerpAPI) o catálogo
│   │   ├── overpass.js       tiendas vía OpenStreetMap (gratis)
│   │   ├── places.js         tiendas vía Google Places (opcional)
│   │   └── stores.js         elige proveedor según PLACES_PROVIDER
│   ├── ai/
│   │   ├── recommend.js      elige IA según AI_PROVIDER
│   │   ├── gemini.js         Gemini (REST, gratis)
│   │   └── claude.js         Claude
│   ├── .env.example          plantilla de claves
│   └── README.md             notas del servidor
├── ROADMAP.md                plan por fases
└── readmecercadeti.txt       (este archivo)


============================================================
  FUNCIONES DE LA APP (frontend)
============================================================

BÚSQUEDA Y UBICACIÓN
- Pide permiso de ubicación y la muestra.
- Buscas un producto; se envía la búsqueda + ubicación al servidor.
- Aviso claro si no conecta con el servidor.

HISTORIAL LOCAL (en el móvil, AsyncStorage)
- Guarda las últimas 10 búsquedas, sin duplicados, recientes primero.
- Chips "Recientes" bajo el buscador; tocas y repite. Botón "Limpiar".

FAVORITOS LOCALES (en el móvil)
- Corazón en cada tarjeta para guardar/quitar.
- Vista de favoritos (icono ❤️ arriba).
- Clave estable: nombre + tienda + precio + url.

BOTONES RÁPIDOS DE INTENCIÓN
- "⚡ Lo necesito hoy"  -> cerca, prioriza abiertos y menor distancia.
- "💰 Quiero ahorrar"   -> precio más bajo.
- "📍 Cerca de mí"      -> solo cercanos.
- "🌐 Online"           -> solo online.

FILTROS Y ORDEN
- Tipo: Todos / Online / Cerca de ti.
- Precio: Todos / <50 / 50-150 / +150.
- Orden por precio asc/desc.
- Contador de resultados + pull-to-refresh + estado vacío.

TARJETAS DE PRODUCTO
- Nombre, precio (o "Precio no disponible"), tienda.
- Distancia (se deduce del texto si no viene como dato).
- Valoración y abierto/cerrado (si existen).
- Etiquetas: Mejor opción / Más barato / Más cercano / Online / Cerca de ti.
- Botón favorito, "Ver oferta" (si hay url), "Cómo llegar" (si hay sitio).

DETALLE (modal)
- Todos los datos disponibles + aviso "la disponibilidad en tienda
  puede no estar confirmada" para productos cercanos.
- Botones Ver oferta / Cómo llegar / Llamar (si hay teléfono).

AJUSTES (⚙️)
- Fijar la URL del servidor (tu Ubuntu).
- "Probar conexión": dice si conecta y qué fuentes están activas.
- Guardar (se recuerda) o usar detección automática.


============================================================
  EL SERVIDOR (backend) - ENDPOINTS
============================================================

GET /
   Estado + fuentes activas.

GET /config
   { placesProvider, aiProvider, cacheEnabled,
     onlineSourceEnabled, serverMode, features }

GET /buscar?q=...&lat=..&lng=..
   - NO usa IA (es barato y rápido).
   - Busca productos online (o catálogo) + tiendas cercanas.
   - Aplica RANKING propio (score 0-100, badges, reason).
   - Usa CACHÉ en memoria (TTL 30 min).
   - Devuelve: { query, count, results[], stores[], summary:null,
                 bestPickId, sources, cached }

POST /recomendar     body: { "products": [ ...máx 10... ] }
   - IA SOLO bajo demanda (para un futuro botón "Ayúdame a elegir").
   - Envía solo lo necesario (nombre, precio, tienda, tipo,
     distancia, rating, abierto). NUNCA ubicación exacta.
   - Devuelve: { recommendation, bestProductId, reason, provider }
   - Sin clave de IA -> "La recomendación con IA no está configurada."

RANKING (sin IA): precio 40 + cercanía 30 + abierto 15 + valoración 15.
   Funciona aunque falten datos (no penaliza de más, no rompe).

CACHÉ: solo un Map en memoria. TTL 30 min, máx 100 entradas, se borra
   sola lo más antiguo. Clave con coords redondeadas a 2 decimales
   (privacidad). Se pierde al reiniciar (es lo normal).


============================================================
  CONFIGURACIÓN (.env del servidor)
============================================================

Copia server/.env.example a server/.env y rellena solo lo que quieras.

PORT=3000

# --- Tiendas físicas ---
PLACES_PROVIDER=overpass     # overpass (gratis) | google | none
GOOGLE_PLACES_KEY=           # solo si usas google
SEARCH_RADIUS_M=1500         # metros (máx 3000)

# --- Búsqueda online ---
SERPAPI_KEY=                 # gratis ~100/mes; sin clave usa catálogo

# --- IA (solo en /recomendar, nunca automática) ---
AI_PROVIDER=none             # gemini | claude | none
GEMINI_API_KEY=              # https://aistudio.google.com/app/apikey
ANTHROPIC_API_KEY=           # https://console.anthropic.com

SEARCH_COUNTRY=es
SEARCH_LANGUAGE=es

DÓNDE CONSEGUIR LAS CLAVES (todas con capa gratuita):
- SerpAPI:        https://serpapi.com
- Gemini:         https://aistudio.google.com/app/apikey
- Claude:         https://console.anthropic.com
- Google Places:  https://console.cloud.google.com (habilitar "Places API")
- Overpass:       NO necesita clave (es OpenStreetMap, gratis)


============================================================
  CÓMO ARRANCAR (en tu PC ahora mismo)
============================================================

SERVIDOR (en una terminal):
   cd C:\Users\IndianWebs\CercaDeTiApp\server
   npm install          (solo la primera vez)
   npm start            (o: npm run dev)

APP (en otra terminal):
   cd C:\Users\IndianWebs\CercaDeTiApp
   npx expo start
   - En casa (red propia): modo normal, escanea el QR.
   - En coworking (WiFi con aislamiento): usa  npx expo start --tunnel

CONECTAR LA APP AL SERVIDOR:
   En la app -> Ajustes (⚙️) -> escribe la URL del servidor:
       http://IP_DEL_PC:3000        (tu PC ahora)
   -> Probar conexión -> Guardar.
   (La IP de tu PC actual es 192.168.1.66; en Ubuntu cambiará.)


============================================================
  DESPLEGAR EL SERVIDOR EN TU UBUNTU (cuando lo tengas)
============================================================

1) Copia la carpeta  server/  al portátil Ubuntu.

2) Instala Node 18+:
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt install -y nodejs

3) Instala dependencias y crea el .env:
   cd server
   npm install
   cp .env.example .env      (edita .env con tus claves o déjalo vacío)

4) Arranca:
   npm start
   # Para que arranque solo y reviva si se cae:
   sudo npm i -g pm2
   pm2 start index.js --name cercadeti
   pm2 save
   pm2 startup     (sigue las instrucciones que imprima)

5) Mira la IP del Ubuntu:
   hostname -I       (ej. 192.168.1.50)

6) En la app -> Ajustes (⚙️) -> http://192.168.1.50:3000 -> Probar -> Guardar.
   (El móvil y el Ubuntu deben estar en la misma WiFi.)

NOTA RAM (4 GB): el servidor es muy ligero (Express + fetch).
   No usa IA local, ni base de datos, ni Redis, ni guarda imágenes.
   La IA es externa (Gemini/Claude por internet) y solo bajo demanda.


============================================================
  LO QUE TIENES QUE HACER (checklist)
============================================================

[ ] 1. (Opcional ahora) Probar en tu PC:
       - Arranca server (npm start) y app (npx expo start).
       - En Ajustes pon http://192.168.1.66:3000 y prueba.

[ ] 2. Montar el portátil con Ubuntu Server.

[ ] 3. Copiar la carpeta server/ al Ubuntu y seguir los pasos de
       despliegue de arriba (npm install, .env, pm2).

[ ] 4. En la app, poner en Ajustes la IP del Ubuntu (http://IP:3000).

[ ] 5. (Opcional) Crear claves gratuitas y ponerlas en server/.env
       para encender:
         - SERPAPI_KEY      -> búsqueda online real
         - PLACES_PROVIDER=google + GOOGLE_PLACES_KEY (o deja overpass)
         - AI_PROVIDER=gemini + GEMINI_API_KEY (o claude) para /recomendar
       Reinicia el servidor tras cambiar el .env.


============================================================
  PENDIENTE / PRÓXIMOS PASOS (no hecho aún)
============================================================

- BOTÓN "AYÚDAME A ELEGIR" EN LA APP:
  El servidor ya tiene /recomendar (IA bajo demanda), pero la APP
  todavía NO tiene el botón que lo llama. Es la siguiente tarea de
  frontend: añadir un botón que mande los productos visibles a
  POST /recomendar y muestre la recomendación.

- IMPORTANTE: como /buscar ya NO ejecuta IA, el banner
  "✨ Recomendación" de la app ya no se rellena solo (summary = null).
  La etiqueta "Mejor opción" SÍ sigue funcionando, porque ahora la
  calcula el ranking del servidor (bestPickId), sin IA.

- Fase 4 (tiendas con stock real): saber qué producto hay DENTRO de
  cada tienda física sigue sin ser posible de forma general (ese dato
  casi no existe público). Overpass solo da la tienda, no su inventario.


============================================================
  RESUMEN RÁPIDO
============================================================
- App lista y funcional (historial, favoritos, intención, filtros, detalle).
- Servidor ligero: /buscar (sin IA, con caché y ranking) + /recomendar (IA bajo demanda).
- Tiendas cercanas GRATIS con Overpass por defecto.
- Todo opcional por claves; sin claves funciona con catálogo + Overpass.
- Te queda: montar Ubuntu, desplegar server/, y poner la IP en Ajustes.
============================================================
