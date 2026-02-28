'use client';

import { useI18n } from '@/i18n/useI18n';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-gray-700">{t('language')}</span>
      <select
        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
        value={locale}
        onChange={(event) => setLocale(event.target.value as 'en' | 'es')}
      >
        <option value="en">{t('english')}</option>
        <option value="es">{t('spanish')}</option>
      </select>
    </label>
  );
}
