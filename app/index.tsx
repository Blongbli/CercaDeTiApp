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

type ProductType = 'online' | 'cerca';
type RangeKey = 'low' | 'mid' | 'high';
type SortKey = 'cheap' | 'expensive' | 'near' | 'today';

// Grupo TIPO — multiselección. Sin nada marcado = todos.
const TYPE_OPTIONS: { key: ProductType; label: string }[] = [
  { key: 'online', label: '🌐 Online' },
  { key: 'cerca', label: '📍 Cerca de ti' },
];

// Grupo PRECIO — multiselección (cumple si encaja en CUALQUIER rango marcado).
const PRICE_PRESETS: { key: RangeKey; label: string; test: (p: number) => boolean }[] = [
  { key: 'low', label: '< 50 €', test: (p) => p < 50 },
  { key: 'mid', label: '50–150 €', test: (p) => p >= 50 && p <= 150 },
  { key: 'high', label: '+150 €', test: (p) => p > 150 },
];

// Grupo ORDENAR — selección única (solo se puede ordenar por un criterio).
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'cheap', label: '💰 Más barato' },
  { key: 'expensive', label: '💸 Más caro' },
  { key: 'near', label: '📍 Más cercano' },
  { key: 'today', label: '⚡ Disponible hoy' },
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
  // --- Filtros (todos combinables entre sí) ---
  const [types, setTypes] = useState<Set<ProductType>>(new Set());
  const [ranges, setRanges] = useState<Set<RangeKey>>(new Set());
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('cheap');
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

  // --- Toggles de filtros (multiselección por grupo) ---
  const toggleType = (k: ProductType) =>
    setTypes((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const toggleRange = (k: RangeKey) => {
    // Elegir un rango predefinido descarta el precio personalizado.
    setMinPrice('');
    setMaxPrice('');
    setRanges((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const onChangeCustomPrice = (which: 'min' | 'max', text: string) => {
    const clean = text.replace(/[^0-9.,]/g, '');
    // El precio personalizado descarta los rangos predefinidos.
    if (clean) setRanges(new Set());
    (which === 'min' ? setMinPrice : setMaxPrice)(clean);
  };

  const clearFilters = () => {
    setTypes(new Set());
    setRanges(new Set());
    setMinPrice('');
    setMaxPrice('');
    setSortBy('cheap');
  };

  // --- Cálculo de resultados filtrados + ordenados ---
  const minVal = minPrice.trim() === '' ? 0 : Number(minPrice.replace(',', '.'));
  const maxVal = maxPrice.trim() === '' ? Infinity : Number(maxPrice.replace(',', '.'));
  const hasCustomPrice = minPrice.trim() !== '' || maxPrice.trim() !== '';

  const passesType = (item: Product) => types.size === 0 || types.has(item.type as ProductType);
  const passesPrice = (p: number) => {
    if (hasCustomPrice) {
      return p >= (Number.isNaN(minVal) ? 0 : minVal) && p <= (Number.isNaN(maxVal) ? Infinity : maxVal);
    }
    if (ranges.size === 0) return true;
    return [...ranges].some((k) => PRICE_PRESETS.find((r) => r.key === k)!.test(p));
  };

  const baseFiltered = results.filter((item) => passesType(item) && passesPrice(item.price));
  const filteredResults =
    sortBy === 'today'
      ? sortDistanceOpen(baseFiltered)
      : sortBy === 'near'
        ? [...baseFiltered].sort((a, b) => (distanceMeters(a) ?? Infinity) - (distanceMeters(b) ?? Infinity))
        : [...baseFiltered].sort((a, b) => (sortBy === 'cheap' ? a.price - b.price : b.price - a.price));

  // Filtros activos (para el contador y el botón "Limpiar"). El orden por
  // defecto ('cheap') no cuenta como filtro activo.
  const priceActive = hasCustomPrice ? 1 : ranges.size;
  const activeCount = types.size + priceActive + (sortBy !== 'cheap' ? 1 : 0);

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

      {/* ───── Panel de filtros (todos combinables) ───── */}
      <View style={styles.filtersCard}>
        <View style={styles.filtersHeader}>
          <Text style={styles.filtersTitle}>
            🎚️ Filtros{activeCount > 0 ? <Text style={styles.filtersBadge}> · {activeCount}</Text> : null}
          </Text>
          {activeCount > 0 && (
            <TouchableOpacity onPress={clearFilters} hitSlop={8}>
              <Text style={styles.filtersClear}>✕ Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tipo */}
        <Text style={styles.groupLabel}>Tipo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {TYPE_OPTIONS.map((o) => {
            const active = types.has(o.key);
            return (
              <TouchableOpacity
                key={o.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleType(o.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.groupDivider} />

        {/* Precio */}
        <Text style={styles.groupLabel}>Precio</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {PRICE_PRESETS.map((r) => {
            const active = !hasCustomPrice && ranges.has(r.key);
            return (
              <TouchableOpacity
                key={r.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleRange(r.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.customRow}>
          <Text style={styles.customPrefix}>o de</Text>
          <TextInput
            style={[styles.customInput, hasCustomPrice && styles.customInputActive]}
            placeholder="0"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            inputMode="numeric"
            value={minPrice}
            onChangeText={(t) => onChangeCustomPrice('min', t)}
            returnKeyType="done"
          />
          <Text style={styles.customDash}>a</Text>
          <TextInput
            style={[styles.customInput, hasCustomPrice && styles.customInputActive]}
            placeholder="Sin límite"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            inputMode="numeric"
            value={maxPrice}
            onChangeText={(t) => onChangeCustomPrice('max', t)}
            returnKeyType="done"
          />
          <Text style={styles.customPrefix}>€</Text>
        </View>

        <View style={styles.groupDivider} />

        {/* Ordenar */}
        <Text style={styles.groupLabel}>Ordenar por</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {SORT_OPTIONS.map((o) => {
            const active = sortBy === o.key;
            return (
              <TouchableOpacity
                key={o.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSortBy(o.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
  recentWrap: { marginBottom: 12 },
  recentLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '700', alignSelf: 'center', marginRight: 8 },
  recentChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#eef2f7', marginRight: 8 },
  recentChipText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  recentClear: { paddingVertical: 6, paddingHorizontal: 10, alignSelf: 'center' },
  recentClearText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },

  // Panel de filtros
  filtersCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e9eef5', padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  filtersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  filtersTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  filtersBadge: { color: '#2563eb', fontWeight: '800' },
  filtersClear: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
  groupLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 8 },
  chipsRow: { paddingRight: 4 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  chipTextActive: { color: '#fff' },
  groupDivider: { height: 1, backgroundColor: '#f1f5f9', marginTop: 12 },
  customRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  customPrefix: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  customInput: {
    flex: 1, marginHorizontal: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 12, fontSize: 13, color: '#0f172a',
  },
  customInputActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  customDash: { color: '#94a3b8', fontWeight: '700' },

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
