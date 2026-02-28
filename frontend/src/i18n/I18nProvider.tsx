'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { I18nKey, messagesByLocale, SupportedLocale } from './messages';

type I18nContextValue = {
  locale: SupportedLocale;
  setLocale: (nextLocale: SupportedLocale) => void;
  t: (key: I18nKey) => string;
};

const STORAGE_KEY = 'voting-game.locale';
const COOKIE_KEY = 'locale';

const I18nContext = createContext<I18nContextValue | null>(null);

function readLocaleFromCookie(): SupportedLocale | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const value = document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${COOKIE_KEY}=`))
    ?.split('=')[1];

  return value === 'es' ? 'es' : value === 'en' ? 'en' : null;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('en');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const cookieLocale = readLocaleFromCookie();
    if (stored === 'en' || stored === 'es') {
      setLocaleState(stored);
      return;
    }
    if (cookieLocale) {
      setLocaleState(cookieLocale);
    }
  }, []);

  const setLocale = (nextLocale: SupportedLocale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
    document.cookie = `${COOKIE_KEY}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key: I18nKey) => messagesByLocale[locale][key],
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18nContext() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18nContext must be used within I18nProvider');
  }
  return context;
}
