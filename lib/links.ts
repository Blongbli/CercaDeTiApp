import { Linking } from 'react-native';
import type { Product } from './server';

// Quita el sufijo de distancia que añade el servidor al nombre de la tienda
// (ej. "MediaMarkt (a 450m)" -> "MediaMarkt") para poder buscarla en Maps.
export function cleanStoreName(store?: string | null): string {
  return (store ?? '').replace(/\s*\(a\s+[\d.,]+\s*(km|m)\)\s*$/i, '').trim();
}

// Abre el enlace de la oferta externa.
export function openOffer(url?: string | null): void {
  if (url) Linking.openURL(url).catch(() => {});
}

// COMPRAR (producto online): abre el enlace de la tienda si existe; si no,
// hace una búsqueda en Google para encontrar dónde comprarlo.
export function openBuy(p: Product): void {
  if (p.link) {
    Linking.openURL(p.link).catch(() => {});
    return;
  }
  const q = encodeURIComponent([p.name, cleanStoreName(p.store), 'comprar'].filter(Boolean).join(' '));
  Linking.openURL(`https://www.google.com/search?q=${q}`).catch(() => {});
}

// Abre Google Maps: por coordenadas si existen; si no, por nombre + dirección.
export function openMaps(opts: {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  name?: string | null;
  placeId?: string | null;
}): void {
  let url: string | null = null;
  if (opts.lat != null && opts.lng != null) {
    url = `https://www.google.com/maps/search/?api=1&query=${opts.lat},${opts.lng}`;
  } else {
    const q = encodeURIComponent([opts.name, opts.address].filter(Boolean).join(' '));
    if (!q) return;
    url = `https://www.google.com/maps/search/?api=1&query=${q}${
      opts.placeId ? `&query_place_id=${opts.placeId}` : ''
    }`;
  }
  Linking.openURL(url).catch(() => {});
}

// UBICACIÓN (producto cercano): abre Google Maps por coordenadas si las hay;
// si no, busca la tienda por su nombre (sin el "(a 450m)") y dirección.
export function openMapsForProduct(p: Product): void {
  const store = cleanStoreName(p.store);
  openMaps({ lat: p.lat, lng: p.lng, address: p.address, name: store || p.name });
}

// Llama por teléfono si hay número.
export function callPhone(phone?: string | null): void {
  if (phone) Linking.openURL(`tel:${phone}`).catch(() => {});
}
