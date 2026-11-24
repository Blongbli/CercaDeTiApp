import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  autoServerUrl,
  getServerUrl,
  setServerUrl,
  clearServerUrl,
  pingServer,
} from '../lib/server';
import { useTheme, type ThemeColors, type ThemeMode } from '../lib/theme';
import { useI18n, LANGUAGES } from '../lib/i18n';

const THEME_OPTIONS: { key: ThemeMode; tkey: string }[] = [
  { key: 'system', tkey: 'settings.themeSystem' },
  { key: 'light', tkey: 'settings.themeLight' },
  { key: 'dark', tkey: 'settings.themeDark' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, mode, setMode } = useTheme();
  const { t, lang, setLang } = useI18n();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
        f.online ? t('settings.srcOnline') : null,
        f.ai ? t('settings.srcAI') : null,
        f.places ? t('settings.srcStores') : null,
      ].filter(Boolean);
      setStatus(
        t('settings.connectedOk', { sources: activas.length ? activas.join(', ') : t('settings.sourcesNone') })
      );
    } else {
      setStatus(t('settings.connFail'));
    }
  };

  const handleSave = async () => {
    await setServerUrl(url);
    router.back();
  };

  const handleUseAuto = async () => {
    await clearServerUrl();
    setUrl(auto);
    setStatus(t('settings.autoMsg'));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>{t('common.close')}</Text>
        </TouchableOpacity>
      </View>

      {/* Idioma */}
      <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
      <View style={styles.segment}>
        {LANGUAGES.map((o) => {
          const active = lang === o.key;
          return (
            <TouchableOpacity
              key={o.key}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
              onPress={() => setLang(o.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.divider} />

      {/* Apariencia */}
      <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>
      <View style={styles.segment}>
        {THEME_OPTIONS.map((o) => {
          const active = mode === o.key;
          return (
            <TouchableOpacity
              key={o.key}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
              onPress={() => setMode(o.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{t(o.tkey)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.divider} />

      {/* Servidor */}
      <Text style={styles.sectionTitle}>{t('settings.server')}</Text>
      <Text style={styles.label}>{t('settings.serverUrl')}</Text>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={setUrl}
        placeholder="http://192.168.1.50:3000"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <Text style={styles.hint}>
        {t('settings.hint')} <Text style={styles.mono}>http://192.168.1.50:3000</Text>
      </Text>

      <TouchableOpacity style={[styles.btn, styles.btnTest]} onPress={handleTest} disabled={testing}>
        {testing ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.btnTestText}>{t('settings.testConn')}</Text>
        )}
      </TouchableOpacity>

      {status && <Text style={styles.status}>{status}</Text>}

      <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSave}>
        <Text style={styles.btnSaveText}>{t('common.save')}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleUseAuto} style={styles.autoLink}>
        <Text style={styles.autoLinkText}>{t('settings.useAuto')}</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>{t('settings.autoNow')} <Text style={styles.mono}>{auto}</Text></Text>
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 20, fontWeight: '800', color: c.text },
    close: { fontSize: 15, color: c.primary, fontWeight: '600' },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    segment: { flexDirection: 'row', backgroundColor: c.chipBg, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: c.border },
    segmentItem: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
    segmentItemActive: { backgroundColor: c.primary },
    segmentText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
    segmentTextActive: { color: c.primaryText },
    divider: { height: 1, backgroundColor: c.border, marginVertical: 22 },
    label: { fontSize: 13, fontWeight: '700', color: c.textMuted, marginBottom: 8 },
    input: {
      backgroundColor: c.inputBg, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: c.border,
      fontSize: 16, color: c.text,
    },
    hint: { fontSize: 12, color: c.textMuted, marginTop: 8, lineHeight: 18 },
    mono: { fontFamily: 'monospace', color: c.text },
    btn: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 18 },
    btnTest: { backgroundColor: c.primarySoftBg, borderWidth: 1, borderColor: c.primarySoftBorder },
    btnTestText: { color: c.primary, fontWeight: '700', fontSize: 15 },
    btnSave: { backgroundColor: c.primary },
    btnSaveText: { color: c.primaryText, fontWeight: '700', fontSize: 16 },
    status: { marginTop: 14, fontSize: 13, color: c.text, lineHeight: 20, backgroundColor: c.chipBg, padding: 12, borderRadius: 10 },
    autoLink: { marginTop: 22, alignItems: 'center' },
    autoLinkText: { color: c.primary, fontWeight: '600', fontSize: 14 },
  });
