'use client';

import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { VotingForm } from '@/components/VotingForm';
import { VotingResults } from '@/components/VotingResults';
import {
  ApiError,
  api,
  LatestResultsResponse,
  RoomDetail,
  SessionHistoryEntry,
  UserVotes,
  VotingStatus,
} from '@/services/api';
import { useI18n } from '@/i18n/useI18n';

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

async function buildAuthOpts(getToken: () => Promise<string | null>, userId: string | null | undefined) {
  const token = await getToken();
  return token ? { token } : { devUserId: userId || undefined };
}

export default function RoomDashboardPage() {
  const { t, locale } = useI18n();
  const { userId, getToken, isLoaded } = useAuth();
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;
  const dateLocale = locale === 'es' ? 'es-ES' : 'en-US';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [status, setStatus] = useState<VotingStatus | null>(null);
  const [latestResults, setLatestResults] = useState<LatestResultsResponse>({ session: null });
  const [history, setHistory] = useState<SessionHistoryEntry[]>([]);
  const [myVotes, setMyVotes] = useState<UserVotes | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!userId || !roomId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const authOpts = await buildAuthOpts(getToken, userId);
      const [nextRoom, nextStatus, nextHistory, nextLatest] = await Promise.all([
        api.getRoom(roomId, authOpts),
        api.getVotingStatus(roomId, authOpts),
        api.getSessionHistory(roomId, authOpts),
        api.getLatestResults(roomId, authOpts),
      ]);

      setRoom(nextRoom);
      setStatus(nextStatus);
      setHistory(nextHistory.sessions);
      setLatestResults(nextLatest);

      if (nextStatus.session?.id && nextStatus.me.isActive) {
        const votes = await api.getMyVotes(roomId, 'current', authOpts);
        setMyVotes(votes);
      } else {
        setMyVotes(null);
      }
    } catch {
      setError(t('roomAccessError'));
    } finally {
      setLoading(false);
    }
  }, [getToken, roomId, t, userId]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!userId) {
      router.replace('/sign-in');
      return;
    }

    void loadDashboard();
  }, [isLoaded, loadDashboard, router, userId]);

  const sessionRange = useMemo(() => {
    if (!status?.session) {
      return '-';
    }
    return `${formatDate(status.session.startTime, dateLocale)} - ${formatDate(status.session.endTime, dateLocale)}`;
  }, [dateLocale, status]);

  const handleLeaveRoom = async () => {
    if (!userId || !roomId) {
      return;
    }

    if (!window.confirm(t('leaveRoomConfirm'))) {
      return;
    }

    setError(null);
    setActionMessage(null);

    try {
      const authOpts = await buildAuthOpts(getToken, userId);
      await api.leaveRoom(roomId, authOpts);
      router.replace('/rooms');
    } catch (nextError) {
      if (nextError instanceof ApiError) {
        setError(nextError.message);
      } else {
        setError(t('roomActionError'));
      }
    }
  };

  if (!isLoaded || loading) {
    return <div className="text-gray-700">{t('loading')}</div>;
  }

  if (error) {
    return <div className="rounded border border-red-300 bg-red-50 p-4 text-red-700">{error}</div>;
  }

  if (!room || !status) {
    return <div className="rounded border border-yellow-300 bg-yellow-50 p-4">{t('roomAccessError')}</div>;
  }

  return (
    <div className="space-y-6">
      {actionMessage ? <div className="rounded border border-green-300 bg-green-50 p-4 text-green-700">{actionMessage}</div> : null}

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{room.name}</h2>
            <p className="mt-2 text-sm text-gray-600">
              {t('roomJoinCode')}: <span className="font-mono font-semibold text-gray-900">{room.joinCode}</span>
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {t('roomMembersLabel')}: {room.members.length} · {t('remainingPlayers')}: {status.stats.remainingPlayers}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">
              {room.role === 'host' ? t('roomRoleHost') : t('roomRoleMember')}
            </span>
            <span className={`rounded px-3 py-2 text-sm font-medium ${room.membershipStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {room.membershipStatus === 'active' ? t('roomStatusActive') : t('roomStatusEliminated')}
            </span>
            <button type="button" onClick={handleLeaveRoom} className="rounded border border-red-300 px-3 py-2 text-sm text-red-700">
              {t('leaveRoom')}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">{t('dashboardTitle')}</h2>
        <p className={`mb-4 text-sm font-medium ${status.me.isActive ? 'text-green-700' : 'text-red-700'}`}>
          {status.me.isActive ? t('dashboardActive') : t('dashboardEliminated')}
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-xs uppercase tracking-wide text-gray-500">{t('activeSession')}</h3>
            <p className="mt-2 text-sm font-semibold text-gray-900">{status.session?.name || '-'}</p>
          </div>
          <div className="rounded border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-xs uppercase tracking-wide text-gray-500">{t('sessionWindow')}</h3>
            <p className="mt-2 text-sm font-semibold text-gray-900">{sessionRange}</p>
          </div>
          <div className="rounded border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-xs uppercase tracking-wide text-gray-500">{t('remainingPlayers')}</h3>
            <p className="mt-2 text-sm font-semibold text-gray-900">{status.stats.remainingPlayers}</p>
          </div>
          <div className="rounded border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-xs uppercase tracking-wide text-gray-500">{t('votingStatus')}</h3>
            <p className="mt-2 text-sm font-semibold text-gray-900">{status.isVotingOpen ? t('votingOpen') : t('votingClosed')}</p>
          </div>
        </div>
      </section>

      {status.session ? (
        status.me.isActive && status.isVotingOpen ? (
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">{t('castVotes')}</h2>
            <VotingForm roomId={roomId} eligiblePlayers={status.eligiblePlayers} initialVotes={myVotes} />
          </section>
        ) : (
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">{t('latestResults')}</h2>
            <VotingResults results={latestResults} />
          </section>
        )
      ) : (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-xl font-semibold">{t('noSessionYet')}</h2>
          <p className="text-sm text-gray-600">{t('waitingForHost')}</p>
        </section>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">{t('roomMembersTitle')}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {room.members.map((member) => (
            <article key={member.id} className="rounded border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {member.username}
                    {member.isCurrentUser ? ' (You)' : ''}
                  </p>
                  <p className="text-sm text-gray-600">
                    {member.role === 'host' ? t('roomRoleHost') : t('roomRoleMember')} · {member.status === 'active' ? t('roomStatusActive') : t('roomStatusEliminated')}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">{t('history')}</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-600">{t('noHistory')}</p>
        ) : (
          <ul className="space-y-2">
            {history.map((session) => (
              <li key={session.id} className="rounded border border-gray-200 bg-gray-50 p-3 text-sm">
                <p className="font-medium text-gray-900">{session.name}</p>
                <p className="text-gray-600">{formatDate(session.startTime, dateLocale)} - {formatDate(session.endTime, dateLocale)}</p>
                <p className="text-gray-700">
                  {session.eliminatedUser ? `${t('eliminatedPlayer')}: ${session.eliminatedUser.username}` : t('noElimination')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
