import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import type { Product } from '../lib/server';
import { getFavorites, toggleFavorite, type Favorite } from '../lib/storage';
import { tagContextFor, computeTags, productKey } from '../lib/product';
import { useTheme, type ThemeColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import ProductCard from '../components/product-card';
import ProductDetailModal from '../components/product-detail-modal';

export default function FavoritesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [detail, setDetail] = useState<Product | null>(null);

  const reload = useCallback(() => {
    getFavorites().then(setFavorites);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const products = favorites.map((f) => f.product);
  const ctx = tagContextFor(products, null);
  const favKeys = new Set(favorites.map((f) => f.key));

  const handleToggle = async (p: Product) => {
    const { favorites: next } = await toggleFavorite(p);
    setFavorites(next);
    if (detail && productKey(detail) === productKey(p)) setDetail(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('fav.title')}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>{t('common.close')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => productKey(item)}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            tags={computeTags(item, ctx)}
            isFavorite={favKeys.has(productKey(item))}
            onToggleFavorite={handleToggle}
            onPress={setDetail}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('fav.empty')}</Text>}
      />

      <ProductDetailModal
        product={detail}
        visible={!!detail}
        isFavorite={detail ? favKeys.has(productKey(detail)) : false}
        onToggleFavorite={handleToggle}
        onClose={() => setDetail(null)}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg, paddingTop: 50 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14 },
    title: { fontSize: 22, fontWeight: '800', color: c.text },
    close: { color: c.primary, fontWeight: '700', fontSize: 15 },
    empty: { textAlign: 'center', marginTop: 80, color: c.textFaint, fontSize: 14, paddingHorizontal: 30, lineHeight: 21 },
  });
