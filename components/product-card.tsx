import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Product } from '../lib/server';
import { distanceMeters, formatDistance, hasPrice, canRoute } from '../lib/product';
import { openOffer, openMapsForProduct } from '../lib/links';
import { chainAvailability } from '../lib/local-availability';
import { useTheme, type ThemeColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';

type Props = {
  product: Product;
  tags: string[];
  isFavorite: boolean;
  onToggleFavorite: (p: Product) => void;
  onPress: (p: Product) => void;
};

// Las etiquetas viajan como claves estables en español (se usan para el color y
// el ranking). Aquí solo se traduce el TEXTO que se muestra.
const TAG_KEYS: Record<string, string> = {
  'Mejor opción': 'tag.best',
  'Más barato': 'tag.cheapest',
  'Más cercano': 'tag.nearest',
  Online: 'tag.online',
  'Cerca de ti': 'tag.near',
};

export default function ProductCard({ product, tags, isFavorite, onToggleFavorite, onPress }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isBest = tags.includes('Mejor opción');
  const dist = formatDistance(distanceMeters(product));
  const showOffer = !!product.link;
  const showRoute = canRoute(product);
  // Si la tienda online es una cadena con tiendas físicas en España, ofrecemos
  // comprobar disponibilidad en tienda (enlace a la web de stock de la cadena).
  const avail = product.type === 'online' ? chainAvailability(product.store, product.name) : null;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => onPress(product)} style={[styles.card, isBest && styles.cardBest]}>
      {/* Etiquetas + favorito */}
      <View style={styles.topRow}>
        <View style={styles.tags}>
          {tags.map((tag) => {
            const c = colors.tags[tag] || { bg: colors.chipBg, fg: colors.chipText };
            const label = TAG_KEYS[tag] ? t(TAG_KEYS[tag]) : tag;
            return (
              <View key={tag} style={[styles.tag, { backgroundColor: c.bg }]}>
                <Text style={[styles.tagText, { color: c.fg }]}>{label}</Text>
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
        <Text style={styles.price}>{hasPrice(product) ? `${product.price.toFixed(2)} €` : t('card.priceNA')}</Text>
        {product.rating != null && <Text style={styles.rating}>⭐ {product.rating}</Text>}
        {product.open != null && (
          <Text style={[styles.open, { color: product.open ? colors.success : colors.danger }]}>
            {product.open ? t('common.open') : t('common.closed')}
          </Text>
        )}
      </View>

      <View style={styles.storeRow}>
        <Text style={styles.store} numberOfLines={1}>
          🏪 {product.store}
        </Text>
        {dist && <Text style={styles.dist}>📍 {dist}</Text>}
      </View>

      {(showOffer || showRoute || avail) && (
        <View style={styles.actions}>
          {showOffer && (
            <TouchableOpacity style={[styles.actionBtn, styles.offerBtn]} onPress={() => openOffer(product.link)}>
              <Text style={styles.offerText}>{t('card.seeOffer')}</Text>
            </TouchableOpacity>
          )}
          {avail && (
            <TouchableOpacity style={[styles.actionBtn, styles.storeBtn]} onPress={() => openOffer(avail.url)}>
              <Text style={styles.storeBtnText}>{t('card.inStore')}</Text>
            </TouchableOpacity>
          )}
          {showRoute && (
            <TouchableOpacity style={[styles.actionBtn, styles.routeBtn]} onPress={() => openMapsForProduct(product)}>
              <Text style={styles.routeText}>{t('card.howToGet')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card, padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: c.borderSoft,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    cardBest: { borderColor: c.cardBestBorder, borderWidth: 2 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    tags: { flexDirection: 'row', flexWrap: 'wrap', flex: 1, marginBottom: 6 },
    tag: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, marginRight: 6, marginBottom: 4 },
    tagText: { fontSize: 11, fontWeight: '700' },
    heartBtn: { paddingLeft: 8 },
    heart: { fontSize: 20 },
    name: { fontSize: 15, fontWeight: 'bold', color: c.text, marginBottom: 6 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    price: { fontSize: 17, fontWeight: '800', color: c.price, marginRight: 10 },
    rating: { fontSize: 13, color: c.ratingAmber, fontWeight: '700', marginRight: 10 },
    open: { fontSize: 12, fontWeight: '700' },
    storeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    store: { fontSize: 13, color: c.textMuted, fontWeight: '500', flex: 1 },
    dist: { fontSize: 12, color: c.distanceText, fontWeight: '600', marginLeft: 8 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
    actionBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, marginRight: 8, marginBottom: 6 },
    offerBtn: { backgroundColor: c.primary },
    offerText: { color: c.primaryText, fontWeight: '700', fontSize: 13 },
    routeBtn: { backgroundColor: c.primarySoftBg, borderWidth: 1, borderColor: c.primarySoftBorder },
    routeText: { color: c.primary, fontWeight: '700', fontSize: 13 },
    storeBtn: { backgroundColor: c.accentSoftBg, borderWidth: 1, borderColor: c.accentSoftBorder },
    storeBtnText: { color: c.accent, fontWeight: '700', fontSize: 13 },
  });
