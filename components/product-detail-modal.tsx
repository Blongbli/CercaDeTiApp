import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import type { Product } from '../lib/server';
import { distanceMeters, formatDistance, hasPrice } from '../lib/product';
import { openBuy, openMapsForProduct, callPhone } from '../lib/links';
import { useTheme, type ThemeColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';

type Props = {
  product: Product | null;
  visible: boolean;
  isFavorite: boolean;
  onToggleFavorite: (p: Product) => void;
  onClose: () => void;
};

export default function ProductDetailModal({ product, visible, isFavorite, onToggleFavorite, onClose }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (!product) return null;
  const dist = formatDistance(distanceMeters(product));

  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {product.name}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.close}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={styles.priceBox}>
            <Text style={styles.price}>{hasPrice(product) ? `${product.price.toFixed(2)} €` : t('card.priceNA')}</Text>
            <TouchableOpacity onPress={() => onToggleFavorite(product)} style={styles.favBtn}>
              <Text style={styles.favText}>{isFavorite ? t('detail.saved') : t('detail.save')}</Text>
            </TouchableOpacity>
          </View>

          <Row label={t('detail.store')} value={product.store} />
          <Row label={t('detail.type')} value={product.type === 'online' ? t('detail.typeOnline') : t('detail.typeNear')} />
          {dist && <Row label={t('detail.distance')} value={dist} />}
          {product.address ? <Row label={t('detail.address')} value={product.address} /> : null}
          {product.rating != null && <Row label={t('detail.rating')} value={`⭐ ${product.rating}`} />}
          {product.open != null && <Row label={t('detail.status')} value={product.open ? t('common.open') : t('common.closed')} />}

          {product.type === 'cerca' && <Text style={styles.warning}>{t('detail.warning')}</Text>}

          <View style={styles.actions}>
            {product.type === 'online' ? (
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => openBuy(product)}>
                <Text style={styles.btnPrimaryText}>{t('detail.buyOnline')}</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => openMapsForProduct(product)}>
                  <Text style={styles.btnPrimaryText}>{t('detail.viewMaps')}</Text>
                </TouchableOpacity>
                {product.phone ? (
                  <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => callPhone(product.phone)}>
                    <Text style={styles.btnSecondaryText}>{t('detail.call')}</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.surface,
    },
    title: { fontSize: 18, fontWeight: '800', color: c.text, flex: 1, paddingRight: 12 },
    close: { color: c.primary, fontWeight: '700', fontSize: 15 },
    priceBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    price: { fontSize: 26, fontWeight: '800', color: c.price },
    favBtn: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
    favText: { fontWeight: '700', color: c.text, fontSize: 13 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.borderSoft },
    rowLabel: { fontSize: 14, color: c.textMuted, fontWeight: '600' },
    rowValue: { fontSize: 14, color: c.text, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 12 },
    warning: { marginTop: 16, fontSize: 13, color: c.warningText, backgroundColor: c.warningBg, padding: 12, borderRadius: 10, lineHeight: 19 },
    actions: { marginTop: 22 },
    btn: { padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
    btnPrimary: { backgroundColor: c.primary },
    btnPrimaryText: { color: c.primaryText, fontWeight: '700', fontSize: 16 },
    btnSecondary: { backgroundColor: c.primarySoftBg, borderWidth: 1, borderColor: c.primarySoftBorder },
    btnSecondaryText: { color: c.primary, fontWeight: '700', fontSize: 15 },
  });
