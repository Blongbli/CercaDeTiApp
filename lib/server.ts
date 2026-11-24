import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const STORAGE_KEY = 'cercadeti.serverUrl';
const SERVER_PORT = 3000;

export type Product = {
  id: string;
  name: string;
  price: number;
  store: string;
  type: 'online' | 'cerca';
  category: string;
  link?: string | null;
  thumbnail?: string | null;
  // Campos opcionales: hoy el servidor no los envía en productos, pero la app
  // los usa de forma defensiva (se muestran solo si existen) y quedan listos
  // por si el backend los añade en el futuro.
  distance?: number | null; // metros
  rating?: number | null;
  open?: boolean | null;
  address?: string | null;
  phone?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type Store = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  open: boolean | null;
  location: { lat: number; lng: number } | null;
};

export type SearchResponse = {
  query: string;
  count: number;
  results: Product[];
  stores: Store[];
  summary: string | null;
  bestPickId: string | null;
  sources: { online: string; places: boolean; ai: boolean };
};

// URL autodetectada: la IP del PC donde corre Metro (solo sirve en desarrollo,
// cuando el server está en el mismo PC). Para el servidor Ubunto de casa,
// el usuario fija la URL en Ajustes y esa manda.
export function autoServerUrl(): string {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:${SERVER_PORT}` : `http://localhost:${SERVER_PORT}`;
}

export async function getServerUrl(): Promise<string> {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  return saved && saved.trim() ? saved.trim() : autoServerUrl();
}

export async function setServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, url.trim());
}

export async function clearServerUrl(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

type Coords = { latitude: number; longitude: number } | null;

export async function searchProducts(query: string, coords: Coords, intl = false): Promise<SearchResponse> {
  const base = await getServerUrl();
  const params = new URLSearchParams({ q: query.trim() });
  if (coords) {
    params.set('lat', String(coords.latitude));
    params.set('lng', String(coords.longitude));
  }
  if (intl) params.set('intl', '1');
  const res = await fetch(`${base}/buscar?${params.toString()}`);
  if (!res.ok) throw new Error(`Servidor respondió ${res.status}`);
  return (await res.json()) as SearchResponse;
}

export type Recommendation = {
  recommendation: string;
  bestProductId: string | null;
  reason: string;
  provider: string;
};

// IA bajo demanda ("Ayúdame a elegir"). Envía SOLO lo necesario (nunca la
// ubicación exacta) y devuelve la recomendación del servidor.
export async function recommendProducts(products: Product[]): Promise<Recommendation> {
  const base = await getServerUrl();
  const slim = products.slice(0, 10).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    store: p.store,
    type: p.type,
    distanceMeters: p.distance ?? null,
    rating: p.rating ?? null,
    open: p.open ?? null,
  }));
  const res = await fetch(`${base}/recomendar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ products: slim }),
  });
  if (!res.ok) throw new Error(`Servidor respondió ${res.status}`);
  return (await res.json()) as Recommendation;
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

// Asistente conversacional (IA). Manda el historial + productos visibles y
// devuelve la respuesta del asistente.
export async function sendChat(
  messages: ChatMessage[],
  products?: Product[]
): Promise<{ reply: string; provider: string }> {
  const base = await getServerUrl();
  const res = await fetch(`${base}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, products: products?.slice(0, 10) }),
  });
  if (!res.ok) throw new Error(`Servidor respondió ${res.status}`);
  return (await res.json()) as { reply: string; provider: string };
}

// Comprueba la conexión con el servidor y devuelve qué fuentes tiene activas.
export async function pingServer(url: string): Promise<{ ok: boolean; features?: any }> {
  try {
    const res = await fetch(`${url.trim()}/config`, { method: 'GET' });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, features: data.features };
  } catch {
    return { ok: false };
  }
}
