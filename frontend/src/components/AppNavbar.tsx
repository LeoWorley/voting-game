'use client';

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useI18n } from '@/i18n/useI18n';

type NavItem = {
  href: string;
  label: string;
};

type AppNavbarProps = {
  mode: 'signedOut' | 'signedIn';
  navItems?: NavItem[];
  roomName?: string | null;
  showGuestCtas?: boolean;
  afterSignOutUrl?: string;
};

function BrandLink({ hero = false }: { hero?: boolean }) {
  const { t } = useI18n();

  return (
    <Link
      href="/"
      className={`font-bold tracking-tight text-slate-900 transition-colors hover:text-slate-700 ${
        hero ? 'max-w-[10rem] text-4xl leading-none sm:max-w-none sm:text-2xl sm:leading-tight' : 'text-xl leading-tight'
      }`}
    >
      {t('appName')}
    </Link>
  );
}

function MobileMenuButton({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      aria-expanded={isOpen}
      aria-label={isOpen ? t('closeMenu') : t('openMenu')}
      onClick={onClick}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
    >
      <span className="sr-only">{isOpen ? t('closeMenu') : t('openMenu')}</span>
      <span className="relative block h-4 w-5">
        <span
          className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition ${
            isOpen ? 'translate-y-[7px] rotate-45' : ''
          }`}
        />
        <span
          className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition ${
            isOpen ? 'opacity-0' : ''
          }`}
        />
        <span
          className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current transition ${
            isOpen ? '-translate-y-[7px] -rotate-45' : ''
          }`}
        />
      </span>
    </button>
  );
}

export function AppNavbar({
  mode,
  navItems = [],
  roomName = null,
  showGuestCtas = false,
  afterSignOutUrl = '/',
}: AppNavbarProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const signedIn = mode === 'signedIn';

  if (!signedIn) {
    return (
      <header className="border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8">
          <BrandLink hero />

          <div className="flex w-full flex-col items-stretch gap-4 sm:w-auto sm:min-w-[17rem] sm:items-end">
            <LanguageSwitcher />
            {showGuestCtas ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                  href="/sign-in"
                >
                  {t('signIn')}
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-blue-200 bg-white px-5 py-2.5 text-center text-sm font-medium text-blue-700 transition hover:border-blue-300 hover:text-blue-800"
                  href="/sign-up"
                >
                  {t('signUp')}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[4.5rem] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <BrandLink />

            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            {roomName ? (
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                <span className="mr-2 text-slate-400">{t('currentRoom')}</span>
                <span className="font-medium text-slate-900">{roomName}</span>
              </div>
            ) : null}
            <LanguageSwitcher />
            <UserButton afterSignOutUrl={afterSignOutUrl} />
          </div>

          <div className="flex items-center md:hidden">
            <MobileMenuButton
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((current) => !current)}
            />
          </div>
        </div>

        {isMobileMenuOpen ? (
          <div className="border-t border-slate-200 py-4 md:hidden">
            <div className="space-y-4">
              {roomName ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                    {t('currentRoom')}
                  </div>
                  <div className="font-semibold text-slate-900">{roomName}</div>
                </div>
              ) : null}

              <nav className="flex flex-col gap-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <LanguageSwitcher />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <UserButton afterSignOutUrl={afterSignOutUrl} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
