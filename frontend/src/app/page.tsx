'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppNavbar } from '@/components/AppNavbar';
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
    <div className="min-h-screen bg-gray-50">
      <AppNavbar mode="signedOut" showGuestCtas />

      <main className="mx-auto mt-8 max-w-3xl rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm sm:mt-10 sm:p-8">
        <h2 className="mb-4 text-2xl font-semibold leading-tight">{t('homeSignedOutTitle')}</h2>
      </main>
    </div>
  );
}
