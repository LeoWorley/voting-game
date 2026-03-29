'use client';

import Link from 'next/link';
import { UserButton, useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { api, RoomDetail } from '@/services/api';
import { useI18n } from '@/i18n/useI18n';

const LAST_ROOM_STORAGE = 'voting-game.last-room-id';

async function buildAuthOpts(getToken: () => Promise<string | null>, userId: string | null | undefined) {
  const token = await getToken();
  return token ? { token } : { devUserId: userId || undefined };
}

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { userId, getToken, isLoaded } = useAuth();
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    window.localStorage.setItem(LAST_ROOM_STORAGE, roomId);
  }, [roomId]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!userId || !roomId) {
      router.replace('/rooms');
      return;
    }

    let cancelled = false;

    async function loadRoom() {
      setLoading(true);
      try {
        const authOpts = await buildAuthOpts(getToken, userId);
        const nextRoom = await api.getRoom(roomId, authOpts);
        if (!cancelled) {
          setRoom(nextRoom);
        }
      } catch {
        if (!cancelled) {
          router.replace('/rooms');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRoom();

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, roomId, router, userId]);

  if (!isLoaded || loading) {
    return <div className="p-8 text-gray-700">{t('loading')}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">{t('appName')}</h1>
            <Link className="text-sm text-gray-600 hover:text-gray-900" href="/rooms">
              {t('navRooms')}
            </Link>
            <Link className="text-sm text-gray-600 hover:text-gray-900" href={`/rooms/${roomId}`}>
              {t('navDashboard')}
            </Link>
            {room?.role === 'host' ? (
              <Link className="text-sm text-gray-600 hover:text-gray-900" href={`/rooms/${roomId}/admin`}>
                {t('navAdmin')}
              </Link>
            ) : null}
          </div>
          <div className="flex items-center gap-4">
            {room ? <span className="hidden text-sm text-gray-500 md:inline">{room.name}</span> : null}
            <LanguageSwitcher />
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
