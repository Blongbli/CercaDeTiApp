import { config } from '../config.js';
import { haversine } from '../util.js';

// FASE 4 — Tiendas físicas cercanas vía Google Places (Text Search). OPCIONAL.
// Solo se usa si PLACES_PROVIDER=google y hay GOOGLE_PLACES_KEY.
// Devuelve el formato normalizado (igual que Overpass) + campos compat para la app.
export async function searchGooglePlaces(q, lat, lng) {
  if (!config.googlePlacesKey || lat == null || lng == null) return [];

  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', `${q} tienda`);
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', String(config.searchRadius));
  url.searchParams.set('language', config.language);
  url.searchParams.set('key', config.googlePlacesKey);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Places respondió ${res.status}`);
  const data = await res.json();

  return (data.results || []).slice(0, 12).map((r) => {
    const elat = r.geometry?.location?.lat ?? null;
    const elng = r.geometry?.location?.lng ?? null;
    const distanceMeters = elat != null && elng != null ? haversine(Number(lat), Number(lng), elat, elng) : null;
    const isOpen = r.opening_hours?.open_now ?? null;
    return {
      id: r.place_id,
      name: r.name,
      type: 'nearby',
      source: 'google',
      category: r.types?.[0] || null,
      lat: elat,
      lng: elng,
      address: r.formatted_address || r.vicinity || null,
      distanceMeters,
      rating: r.rating ?? null,
      isOpen,
      phone: null, // Text Search no devuelve teléfono sin una llamada extra de detalles
      url: null,
      // compat con la app actual:
      open: isOpen,
      location: elat != null && elng != null ? { lat: elat, lng: elng } : null,
    };
  });
}
