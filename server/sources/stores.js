import { config } from '../config.js';
import { searchOverpass } from './overpass.js';
import { searchGooglePlaces } from './places.js';

// Dispatcher de tiendas físicas según PLACES_PROVIDER: overpass | google | none.
export async function searchNearbyStores(q, lat, lng) {
  if (config.placesProvider === 'none' || lat == null || lng == null) {
    return { enabled: false, provider: config.placesProvider, stores: [] };
  }

  if (config.placesProvider === 'google') {
    if (!config.googlePlacesKey) return { enabled: false, provider: 'google', stores: [] };
    const stores = await searchGooglePlaces(q, lat, lng);
    return { enabled: true, provider: 'google', stores };
  }

  // Por defecto: Overpass (gratis).
  const stores = await searchOverpass(q, lat, lng);
  return { enabled: true, provider: 'overpass', stores };
}
