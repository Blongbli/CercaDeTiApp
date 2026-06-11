import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Product } from '../lib/server';
import { distanceMeters, formatDistance, hasPrice, canRoute } from '../lib/product';
import { openOffer, openMapsForProduct } from '../lib/links';

type Props = {
  product: Product;
  tags: string[];
  isFavorite: boolean;
  onToggleFavorite: (p: Product) => void;
  onPress: (p: Product) => void;
};

const TAG_STYLES: Record<string, { bg: string; fg: string }> = {
  'Mejor opción': { bg: '#e0e7ff', fg: '#4f46e5' },
  'Más barato': { bg: '#dcfce7', fg: '#15803d' },
  'Más cercano': { bg: '#ffedd5', fg: '#c2410c' },
  Online: { bg: '#dbeafe', fg: '#1d4ed8' },
  'Cerca de ti': { bg: '#f1f5f9', fg: '#475569' },
};

export default function ProductCard({ product, tags, isFavorite, onToggleFavorite, onPress }: Props) {
  const isBest = tags.includes('Mejor opción');
  const dist = formatDistance(distanceMeters(product));
  const showOffer = !!product.link;
  const showRoute = canRoute(product);

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => onPress(product)} style={[styles.card, isBest && styles.cardBest]}>
      {/* Etiquetas + favorito */}
      <View style={styles.topRow}>
        <View style={styles.tags}>
          {tags.map((t) => {
            const c = TAG_STYLES[t] || { bg: '#f1f5f9', fg: '#475569' };
            return (
              <View key={t} style={[styles.tag, { backgroundColor: c.bg }]}>
                <Text style={[styles.tagText, { color: c.fg }]}>{t}</Text>
              </View>
            );
          })}
        </View>
        <TouchableOpacity
          onPress={() => onToggleFavorite(product)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.heartBtn}
        >
          <Text style={styles.heart}>{isFavorite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.name}>{product.name}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.price}>{hasPrice(product) ? `${product.price.toFixed(2)} €` : 'Precio no disponible'}</Text>
        {product.rating != null && <Text style={styles.rating}>⭐ {product.rating}</Text>}
        {product.open != null && (
          <Text style={[styles.open, { color: product.open ? '#16a34a' : '#dc2626' }]}>
            {product.open ? 'Abierto' : 'Cerrado'}
          </Text>
        )}
      </View>

      <View style={styles.storeRow}>
        <Text style={styles.store} numberOfLines={1}>
          🏪 {product.store}
        </Text>
        {dist && <Text style={styles.dist}>📍 {dist}</Text>}
      </View>

      {(showOffer || showRoute) && (
        <View style={styles.actions}>
          {showOffer && (
            <TouchableOpacity style={[styles.actionBtn, styles.offerBtn]} onPress={() => openOffer(product.link)}>
              <Text style={styles.offerText}>Ver oferta →</Text>
            </TouchableOpacity>
          )}
          {showRoute && (
            <TouchableOpacity style={[styles.actionBtn, styles.routeBtn]} onPress={() => openMapsForProduct(product)}>
              <Text style={styles.routeText}>Cómo llegar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#eef2f7',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  cardBest: { borderColor: '#6366f1', borderWidth: 2 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', flex: 1, marginBottom: 6 },
  tag: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, marginRight: 6, marginBottom: 4 },
  tagText: { fontSize: 11, fontWeight: '700' },
  heartBtn: { paddingLeft: 8 },
  heart: { fontSize: 20 },
  name: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  price: { fontSize: 17, fontWeight: '800', color: '#16a34a', marginRight: 10 },
  rating: { fontSize: 13, color: '#f59e0b', fontWeight: '700', marginRight: 10 },
  open: { fontSize: 12, fontWeight: '700' },
  storeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  store: { fontSize: 13, color: '#64748b', fontWeight: '500', flex: 1 },
  dist: { fontSize: 12, color: '#c2410c', fontWeight: '600', marginLeft: 8 },
  actions: { flexDirection: 'row', marginTop: 12 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, marginRight: 8 },
  offerBtn: { backgroundColor: '#2563eb' },
  offerText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  routeBtn: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  routeText: { color: '#2563eb', fontWeight: '700', fontSize: 13 },
});
