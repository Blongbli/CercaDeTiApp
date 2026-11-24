import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sistema de idiomas (i18n) sencillo y sin dependencias. Español por defecto;
// estructurado para añadir más idiomas: solo hay que añadir otra entrada al
// diccionario con las mismas claves.
export type Lang = 'es' | 'en';

export const LANGUAGES: { key: Lang; label: string }[] = [
  { key: 'es', label: '🇪🇸 Español' },
  { key: 'en', label: '🇬🇧 English' },
];

type Dict = Record<string, string>;

const es: Dict = {
  'common.close': 'Cerrar',
  'common.save': 'Guardar',
  'common.clear': 'Limpiar',
  'common.open': 'Abierto',
  'common.closed': 'Cerrado',
  'common.retry': 'Reintentar',

  'home.locating': '📡 Buscando tu ubicación...',
  'home.searchPlaceholder': '¿Qué producto buscas? (ej. auriculares, ratón…)',
  'home.recent': 'Recientes:',
  'home.filters': '🎚️ Filtros',
  'home.type': 'Tipo',
  'home.price': 'Precio',
  'home.sortBy': 'Ordenar por',
  'home.clearFilters': '✕ Limpiar',
  'home.priceFrom': 'o de',
  'home.priceTo': 'a',
  'home.noLimit': 'Sin límite',
  'home.typeOnline': '🌐 Online',
  'home.typeNear': '📍 Cerca de ti',
  'home.foreign': '🌍 Extranjero',
  'home.priceLow': '< 50 €',
  'home.priceMid': '50–150 €',
  'home.priceHigh': '+150 €',
  'home.sortCheap': '💰 Más barato',
  'home.sortExpensive': '💸 Más caro',
  'home.sortNear': '📍 Más cercano',
  'home.sortToday': '⚡ Disponible hoy',
  'home.helpMeChoose': '✨ Ayúdame a elegir',
  'home.reAnalyze': '✨ Volver a analizar',
  'home.recommendation': '✨ Recomendación',
  'home.nearbyStores': '🏬 Dónde comprarlo cerca',
  'home.result': 'resultado',
  'home.results': 'resultados',
  'home.emptySearched': 'No encontramos productos para esa búsqueda. Prueba con otra palabra.',
  'home.emptyInitial': 'Escribe lo que necesitas (ej. "auriculares") y pulsa \'Buscar\' en el teclado.',
  'home.permTitle': 'Permiso denegado',
  'home.permMsg': 'Necesitamos tu ubicación para buscar tiendas cercanas.',
  'home.noConnTitle': 'No se pudo conectar',
  'home.noConnMsg': 'No llegamos al servidor ({url}).\n\nComprueba que está encendido y que la URL en Ajustes (⚙️) es correcta.',
  'home.aiUnavailTitle': 'IA no disponible',
  'home.aiUnavailMsg': 'No se pudo generar la recomendación ahora mismo. Inténtalo de nuevo en un momento.',
  'home.aiNotCfgTitle': 'IA no configurada',
  'home.aiNotCfgMsg': 'El servidor no tiene la IA activada.',

  'card.priceNA': 'Precio no disponible',
  'card.seeOffer': 'Ver oferta →',
  'card.howToGet': 'Cómo llegar',
  'card.inStore': '🏪 En tienda',
  'store.checkStock': 'Ver disponibilidad',
  'tag.best': 'Mejor opción',
  'tag.cheapest': 'Más barato',
  'tag.nearest': 'Más cercano',
  'tag.online': 'Online',
  'tag.near': 'Cerca de ti',

  'detail.store': 'Tienda',
  'detail.type': 'Tipo',
  'detail.distance': 'Distancia',
  'detail.address': 'Dirección',
  'detail.rating': 'Valoración',
  'detail.status': 'Estado',
  'detail.typeOnline': 'Online',
  'detail.typeNear': 'Cerca de ti',
  'detail.warning': '⚠️ La disponibilidad en tienda puede no estar confirmada.',
  'detail.buyOnline': '🛒 Comprar online',
  'detail.viewMaps': '📍 Ver en Google Maps',
  'detail.call': '📞 Llamar a la tienda',
  'detail.saved': '❤️ Guardado',
  'detail.save': '🤍 Guardar',

  'fav.title': '❤️ Favoritos',
  'fav.empty': 'Aún no tienes favoritos. Toca el corazón 🤍 en cualquier producto para guardarlo aquí.',

  'settings.title': 'Ajustes',
  'settings.appearance': 'Apariencia',
  'settings.language': 'Idioma',
  'settings.themeSystem': '⚙️ Sistema',
  'settings.themeLight': '☀️ Claro',
  'settings.themeDark': '🌙 Oscuro',
  'settings.server': 'Servidor',
  'settings.serverUrl': 'URL del servidor',
  'settings.testConn': 'Probar conexión',
  'settings.useAuto': 'Usar detección automática',
  'settings.autoNow': 'Detección automática actual:',
  'settings.hint': 'Escribe la IP de tu servidor Ubuntu seguida de :3000. Por ejemplo:',
  'settings.connectedOk': '✅ Conectado.\nFuentes activas: {sources}',
  'settings.sourcesNone': 'solo catálogo de ejemplo',
  'settings.srcOnline': 'Búsqueda online',
  'settings.srcAI': 'IA',
  'settings.srcStores': 'Tiendas cercanas',
  'settings.connFail': '❌ No se pudo conectar. Revisa la IP, el puerto y que el servidor esté encendido.',
  'settings.autoMsg': 'Se usará la detección automática (servidor en el mismo PC que Metro).',

  'chat.title': '💬 Asistente de compras',
  'chat.subtitle': 'IA · te ayuda a decidir qué comprar',
  'chat.emptyTitle': 'Cuéntame qué buscas',
  'chat.emptyText': 'Descríbeme lo que necesitas y te ayudo a elegir la mejor opción calidad-precio.',
  'chat.inputPlaceholder': 'Escribe tu mensaje…',
  'chat.error': '⚠️ No pude conectar con el asistente. Revisa la conexión al servidor en Ajustes.',
  'chat.s1': 'Busco unos auriculares para correr por menos de 40€',
  'chat.s2': '¿Qué robot aspirador me recomiendas con buena relación calidad-precio?',
  'chat.s3': 'Necesito un regalo tecnológico por unos 50€',
};

const en: Dict = {
  'common.close': 'Close',
  'common.save': 'Save',
  'common.clear': 'Clear',
  'common.open': 'Open',
  'common.closed': 'Closed',
  'common.retry': 'Retry',

  'home.locating': '📡 Finding your location...',
  'home.searchPlaceholder': 'What are you looking for? (e.g. headphones, mouse…)',
  'home.recent': 'Recent:',
  'home.filters': '🎚️ Filters',
  'home.type': 'Type',
  'home.price': 'Price',
  'home.sortBy': 'Sort by',
  'home.clearFilters': '✕ Clear',
  'home.priceFrom': 'or from',
  'home.priceTo': 'to',
  'home.noLimit': 'No limit',
  'home.typeOnline': '🌐 Online',
  'home.typeNear': '📍 Near you',
  'home.foreign': '🌍 Abroad',
  'home.priceLow': '< €50',
  'home.priceMid': '€50–150',
  'home.priceHigh': '+€150',
  'home.sortCheap': '💰 Cheapest',
  'home.sortExpensive': '💸 Priciest',
  'home.sortNear': '📍 Nearest',
  'home.sortToday': '⚡ Available today',
  'home.helpMeChoose': '✨ Help me choose',
  'home.reAnalyze': '✨ Re-analyze',
  'home.recommendation': '✨ Recommendation',
  'home.nearbyStores': '🏬 Where to buy nearby',
  'home.result': 'result',
  'home.results': 'results',
  'home.emptySearched': 'No products found for that search. Try another word.',
  'home.emptyInitial': 'Type what you need (e.g. "headphones") and press \'Search\' on the keyboard.',
  'home.permTitle': 'Permission denied',
  'home.permMsg': 'We need your location to find nearby stores.',
  'home.noConnTitle': 'Could not connect',
  'home.noConnMsg': "We couldn't reach the server ({url}).\n\nCheck it's on and that the URL in Settings (⚙️) is correct.",
  'home.aiUnavailTitle': 'AI unavailable',
  'home.aiUnavailMsg': "Couldn't generate the recommendation right now. Try again in a moment.",
  'home.aiNotCfgTitle': 'AI not configured',
  'home.aiNotCfgMsg': 'The server does not have AI enabled.',

  'card.priceNA': 'Price not available',
  'card.seeOffer': 'See offer →',
  'card.howToGet': 'Directions',
  'card.inStore': '🏪 In store',
  'store.checkStock': 'Check availability',
  'tag.best': 'Best pick',
  'tag.cheapest': 'Cheapest',
  'tag.nearest': 'Nearest',
  'tag.online': 'Online',
  'tag.near': 'Near you',

  'detail.store': 'Store',
  'detail.type': 'Type',
  'detail.distance': 'Distance',
  'detail.address': 'Address',
  'detail.rating': 'Rating',
  'detail.status': 'Status',
  'detail.typeOnline': 'Online',
  'detail.typeNear': 'Near you',
  'detail.warning': '⚠️ In-store availability may not be confirmed.',
  'detail.buyOnline': '🛒 Buy online',
  'detail.viewMaps': '📍 View on Google Maps',
  'detail.call': '📞 Call the store',
  'detail.saved': '❤️ Saved',
  'detail.save': '🤍 Save',

  'fav.title': '❤️ Favorites',
  'fav.empty': "You don't have favorites yet. Tap the heart 🤍 on any product to save it here.",

  'settings.title': 'Settings',
  'settings.appearance': 'Appearance',
  'settings.language': 'Language',
  'settings.themeSystem': '⚙️ System',
  'settings.themeLight': '☀️ Light',
  'settings.themeDark': '🌙 Dark',
  'settings.server': 'Server',
  'settings.serverUrl': 'Server URL',
  'settings.testConn': 'Test connection',
  'settings.useAuto': 'Use auto-detection',
  'settings.autoNow': 'Current auto-detection:',
  'settings.hint': 'Type your Ubuntu server IP followed by :3000. For example:',
  'settings.connectedOk': '✅ Connected.\nActive sources: {sources}',
  'settings.sourcesNone': 'sample catalog only',
  'settings.srcOnline': 'Online search',
  'settings.srcAI': 'AI',
  'settings.srcStores': 'Nearby stores',
  'settings.connFail': "❌ Couldn't connect. Check the IP, the port and that the server is on.",
  'settings.autoMsg': 'Auto-detection will be used (server on the same PC as Metro).',

  'chat.title': '💬 Shopping assistant',
  'chat.subtitle': 'AI · helps you decide what to buy',
  'chat.emptyTitle': 'Tell me what you need',
  'chat.emptyText': 'Describe what you need and I\'ll help you pick the best value option.',
  'chat.inputPlaceholder': 'Type your message…',
  'chat.error': '⚠️ Could not reach the assistant. Check the server connection in Settings.',
  'chat.s1': 'I want running headphones under €40',
  'chat.s2': 'Which robot vacuum do you recommend with good value?',
  'chat.s3': 'I need a tech gift for around €50',
};

const DICTS: Record<Lang, Dict> = { es, en };
const STORAGE_KEY = 'cercadeti.lang';

type I18nCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'es' || v === 'en') setLangState(v);
    });
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  };

  const t = useMemo(() => {
    const dict = DICTS[lang];
    return (key: string, params?: Record<string, string | number>) => {
      let s = dict[key] ?? es[key] ?? key;
      if (params) for (const k of Object.keys(params)) s = s.replace(`{${k}}`, String(params[k]));
      return s;
    };
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n debe usarse dentro de <I18nProvider>');
  return ctx;
}
