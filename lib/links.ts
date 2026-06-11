import { Linking } from 'react-native';
import type { Product } from './server';

// Abre el enlace de la oferta externa.
export function openOffer(url?: string | null): void {
  if (url) Linking.openURL(url).catch(() => {});
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

export function openMapsForProduct(p: Product): void {
  openMaps({ lat: p.lat, lng: p.lng, address: p.address, name: `${p.name} ${p.store}` });
}

// Llama por teléfono si hay número.
export function callPhone(phone?: string | null): void {
  if (phone) Linking.openURL(`tel:${phone}`).catch(() => {});
}
