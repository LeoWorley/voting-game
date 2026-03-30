'use client';

import { useI18n } from '@/i18n/useI18n';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="flex w-full flex-col gap-2 text-sm sm:w-auto sm:flex-row sm:items-center sm:justify-end">
      <span className="text-gray-700">{t('language')}</span>
      <select
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm sm:w-auto sm:min-w-[8.5rem] sm:px-2 sm:py-1"
        value={locale}
        onChange={(event) => setLocale(event.target.value as 'en' | 'es')}
      >
        <option value="en">{t('english')}</option>
        <option value="es">{t('spanish')}</option>
      </select>
    </label>
  );
}
