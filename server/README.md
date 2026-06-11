# CercaDeTi — Server

Backend de la app CercaDeTi (Node + Express). Combina tres fuentes, cada una
opcional según las claves que pongas en `.env`:

- **Fase 2 — Online:** búsqueda real de productos vía SerpAPI (Google Shopping).
- **Fase 3 — IA:** Claude analiza los resultados y recomienda.
- **Fase 4 — Tiendas cercanas:** Google Places encuentra tiendas físicas alrededor.

**Sin ninguna clave, el servidor funciona igual** usando un catálogo de ejemplo,
así que la app es 100% funcional desde el primer momento.

## Estructura

```
server/
├── index.js          # servidor Express, endpoint /buscar
├── config.js         # lee .env y decide qué fuentes están activas
├── catalog.js        # catálogo de ejemplo (fallback)
├── sources/
│   ├── online.js     # FASE 2 — SerpAPI (o catálogo)
│   └── places.js     # FASE 4 — Google Places
├── ai/
│   └── claude.js     # FASE 3 — Claude (claude-opus-4-8)
├── .env.example      # plantilla de claves
└── .gitignore
```

## Arrancar (Windows o Ubuntu, es igual)

```bash
cd server
npm install            # solo la primera vez
cp .env.example .env   # crea tu .env (en Windows: copy .env.example .env)
# edita .env y pon las claves que tengas (o ninguna)
npm start              # o: npm run dev  (se reinicia al guardar)
```

Escucha en el puerto **3000** en todas las interfaces (`0.0.0.0`).

## Probar

- http://localhost:3000/            → estado + qué fuentes están activas
- http://localhost:3000/buscar?q=auriculares
- http://localhost:3000/buscar?q=auriculares&lat=41.38&lng=2.17  (con ubicación)

## Conseguir las claves (todas tienen capa gratuita para uso personal)

| Fase | Variable en `.env` | Dónde |
|------|--------------------|-------|
| 2 | `SERPAPI_KEY` | https://serpapi.com (gratis ~100 búsquedas/mes) |
| 3 | `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| 4 | `GOOGLE_PLACES_KEY` | https://console.cloud.google.com → habilita "Places API" |

Añades una clave, reinicias el servidor, y esa fuente se "enciende" sola.
La app no necesita ningún cambio.

## Desplegar en tu Ubuntu Server (cuando lo tengas)

1. Copia la carpeta `server/` al portátil con Ubuntu.
2. Instala Node 18+:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
3. `cd server && npm install`
4. Crea el `.env` con tus claves.
5. `npm start` (o, para que arranque solo y reviva si se cae:
   `sudo npm i -g pm2 && pm2 start index.js --name cercadeti && pm2 save`).
6. En la app: Ajustes (⚙️) → escribe `http://IP_DEL_UBUNTU:3000` → Probar → Guardar.

La IP del Ubuntu la ves con `hostname -I`. Móvil y servidor en la misma WiFi.
