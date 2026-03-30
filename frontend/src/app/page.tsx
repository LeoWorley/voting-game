'use client';

import Link from 'next/link';
import { UserButton, useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useI18n } from '@/i18n/useI18n';

export default function HomePage() {
  const { t } = useI18n();
  const { userId, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && userId) {
      router.replace('/rooms');
    }
  }, [isLoaded, router, userId]);

  if (!isLoaded || userId) {
    return <div className="p-8 text-gray-700">{t('loading')}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:p-8">
      <header className="mx-auto mb-8 flex w-full max-w-5xl flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="max-w-[10rem] text-4xl font-bold leading-none tracking-tight text-slate-900 sm:max-w-none sm:text-2xl sm:leading-tight">
          {t('appName')}
        </h1>
        <div className="flex w-full flex-col items-stretch gap-4 sm:w-auto sm:min-w-[17rem] sm:items-end">
          <LanguageSwitcher />
          {userId ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded bg-blue-600 px-4 py-2 text-center text-white sm:min-h-0"
                href="/sign-in"
              >
                {t('signIn')}
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded border border-blue-600 px-4 py-2 text-center text-blue-600 sm:min-h-0"
                href="/sign-up"
              >
                {t('signUp')}
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl rounded-lg border border-gray-200 bg-white px-6 py-10 text-center shadow-sm sm:p-8">
        <h2 className="mb-4 text-2xl font-semibold leading-tight sm:text-2xl">{t('homeSignedOutTitle')}</h2>
      </main>
    </div>
  );
}
