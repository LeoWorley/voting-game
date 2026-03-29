'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useI18n } from '@/i18n/useI18n';

const LAST_ROOM_STORAGE = 'voting-game.last-room-id';

export default function AdminPage() {
  const { t } = useI18n();
  const { userId, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!userId) {
      router.replace('/sign-in');
      return;
    }

    const lastRoomId = window.localStorage.getItem(LAST_ROOM_STORAGE);
    router.replace(lastRoomId ? `/rooms/${lastRoomId}/admin` : '/rooms');
  }, [isLoaded, router, userId]);

  return <div className="p-8 text-gray-700">{t('loading')}</div>;
}
