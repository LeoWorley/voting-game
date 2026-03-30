'use client';

import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppNavbar } from '@/components/AppNavbar';
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
      <AppNavbar
        mode="signedIn"
        afterSignOutUrl="/"
        roomName={room?.name || null}
        navItems={[
          {
            href: '/rooms',
            label: t('navRooms'),
          },
          {
            href: `/rooms/${roomId}`,
            label: t('navDashboard'),
          },
          ...(room?.role === 'host'
            ? [
                {
                  href: `/rooms/${roomId}/admin`,
                  label: t('navAdmin'),
                },
              ]
            : []),
        ]}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
