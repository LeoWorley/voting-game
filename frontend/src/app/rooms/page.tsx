'use client';

import Link from 'next/link';
import { UserButton, useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ApiError, api, RoomSummary } from '@/services/api';
import { useI18n } from '@/i18n/useI18n';

async function buildAuthOpts(getToken: () => Promise<string | null>, userId: string | null | undefined) {
  const token = await getToken();
  return token ? { token } : { devUserId: userId || undefined };
}

export default function RoomsPage() {
  const { t } = useI18n();
  const { userId, getToken, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const refresh = useCallback(async () => {
    if (!userId) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const authOpts = await buildAuthOpts(getToken, userId);
      await api.ensureCurrentUser(
        {
          username: user?.username || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || userId,
          imageUrl: user?.imageUrl || '',
        },
        authOpts
      );
      const response = await api.getMyRooms(authOpts);
      setRooms(response.rooms);
    } catch (nextError) {
      if (nextError instanceof ApiError) {
        setError(nextError.message || t('userEnsureFailed'));
      } else {
        setError(t('roomActionError'));
      }
    } finally {
      setLoading(false);
    }
  }, [getToken, t, user, userId]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    if (!userId) {
      router.replace('/sign-in');
      return;
    }
    void refresh();
  }, [isLoaded, refresh, router, userId]);

  const handleCreateRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      return;
    }

    setError(null);
    setActionMessage(null);
    try {
      const authOpts = await buildAuthOpts(getToken, userId);
      const response = await api.createRoom({ name: roomName }, authOpts);
      setActionMessage(t('roomActionSuccess'));
      setRoomName('');
      await refresh();
      router.push(`/rooms/${response.room.id}`);
    } catch (nextError) {
      if (nextError instanceof ApiError) {
        setError(nextError.message);
      } else {
        setError(t('roomActionError'));
      }
    }
  };

  const handleJoinRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      return;
    }

    setError(null);
    setActionMessage(null);
    try {
      const authOpts = await buildAuthOpts(getToken, userId);
      const response = await api.joinRoom(joinCode.toUpperCase(), authOpts);
      setActionMessage(t('roomActionSuccess'));
      setJoinCode('');
      await refresh();
      router.push(`/rooms/${response.room.id}`);
    } catch (nextError) {
      if (nextError instanceof ApiError) {
        setError(nextError.message);
      } else {
        setError(t('roomActionError'));
      }
    }
  };

  if (!isLoaded || loading) {
    return <div className="p-8 text-gray-700">{t('loading')}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">{t('appName')}</h1>
            <Link className="text-sm text-gray-600 hover:text-gray-900" href="/rooms">
              {t('navRooms')}
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">{t('roomsTitle')}</h2>
          <p className="mt-2 text-sm text-gray-600">{t('roomsSubtitle')}</p>
        </section>

        {error ? <div className="mb-4 rounded border border-red-300 bg-red-50 p-4 text-red-700">{error}</div> : null}
        {actionMessage ? <div className="mb-4 rounded border border-green-300 bg-green-50 p-4 text-green-700">{actionMessage}</div> : null}

        <section className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={handleCreateRoom} className="space-y-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">{t('createRoomTitle')}</h3>
            <input
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
              placeholder={t('roomName')}
            />
            <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-white">
              {t('createRoomSubmit')}
            </button>
          </form>

          <form onSubmit={handleJoinRoom} className="space-y-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">{t('joinRoomTitle')}</h3>
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              className="w-full rounded border border-gray-300 px-3 py-2 uppercase"
              placeholder={t('roomCode')}
              maxLength={6}
            />
            <button type="submit" className="rounded bg-slate-800 px-4 py-2 text-white">
              {t('joinRoomSubmit')}
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">{t('joinedRooms')}</h3>
          {rooms.length === 0 ? (
            <p className="text-sm text-gray-600">{t('noRooms')}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rooms.map((room) => (
                <article key={room.id} className="rounded border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{room.name}</h4>
                      <p className="text-sm text-gray-600">{t('roomJoinCode')}: <span className="font-mono">{room.joinCode}</span></p>
                    </div>
                    <span className="rounded bg-white px-2 py-1 text-xs font-medium text-gray-700">
                      {room.role === 'host' ? t('roomRoleHost') : t('roomRoleMember')}
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-3 gap-2 text-sm text-gray-600">
                    <div>
                      <dt>{t('roomMembersLabel')}</dt>
                      <dd className="font-semibold text-gray-900">{room.memberCount}</dd>
                    </div>
                    <div>
                      <dt>{t('remainingPlayers')}</dt>
                      <dd className="font-semibold text-gray-900">{room.activeMemberCount}</dd>
                    </div>
                    <div>
                      <dt>{t('roomHostsLabel')}</dt>
                      <dd className="font-semibold text-gray-900">{room.hostCount}</dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    onClick={() => router.push(`/rooms/${room.id}`)}
                    className="mt-4 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white"
                  >
                    {t('enterRoom')}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
