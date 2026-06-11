import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from './server';
import { productKey } from './product';

const HISTORY_KEY = 'cercadeti.history';
const FAVORITES_KEY = 'cercadeti.favorites';
const MAX_HISTORY = 10;

// ---------- Historial de búsquedas (máx. 10, sin duplicados, recientes primero) ----------

export async function getHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function addHistory(term: string): Promise<string[]> {
  const t = term.trim();
  if (!t) return getHistory();
  const current = await getHistory();
  const next = [t, ...current.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX_HISTORY);
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch {}
}

// ---------- Favoritos (local, sin servidor) ----------

export type Favorite = { key: string; product: Product; savedAt: number };

export async function getFavorites(): Promise<Favorite[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as Favorite[]) : [];
  } catch {
    return [];
  }
}

export async function getFavoriteKeys(): Promise<Set<string>> {
  const favs = await getFavorites();
  return new Set(favs.map((f) => f.key));
}

// Añade o quita un favorito. Devuelve la lista nueva y si quedó añadido.
export async function toggleFavorite(product: Product): Promise<{ favorites: Favorite[]; added: boolean }> {
  const key = productKey(product);
  const current = await getFavorites();
  const exists = current.some((f) => f.key === key);
  let next: Favorite[];
  let added: boolean;
  if (exists) {
    next = current.filter((f) => f.key !== key);
    added = false;
  } else {
    next = [{ key, product, savedAt: Date.now() }, ...current];
    added = true;
  }
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  } catch {}
  return { favorites: next, added };
}
