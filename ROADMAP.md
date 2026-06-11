# 🗺️ Roadmap CercaDeTi

## 📍 Estado actual
App (Expo) + servidor propio (Node/Express en `server/`). La app pide los datos
al servidor; el servidor decide de dónde salen. **Todo el código de las Fases 2-4
está construido** y se activa poniendo cada clave en `server/.env`. Sin claves,
funciona con un catálogo de ejemplo.

### Cómo conectar la app al servidor
En la app: **Ajustes (⚙️)** → escribe `http://IP_DEL_SERVIDOR:3000` → Probar → Guardar.

---

## 🟢 FASE 1 — Mejoras de la app — ✅ HECHO
1. Más productos + búsqueda por texto. ✅
2. Filtros de precio (rangos) + orden asc/desc. ✅
3. UX: contador de resultados, pull-to-refresh, estado vacío. ✅

## 🟡 FASE 2 — Datos reales online — ✅ CONSTRUIDO (activar con clave)
- `server/sources/online.js`: SerpAPI (Google Shopping). Pon `SERPAPI_KEY` en `.env`.
- Sin clave → catálogo de ejemplo. La app muestra enlace a la oferta cuando existe.

## 🟠 FASE 3 — IA (Claude) — ✅ CONSTRUIDO (activar con clave)
- `server/ai/claude.js`: modelo `claude-opus-4-8`. Pon `ANTHROPIC_API_KEY` en `.env`.
- Analiza los resultados, recomienda la mejor opción calidad-precio y resume.
- La app muestra el banner "✨ Recomendación" y marca la "Mejor opción".

## 🔴 FASE 4 — Tiendas físicas cercanas — ✅ PARCIAL (activar con clave)
- `server/sources/places.js`: Google Places. Pon `GOOGLE_PLACES_KEY` en `.env`.
- Encuentra tiendas alrededor de tu ubicación (la app las lista y abre en Maps).
- ⚠️ **Límite real:** Places dice DÓNDE hay tiendas, no qué producto/precio tienen
  dentro. Ese inventario en tiempo real casi no existe públicamente. El siguiente
  paso realista sería integrar el stock de cadenas grandes que sí lo publican.

## 🎨 FASE 5 — Estética — ✅ HECHO (primera pasada)
- Rediseño: marca, paleta azul/verde, tarjetas con sombra, banner IA, pills de tipo,
  sección de tiendas, botón de ajustes. Mejorable con icono/splash y modo oscuro.

---

## Lo único que queda por hacer (tú)
1. Montar el Ubuntu Server y copiar la carpeta `server/` (ver `server/README.md`).
2. (Opcional) Crear las claves gratuitas y ponerlas en `server/.env` para encender
   búsqueda online real, IA y tiendas cercanas.
3. En la app, fijar la IP del servidor en Ajustes.

| Fase | Estado | Para activar del todo |
|------|--------|------------------------|
| 1 | ✅ Hecho | — |
| 2 | ✅ Código listo | `SERPAPI_KEY` |
| 3 | ✅ Código listo | `ANTHROPIC_API_KEY` |
| 4 | ✅ Código listo (con límite) | `GOOGLE_PLACES_KEY` + ubicación |
| 5 | ✅ Primera pasada | — |
