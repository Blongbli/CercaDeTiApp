import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import type { Product } from '../lib/server';
import { distanceMeters, formatDistance, hasPrice } from '../lib/product';
import { openBuy, openMapsForProduct, callPhone } from '../lib/links';

type Props = {
  product: Product | null;
  visible: boolean;
  isFavorite: boolean;
  onToggleFavorite: (p: Product) => void;
  onClose: () => void;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function ProductDetailModal({ product, visible, isFavorite, onToggleFavorite, onClose }: Props) {
  if (!product) return null;
  const dist = formatDistance(distanceMeters(product));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {product.name}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.close}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={styles.priceBox}>
            <Text style={styles.price}>{hasPrice(product) ? `${product.price.toFixed(2)} €` : 'Precio no disponible'}</Text>
            <TouchableOpacity onPress={() => onToggleFavorite(product)} style={styles.favBtn}>
              <Text style={styles.favText}>{isFavorite ? '❤️ Guardado' : '🤍 Guardar'}</Text>
            </TouchableOpacity>
          </View>

          <Row label="Tienda" value={product.store} />
          <Row label="Tipo" value={product.type === 'online' ? 'Online' : 'Cerca de ti'} />
          {dist && <Row label="Distancia" value={dist} />}
          {product.address ? <Row label="Dirección" value={product.address} /> : null}
          {product.rating != null && <Row label="Valoración" value={`⭐ ${product.rating}`} />}
          {product.open != null && <Row label="Estado" value={product.open ? 'Abierto' : 'Cerrado'} />}

          {product.type === 'cerca' && (
            <Text style={styles.warning}>⚠️ La disponibilidad en tienda puede no estar confirmada.</Text>
          )}

          <View style={styles.actions}>
            {product.type === 'online' ? (
              // Producto online -> enlace para comprarlo.
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => openBuy(product)}>
                <Text style={styles.btnPrimaryText}>🛒 Comprar online</Text>
              </TouchableOpacity>
            ) : (
              // Producto cercano -> ubicación en Google Maps.
              <>
                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => openMapsForProduct(product)}>
                  <Text style={styles.btnPrimaryText}>📍 Ver en Google Maps</Text>
                </TouchableOpacity>
                {product.phone ? (
                  <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => callPhone(product.phone)}>
                    <Text style={styles.btnSecondaryText}>📞 Llamar a la tienda</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', flex: 1, paddingRight: 12 },
  close: { color: '#2563eb', fontWeight: '700', fontSize: 15 },
  priceBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  price: { fontSize: 26, fontWeight: '800', color: '#16a34a' },
  favBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  favText: { fontWeight: '700', color: '#0f172a', fontSize: 13 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  rowLabel: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  rowValue: { fontSize: 14, color: '#0f172a', fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 12 },
  warning: { marginTop: 16, fontSize: 13, color: '#92400e', backgroundColor: '#fef3c7', padding: 12, borderRadius: 10, lineHeight: 19 },
  actions: { marginTop: 22 },
  btn: { padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  btnPrimary: { backgroundColor: '#2563eb' },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnSecondary: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  btnSecondaryText: { color: '#2563eb', fontWeight: '700', fontSize: 15 },
});
