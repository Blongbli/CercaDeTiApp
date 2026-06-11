import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { searchProducts, getServerUrl, type Product, type Store } from '../lib/server';
import { getHistory, addHistory, clearHistory, getFavoriteKeys, toggleFavorite } from '../lib/storage';
import { tagContextFor, computeTags, distanceMeters, productKey } from '../lib/product';
import { openMaps } from '../lib/links';
import ProductCard from '../components/product-card';
import ProductDetailModal from '../components/product-detail-modal';

type TypeFilter = 'todos' | 'online' | 'cerca';
type PriceRange = 'all' | 'low' | 'mid' | 'high';
type SortOrder = 'asc' | 'desc';
type Intent = 'today' | 'ahorrar' | 'cerca' | 'online' | null;

const PRICE_RANGES: { key: PriceRange; label: string; test: (p: number) => boolean }[] = [
  { key: 'all', label: 'Todos', test: () => true },
  { key: 'low', label: '< 50 €', test: (p) => p < 50 },
  { key: 'mid', label: '50–150 €', test: (p) => p >= 50 && p <= 150 },
  { key: 'high', label: '+150 €', test: (p) => p > 150 },
];

const INTENTS: { key: Exclude<Intent, null>; label: string }[] = [
  { key: 'today', label: '⚡ Lo necesito hoy' },
  { key: 'ahorrar', label: '💰 Quiero ahorrar' },
  { key: 'cerca', label: '📍 Cerca de mí' },
  { key: 'online', label: '🌐 Online' },
];

function sortDistanceOpen(list: Product[]): Product[] {
  return [...list].sort((a, b) => {
    const oa = a.open === true ? 0 : a.open === false ? 1 : 0.5;
    const ob = b.open === true ? 0 : b.open === false ? 1 : 0.5;
    if (oa !== ob) return oa - ob;
    return (distanceMeters(a) ?? Infinity) - (distanceMeters(b) ?? Infinity);
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [bestPickId, setBestPickId] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [filter, setFilter] = useState<TypeFilter>('todos');
  const [priceRange, setPriceRange] = useState<PriceRange>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [intent, setIntent] = useState<Intent>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [favKeys, setFavKeys] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<Product | null>(null);

  useEffect(() => {
    (async () => {
      setHistory(await getHistory());
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos tu ubicación para buscar tiendas cercanas.');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  // Recargar favoritos cada vez que la pantalla recupera el foco (p.ej. tras la vista de favoritos).
  useFocusEffect(
    useCallback(() => {
      getFavoriteKeys().then(setFavKeys);
    }, [])
  );

  const runSearch = async (term: string) => {
    if (!term.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchProducts(term, location);
      setResults(data.results);
      setStores(data.stores || []);
      setSummary(data.summary);
      setBestPickId(data.bestPickId);
      setHistory(await addHistory(term));
    } catch (e) {
      setResults([]);
      setStores([]);
      setSummary(null);
      const base = await getServerUrl();
      Alert.alert(
        'No se pudo conectar',
        `No llegamos al servidor (${base}).\n\nComprueba que está encendido y que la URL en Ajustes (⚙️) es correcta.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => runSearch(searchQuery);

  const handleRecent = (term: string) => {
    setSearchQuery(term);
    runSearch(term);
  };

  const handleRefresh = async () => {
    if (!searchQuery.trim()) return;
    setRefreshing(true);
    try {
      const data = await searchProducts(searchQuery, location);
      setResults(data.results);
      setStores(data.stores || []);
      setSummary(data.summary);
      setBestPickId(data.bestPickId);
    } catch {
      // silencioso
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearHistory = async () => {
    await clearHistory();
    setHistory([]);
  };

  const handleToggleFav = async (p: Product) => {
    const { favorites } = await toggleFavorite(p);
    setFavKeys(new Set(favorites.map((f) => f.key)));
  };

  const applyIntent = (i: Exclude<Intent, null>) => {
    if (intent === i) {
      // segundo toque: desactivar
      setIntent(null);
      setFilter('todos');
      return;
    }
    setIntent(i);
    if (i === 'today') setFilter('cerca');
    else if (i === 'ahorrar') {
      setFilter('todos');
      setSortOrder('asc');
    } else if (i === 'cerca') setFilter('cerca');
    else if (i === 'online') setFilter('online');
  };

  const toggleSort = () => {
    setSortOrder((s) => (s === 'asc' ? 'desc' : 'asc'));
    setIntent((prev) => (prev === 'today' || prev === 'cerca' ? null : prev));
  };

  const baseFiltered = results
    .filter((item) => filter === 'todos' || item.type === filter)
    .filter((item) => PRICE_RANGES.find((r) => r.key === priceRange)!.test(item.price));
  const useDistanceSort = intent === 'today' || intent === 'cerca';
  const filteredResults = useDistanceSort
    ? sortDistanceOpen(baseFiltered)
    : [...baseFiltered].sort((a, b) => (sortOrder === 'asc' ? a.price - b.price : b.price - a.price));

  const ctx = tagContextFor(filteredResults, bestPickId);

  const Header = (
    <View>
      {summary && (
        <View style={styles.aiBanner}>
          <Text style={styles.aiBadge}>✨ Recomendación</Text>
          <Text style={styles.aiText}>{summary}</Text>
        </View>
      )}

      {stores.length > 0 && (
        <View style={styles.storesBox}>
          <Text style={styles.sectionTitle}>🏬 Tiendas cercanas</Text>
          {stores.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.storeRow}
              onPress={() =>
                openMaps({ lat: s.location?.lat, lng: s.location?.lng, name: s.name, address: s.address, placeId: s.id })
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{s.name}</Text>
                <Text style={styles.storeAddr} numberOfLines={1}>
                  {s.address}
                </Text>
              </View>
              <View style={styles.storeMeta}>
                {s.rating != null && <Text style={styles.storeRating}>⭐ {s.rating}</Text>}
                {s.open != null && (
                  <Text style={[styles.storeOpen, { color: s.open ? '#16a34a' : '#dc2626' }]}>
                    {s.open ? 'Abierto' : 'Cerrado'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {searched && !loading && (
        <Text style={styles.resultCount}>
          {filteredResults.length} {filteredResults.length === 1 ? 'resultado' : 'resultados'}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>CercaDeTi</Text>
          <Text style={styles.locationText}>
            {location
              ? `📍 ${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`
              : '📡 Buscando tu ubicación...'}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/favorites')}>
          <Text style={styles.iconText}>❤️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/settings')}>
          <Text style={styles.iconText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="¿Qué producto buscas? (ej. auriculares, ratón…)"
        placeholderTextColor="#94a3b8"
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmitEditing={handleSearch}
        returnKeyType="search"
      />

      {/* Botones rápidos de intención */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.intentRow} contentContainerStyle={{ paddingRight: 8 }}>
        {INTENTS.map((it) => (
          <TouchableOpacity
            key={it.key}
            style={[styles.intentBtn, intent === it.key && styles.intentBtnActive]}
            onPress={() => applyIntent(it.key)}
          >
            <Text style={[styles.intentText, intent === it.key && styles.intentTextActive]}>{it.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Búsquedas recientes */}
      {history.length > 0 && (
        <View style={styles.recentWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={styles.recentLabel}>Recientes:</Text>
            {history.map((h) => (
              <TouchableOpacity key={h} style={styles.recentChip} onPress={() => handleRecent(h)}>
                <Text style={styles.recentChipText}>{h}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={handleClearHistory} style={styles.recentClear}>
              <Text style={styles.recentClearText}>Limpiar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Filtro por tipo */}
      <View style={styles.filterContainer}>
        {(['todos', 'online', 'cerca'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.filterBtn, filter === type && styles.filterBtnActive]}
            onPress={() => {
              setFilter(type);
              setIntent(null);
            }}
          >
            <Text style={[styles.filterText, filter === type && styles.filterTextActive]}>
              {type === 'todos' ? 'Todos' : type === 'online' ? 'Online' : 'Cerca de ti'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filtro por precio + orden */}
      <View style={styles.priceRow}>
        {PRICE_RANGES.map((range) => (
          <TouchableOpacity
            key={range.key}
            style={[styles.priceBtn, priceRange === range.key && styles.priceBtnActive]}
            onPress={() => setPriceRange(range.key)}
          >
            <Text style={[styles.priceText, priceRange === range.key && styles.priceTextActive]}>{range.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.sortBtn} onPress={toggleSort}>
          <Text style={styles.sortText}>{sortOrder === 'asc' ? '€ ↑' : '€ ↓'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredResults}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={Header}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#2563eb']} tintColor="#2563eb" />
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              tags={computeTags(item, ctx)}
              isFavorite={favKeys.has(productKey(item))}
              onToggleFavorite={handleToggleFav}
              onPress={setDetail}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searched
                ? 'No encontramos productos para esa búsqueda. Prueba con otra palabra.'
                : 'Escribe lo que necesitas (ej. "auriculares") y pulsa \'Buscar\' en el teclado.'}
            </Text>
          }
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}

      <ProductDetailModal
        product={detail}
        visible={!!detail}
        isFavorite={detail ? favKeys.has(productKey(detail)) : false}
        onToggleFavorite={handleToggleFav}
        onClose={() => setDetail(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 44 },
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  brand: { fontSize: 26, fontWeight: '800', color: '#1e3a8a', letterSpacing: -0.5 },
  locationText: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '500' },
  iconBtn: { padding: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginLeft: 8 },
  iconText: { fontSize: 18 },
  searchInput: {
    backgroundColor: '#fff', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0',
    marginBottom: 12, fontSize: 16, color: '#0f172a',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  intentRow: { marginBottom: 10 },
  intentBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  intentBtnActive: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
  intentText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  intentTextActive: { color: '#fff' },
  recentWrap: { marginBottom: 12 },
  recentLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '700', alignSelf: 'center', marginRight: 8 },
  recentChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#eef2f7', marginRight: 8 },
  recentChipText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  recentClear: { paddingVertical: 6, paddingHorizontal: 10, alignSelf: 'center' },
  recentClearText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  filterContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  filterBtn: { flex: 1, paddingVertical: 10, marginHorizontal: 4, borderRadius: 25, backgroundColor: '#e2e8f0', alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#2563eb' },
  filterText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  priceBtn: { paddingVertical: 7, paddingHorizontal: 10, marginRight: 6, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  priceBtnActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  priceText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  priceTextActive: { color: '#fff' },
  sortBtn: { marginLeft: 'auto', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 18, backgroundColor: '#0f172a' },
  sortText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  aiBanner: { backgroundColor: '#eef2ff', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#c7d2fe' },
  aiBadge: { fontSize: 12, fontWeight: '800', color: '#4f46e5', marginBottom: 6 },
  aiText: { fontSize: 14, color: '#312e81', lineHeight: 20 },
  storesBox: { marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  storeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#eef2f7' },
  storeName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  storeAddr: { fontSize: 12, color: '#64748b', marginTop: 2 },
  storeMeta: { alignItems: 'flex-end', marginLeft: 8 },
  storeRating: { fontSize: 12, color: '#f59e0b', fontWeight: '700' },
  storeOpen: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  resultCount: { fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 60, color: '#94a3b8', fontSize: 14, paddingHorizontal: 20, lineHeight: 20 },
});
