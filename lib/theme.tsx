import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Paleta semántica: los componentes usan tokens (no colores sueltos), así el
// modo oscuro es coherente en toda la app.
export type TagStyle = { bg: string; fg: string };
export type ThemeColors = {
  bg: string;
  surface: string;
  card: string;
  cardBestBorder: string;
  border: string;
  borderSoft: string;
  inputBg: string;
  text: string;
  textMuted: string;
  textFaint: string;
  brand: string;
  primary: string;
  primaryText: string;
  primarySoftBg: string;
  primarySoftBorder: string;
  accent: string;
  accentSoftBg: string;
  accentSoftText: string;
  accentSoftBorder: string;
  success: string;
  danger: string;
  ratingAmber: string;
  distanceText: string;
  warningText: string;
  warningBg: string;
  chipBg: string;
  chipBorder: string;
  chipText: string;
  price: string;
  tags: Record<string, TagStyle>;
};

const light: ThemeColors = {
  bg: '#f8fafc',
  surface: '#ffffff',
  card: '#ffffff',
  cardBestBorder: '#6366f1',
  border: '#e2e8f0',
  borderSoft: '#eef2f7',
  inputBg: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  textFaint: '#94a3b8',
  brand: '#1e3a8a',
  primary: '#2563eb',
  primaryText: '#ffffff',
  primarySoftBg: '#eff6ff',
  primarySoftBorder: '#bfdbfe',
  accent: '#4f46e5',
  accentSoftBg: '#eef2ff',
  accentSoftText: '#312e81',
  accentSoftBorder: '#c7d2fe',
  success: '#16a34a',
  danger: '#dc2626',
  ratingAmber: '#f59e0b',
  distanceText: '#c2410c',
  warningText: '#92400e',
  warningBg: '#fef3c7',
  chipBg: '#f1f5f9',
  chipBorder: '#e2e8f0',
  chipText: '#475569',
  price: '#16a34a',
  tags: {
    'Mejor opción': { bg: '#e0e7ff', fg: '#4f46e5' },
    'Más barato': { bg: '#dcfce7', fg: '#15803d' },
    'Más cercano': { bg: '#ffedd5', fg: '#c2410c' },
    Online: { bg: '#dbeafe', fg: '#1d4ed8' },
    'Cerca de ti': { bg: '#f1f5f9', fg: '#475569' },
  },
};

const dark: ThemeColors = {
  bg: '#0b1220',
  surface: '#111a2b',
  card: '#131c2e',
  cardBestBorder: '#818cf8',
  border: '#25304a',
  borderSoft: '#1e293b',
  inputBg: '#0f1829',
  text: '#e6ebf4',
  textMuted: '#94a3b8',
  textFaint: '#64748b',
  brand: '#93c5fd',
  primary: '#3b82f6',
  primaryText: '#ffffff',
  primarySoftBg: '#172554',
  primarySoftBorder: '#1e3a8a',
  accent: '#818cf8',
  accentSoftBg: '#1e1b4b',
  accentSoftText: '#c7d2fe',
  accentSoftBorder: '#3730a3',
  success: '#22c55e',
  danger: '#f87171',
  ratingAmber: '#fbbf24',
  distanceText: '#fdba74',
  warningText: '#fde68a',
  warningBg: '#422006',
  chipBg: '#1e293b',
  chipBorder: '#334155',
  chipText: '#cbd5e1',
  price: '#4ade80',
  tags: {
    'Mejor opción': { bg: '#312e81', fg: '#c7d2fe' },
    'Más barato': { bg: '#14532d', fg: '#bbf7d0' },
    'Más cercano': { bg: '#7c2d12', fg: '#fed7aa' },
    Online: { bg: '#1e3a8a', fg: '#bfdbfe' },
    'Cerca de ti': { bg: '#1e293b', fg: '#cbd5e1' },
  },
};

export type ThemeMode = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'cercadeti.themeMode';

type ThemeCtx = {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeCtx>({
  mode: 'system',
  isDark: false,
  colors: light,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
    });
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  };

  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';
  const colors = isDark ? dark : light;

  const value = useMemo(() => ({ mode, isDark, colors, setMode }), [mode, isDark, colors]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeCtx {
  return useContext(ThemeContext);
}
