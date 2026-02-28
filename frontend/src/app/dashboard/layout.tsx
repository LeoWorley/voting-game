'use client';

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useI18n } from '@/i18n/useI18n';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">{t('appName')}</h1>
            <Link className="text-sm text-gray-600 hover:text-gray-900" href="/">
              {t('navHome')}
            </Link>
            <Link className="text-sm text-gray-600 hover:text-gray-900" href="/dashboard">
              {t('navDashboard')}
            </Link>
            <Link className="text-sm text-gray-600 hover:text-gray-900" href="/admin">
              {t('navAdmin')}
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
