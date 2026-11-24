import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { searchProducts, recommendProducts, getServerUrl, type Product, type Store } from '../lib/server';
import { getHistory, addHistory, clearHistory, getFavoriteKeys, toggleFavorite } from '../lib/storage';
import { tagContextFor, computeTags, distanceMeters, productKey } from '../lib/product';
import { openMaps, openOffer } from '../lib/links';
import { chainAvailability } from '../lib/local-availability';
import { useTheme, type ThemeColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import ProductCard from '../components/product-card';
import ProductDetailModal from '../components/product-detail-modal';

type ProductType = 'online' | 'cerca';
type RangeKey = 'low' | 'mid' | 'high';
type SortKey = 'cheap' | 'expensive' | 'near' | 'today';

// Grupo TIPO — multiselección. Sin nada marcado = todos.
const TYPE_OPTIONS: { key: ProductType; tkey: string }[] = [
  { key: 'online', tkey: 'home.typeOnline' },
  { key: 'cerca', tkey: 'home.typeNear' },
];

// Grupo PRECIO — multiselección (cumple si encaja en CUALQUIER rango marcado).
const PRICE_PRESETS: { key: RangeKey; tkey: string; test: (p: number) => boolean }[] = [
  { key: 'low', tkey: 'home.priceLow', test: (p) => p < 50 },
  { key: 'mid', tkey: 'home.priceMid', test: (p) => p >= 50 && p <= 150 },
  { key: 'high', tkey: 'home.priceHigh', test: (p) => p > 150 },
];

// Grupo ORDENAR — selección única (solo se puede ordenar por un criterio).
const SORT_OPTIONS: { key: SortKey; tkey: string }[] = [
  { key: 'cheap', tkey: 'home.sortCheap' },
  { key: 'expensive', tkey: 'home.sortExpensive' },
  { key: 'near', tkey: 'home.sortNear' },
  { key: 'today', tkey: 'home.sortToday' },
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
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [bestPickId, setBestPickId] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [intl, setIntl] = useState(false); // incluir ofertas del extranjero (online)
  const [recommending, setRecommending] = useState(false);
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
        Alert.alert(t('home.permTitle'), t('home.permMsg'));
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recargar favoritos cada vez que la pantalla recupera el foco (p.ej. tras la vista de favoritos).
  useFocusEffect(
    useCallback(() => {
      getFavoriteKeys().then(setFavKeys);
    }, [])
  );

  // IA: manda los productos a /recomendar y rellena el banner + "Mejor opción".
  // `manual` = lo pidió el usuario (mostramos error si falla); si es automático,
  // fallamos en silencio para no molestar.
  const runRecommend = async (list: Product[], manual: boolean) => {
    if (list.length === 0) return;
    setRecommending(true);
    try {
      const rec = await recommendProducts(list);
      setSummary(rec.reason ? `${rec.recommendation} ${rec.reason}` : rec.recommendation);
      if (rec.bestProductId) setBestPickId(rec.bestProductId);
    } catch {
      if (manual) {
        Alert.alert(t('home.aiUnavailTitle'), t('home.aiUnavailMsg'));
      }
    } finally {
      setRecommending(false);
    }
  };

  const runSearch = async (term: string) => {
    if (!term.trim()) return;
    setLoading(true);
    setSearched(true);
    setSummary(null);
    setResults([]);
    setStores([]);
    try {
      const data = await searchProducts(term, location, intl);
      setResults(data.results);
      setStores(data.stores || []);
      setBestPickId(data.bestPickId);
      setHistory(await addHistory(term));
      // Resumen IA automático (no bloquea la lista; aparece cuando está listo).
      runRecommend(data.results, false);
    } catch (e) {
      setResults([]);
      setStores([]);
      setSummary(null);
      const base = await getServerUrl();
      Alert.alert(t('home.noConnTitle'), t('home.noConnMsg', { url: base }));
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
      const data = await searchProducts(searchQuery, location, intl);
      setResults(data.results);
      setStores(data.stores || []);
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

  // Cabecera desplazable: el panel de filtros va DENTRO de la lista, así se
  // desplaza con el contenido en vez de quedarse fijo ocupando pantalla.
  const Header = (
    <View>
      {/* ───── Panel de filtros (todos combinables) ───── */}
      <View style={styles.filtersCard}>
        <View style={styles.filtersHeader}>
          <Text style={styles.filtersTitle}>
            {t('home.filters')}{activeCount > 0 ? <Text style={styles.filtersBadge}> · {activeCount}</Text> : null}
          </Text>
          {activeCount > 0 && (
            <TouchableOpacity onPress={clearFilters} hitSlop={8}>
              <Text style={styles.filtersClear}>{t('home.clearFilters')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tipo */}
        <Text style={styles.groupLabel}>{t('home.type')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {TYPE_OPTIONS.map((o) => {
            const active = types.has(o.key);
            return (
              <TouchableOpacity
                key={o.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleType(o.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(o.tkey)}</Text>
              </TouchableOpacity>
            );
          })}
          {/* Toggle: incluir ofertas del extranjero (más barato fuera de España) */}
          <TouchableOpacity
            style={[styles.chip, intl && styles.chipActive]}
            onPress={() => setIntl((v) => !v)}
          >
            <Text style={[styles.chipText, intl && styles.chipTextActive]}>{t('home.foreign')}</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.groupDivider} />

        {/* Precio */}
        <Text style={styles.groupLabel}>{t('home.price')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {PRICE_PRESETS.map((r) => {
            const active = !hasCustomPrice && ranges.has(r.key);
            return (
              <TouchableOpacity
                key={r.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleRange(r.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(r.tkey)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.customRow}>
          <Text style={styles.customPrefix}>{t('home.priceFrom')}</Text>
          <TextInput
            style={[styles.customInput, hasCustomPrice && styles.customInputActive]}
            placeholder="0"
            placeholderTextColor={colors.textFaint}
            keyboardType="numeric"
            inputMode="numeric"
            value={minPrice}
            onChangeText={(val) => onChangeCustomPrice('min', val)}
            returnKeyType="done"
          />
          <Text style={styles.customDash}>{t('home.priceTo')}</Text>
          <TextInput
            style={[styles.customInput, hasCustomPrice && styles.customInputActive]}
            placeholder={t('home.noLimit')}
            placeholderTextColor={colors.textFaint}
            keyboardType="numeric"
            inputMode="numeric"
            value={maxPrice}
            onChangeText={(val) => onChangeCustomPrice('max', val)}
            returnKeyType="done"
          />
          <Text style={styles.customPrefix}>€</Text>
        </View>

        <View style={styles.groupDivider} />

        {/* Ordenar */}
        <Text style={styles.groupLabel}>{t('home.sortBy')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {SORT_OPTIONS.map((o) => {
            const active = sortBy === o.key;
            return (
              <TouchableOpacity
                key={o.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSortBy(o.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(o.tkey)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {searched && !loading && filteredResults.length > 0 && (
        <TouchableOpacity
          style={[styles.aiButton, recommending && styles.aiButtonDisabled]}
          onPress={() => runRecommend(filteredResults, true)}
          disabled={recommending}
          activeOpacity={0.85}
        >
          {recommending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.aiButtonText}>{summary ? t('home.reAnalyze') : t('home.helpMeChoose')}</Text>
          )}
        </TouchableOpacity>
      )}

      {summary && (
        <View style={styles.aiBanner}>
          <Text style={styles.aiBadge}>{t('home.recommendation')}</Text>
          <Text style={styles.aiText}>{summary}</Text>
        </View>
      )}

      {stores.length > 0 && (
        <View style={styles.storesBox}>
          <Text style={styles.sectionTitle}>{t('home.nearbyStores')}</Text>
          {stores.map((s) => {
            const avail = chainAvailability(s.name, searchQuery);
            return (
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
                  {avail && (
                    <TouchableOpacity onPress={() => openOffer(avail.url)} hitSlop={6} style={styles.storeStock}>
                      <Text style={styles.storeStockText}>🔎 {t('store.checkStock')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.storeMeta}>
                  {s.rating != null && <Text style={styles.storeRating}>⭐ {s.rating}</Text>}
                  {s.open != null && (
                    <Text style={[styles.storeOpen, { color: s.open ? colors.success : colors.danger }]}>
                      {s.open ? t('common.open') : t('common.closed')}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {searched && !loading && filteredResults.length > 0 && (
        <Text style={styles.resultCount}>
          {filteredResults.length} {filteredResults.length === 1 ? t('home.result') : t('home.results')}
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
              : t('home.locating')}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/chat')}>
          <Text style={styles.iconText}>💬</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/favorites')}>
          <Text style={styles.iconText}>❤️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/settings')}>
          <Text style={styles.iconText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder={t('home.searchPlaceholder')}
        placeholderTextColor={colors.textFaint}
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmitEditing={handleSearch}
        returnKeyType="search"
      />

      {/* Búsquedas recientes */}
      {history.length > 0 && (
        <View style={styles.recentWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={styles.recentLabel}>{t('home.recent')}</Text>
            {history.map((h) => (
              <TouchableOpacity key={h} style={styles.recentChip} onPress={() => handleRecent(h)}>
                <Text style={styles.recentChipText}>{h}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={handleClearHistory} style={styles.recentClear}>
              <Text style={styles.recentClearText}>{t('common.clear')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filteredResults}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={Header}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
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
          loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.emptyText}>{searched ? t('home.emptySearched') : t('home.emptyInitial')}</Text>
          )
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />

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

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 44 },
    topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    brand: { fontSize: 26, fontWeight: '800', color: c.brand, letterSpacing: -0.5 },
    locationText: { fontSize: 12, color: c.textMuted, marginTop: 2, fontWeight: '500' },
    iconBtn: { padding: 8, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border, marginLeft: 8 },
    iconText: { fontSize: 18 },
    searchInput: {
      backgroundColor: c.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border,
      marginBottom: 12, fontSize: 16, color: c.text,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    recentWrap: { marginBottom: 12 },
    recentLabel: { fontSize: 12, color: c.textFaint, fontWeight: '700', alignSelf: 'center', marginRight: 8 },
    recentChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.chipBg, marginRight: 8 },
    recentChipText: { fontSize: 13, color: c.chipText, fontWeight: '600' },
    recentClear: { paddingVertical: 6, paddingHorizontal: 10, alignSelf: 'center' },
    recentClearText: { fontSize: 12, color: c.danger, fontWeight: '600' },

    // Panel de filtros
    filtersCard: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 14,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    filtersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    filtersTitle: { fontSize: 15, fontWeight: '800', color: c.text },
    filtersBadge: { color: c.primary, fontWeight: '800' },
    filtersClear: { fontSize: 12, fontWeight: '700', color: c.danger },
    groupLabel: { fontSize: 11, fontWeight: '800', color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 8 },
    chipsRow: { paddingRight: 4 },
    chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: c.chipBg, borderWidth: 1, borderColor: c.chipBorder, marginRight: 8 },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 13, fontWeight: '700', color: c.chipText },
    chipTextActive: { color: c.primaryText },
    groupDivider: { height: 1, backgroundColor: c.borderSoft, marginTop: 12 },
    customRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    customPrefix: { fontSize: 13, color: c.textMuted, fontWeight: '600' },
    customInput: {
      flex: 1, marginHorizontal: 8, backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.border, borderRadius: 12,
      paddingVertical: 8, paddingHorizontal: 12, fontSize: 13, color: c.text,
    },
    customInputActive: { borderColor: c.primary, backgroundColor: c.primarySoftBg },
    customDash: { color: c.textFaint, fontWeight: '700' },

    aiButton: {
      backgroundColor: c.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
      marginBottom: 14, minHeight: 50,
      shadowColor: c.accent, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
    },
    aiButtonDisabled: { opacity: 0.7 },
    aiButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    aiBanner: { backgroundColor: c.accentSoftBg, borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: c.accentSoftBorder },
    aiBadge: { fontSize: 12, fontWeight: '800', color: c.accent, marginBottom: 6 },
    aiText: { fontSize: 14, color: c.accentSoftText, lineHeight: 20 },
    storesBox: { marginBottom: 14 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: c.text, marginBottom: 8 },
    storeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: c.borderSoft },
    storeName: { fontSize: 14, fontWeight: '700', color: c.text },
    storeAddr: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    storeStock: { marginTop: 6, alignSelf: 'flex-start' },
    storeStockText: { fontSize: 12, color: c.primary, fontWeight: '700' },
    storeMeta: { alignItems: 'flex-end', marginLeft: 8 },
    storeRating: { fontSize: 12, color: c.ratingAmber, fontWeight: '700' },
    storeOpen: { fontSize: 11, fontWeight: '700', marginTop: 2 },
    resultCount: { fontSize: 12, color: c.textMuted, marginBottom: 8, fontWeight: '600' },
    emptyText: { textAlign: 'center', marginTop: 60, color: c.textFaint, fontSize: 14, paddingHorizontal: 20, lineHeight: 20 },
  });
