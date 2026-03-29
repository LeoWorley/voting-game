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
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mx-auto mb-8 flex w-full max-w-5xl items-center justify-between">
        <h1 className="text-2xl font-bold">{t('appName')}</h1>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {userId ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <div className="space-x-2">
              <Link className="rounded bg-blue-600 px-4 py-2 text-white" href="/sign-in">
                {t('signIn')}
              </Link>
              <Link className="rounded border border-blue-600 px-4 py-2 text-blue-600" href="/sign-up">
                {t('signUp')}
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h2 className="mb-4 text-2xl font-semibold">{t('homeSignedOutTitle')}</h2>
      </main>
    </div>
  );
}
