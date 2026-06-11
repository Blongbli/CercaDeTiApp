import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  autoServerUrl,
  getServerUrl,
  setServerUrl,
  clearServerUrl,
  pingServer,
} from '../lib/server';

export default function SettingsScreen() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [auto, setAuto] = useState('');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setAuto(autoServerUrl());
      setUrl(await getServerUrl());
    })();
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setStatus(null);
    const result = await pingServer(url);
    setTesting(false);
    if (result.ok) {
      const f = result.features || {};
      const activas = [
        f.online ? 'Búsqueda online' : null,
        f.ai ? 'IA' : null,
        f.places ? 'Tiendas cercanas' : null,
      ].filter(Boolean);
      setStatus(
        `✅ Conectado.\nFuentes activas: ${activas.length ? activas.join(', ') : 'solo catálogo de ejemplo'}`
      );
    } else {
      setStatus('❌ No se pudo conectar. Revisa la IP, el puerto y que el servidor esté encendido.');
    }
  };

  const handleSave = async () => {
    await setServerUrl(url);
    router.back();
  };

  const handleUseAuto = async () => {
    await clearServerUrl();
    setUrl(auto);
    setStatus('Se usará la detección automática (servidor en el mismo PC que Metro).');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Ajustes del servidor</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>Cerrar</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>URL del servidor</Text>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={setUrl}
        placeholder="http://192.168.1.50:3000"
        placeholderTextColor="#9aa5b1"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <Text style={styles.hint}>
        Escribe la IP de tu servidor Ubuntu seguida de {`:3000`}. Por ejemplo:{' '}
        <Text style={styles.mono}>http://192.168.1.50:3000</Text>
      </Text>

      <TouchableOpacity style={[styles.btn, styles.btnTest]} onPress={handleTest} disabled={testing}>
        {testing ? (
          <ActivityIndicator color="#2563eb" />
        ) : (
          <Text style={styles.btnTestText}>Probar conexión</Text>
        )}
      </TouchableOpacity>

      {status && <Text style={styles.status}>{status}</Text>}

      <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSave}>
        <Text style={styles.btnSaveText}>Guardar</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleUseAuto} style={styles.autoLink}>
        <Text style={styles.autoLinkText}>Usar detección automática</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>Detección automática actual: <Text style={styles.mono}>{auto}</Text></Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  close: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 },
  input: {
    backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1',
    fontSize: 16, color: '#0f172a',
  },
  hint: { fontSize: 12, color: '#64748b', marginTop: 8, lineHeight: 18 },
  mono: { fontFamily: 'monospace', color: '#0f172a' },
  btn: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 18 },
  btnTest: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  btnTestText: { color: '#2563eb', fontWeight: '700', fontSize: 15 },
  btnSave: { backgroundColor: '#2563eb' },
  btnSaveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  status: { marginTop: 14, fontSize: 13, color: '#334155', lineHeight: 20, backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10 },
  autoLink: { marginTop: 22, alignItems: 'center' },
  autoLinkText: { color: '#2563eb', fontWeight: '600', fontSize: 14 },
});
