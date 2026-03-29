'use client';

import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, api, DetailedVote, RoomDetail, SessionHistoryEntry, VotingStatus } from '@/services/api';
import { useI18n } from '@/i18n/useI18n';

function defaultDate(offsetHours = 0) {
  const date = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

async function buildAuthOpts(getToken: () => Promise<string | null>, userId: string | null | undefined) {
  const token = await getToken();
  return token ? { token } : { devUserId: userId || undefined };
}

export default function RoomAdminPage() {
  const { t } = useI18n();
  const { userId, getToken, isLoaded } = useAuth();
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [status, setStatus] = useState<VotingStatus | null>(null);
  const [history, setHistory] = useState<SessionHistoryEntry[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [votes, setVotes] = useState<DetailedVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [sessionName, setSessionName] = useState('Weekly Session');
  const [sessionStart, setSessionStart] = useState(defaultDate(1));
  const [sessionEnd, setSessionEnd] = useState(defaultDate(24));
  const [manualTieBreakUserId, setManualTieBreakUserId] = useState('');
  const [openNextSession, setOpenNextSession] = useState(false);
  const [nextSessionName, setNextSessionName] = useState('Next Weekly Session');
  const [nextSessionStart, setNextSessionStart] = useState(defaultDate(168));
  const [nextSessionEnd, setNextSessionEnd] = useState(defaultDate(192));

  const refresh = useCallback(async () => {
    if (!userId || !roomId) {
      return;
    }

    setLoading(true);
    setActionError(null);

    try {
      const authOpts = await buildAuthOpts(getToken, userId);
      const [nextRoom, nextStatus, nextHistory] = await Promise.all([
        api.getRoom(roomId, authOpts),
        api.getVotingStatus(roomId, authOpts),
        api.getSessionHistory(roomId, authOpts),
      ]);

      if (nextRoom.role !== 'host') {
        router.replace(`/rooms/${roomId}`);
        return;
      }

      setRoom(nextRoom);
      setStatus(nextStatus);
      setHistory(nextHistory.sessions);
      if (!selectedSessionId && nextHistory.sessions.length > 0) {
        setSelectedSessionId(nextHistory.sessions[0].id);
      }
    } catch (error) {
      if (error instanceof ApiError && (error.code === 'FORBIDDEN' || error.code === 'ROOM_ACCESS_DENIED')) {
        router.replace(`/rooms/${roomId}`);
      } else {
        setActionError(t('roomAccessError'));
      }
    } finally {
      setLoading(false);
    }
  }, [getToken, roomId, router, selectedSessionId, t, userId]);

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

  const activePlayers = useMemo(() => {
    if (!room) {
      return [];
    }
    return room.members.filter((member) => member.status === 'active');
  }, [room]);

  const runOpenSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId || !roomId) {
      return;
    }

    setActionError(null);
    setActionMessage(null);

    try {
      const authOpts = await buildAuthOpts(getToken, userId);
      await api.openSession(
        roomId,
        {
          name: sessionName,
          startTime: new Date(sessionStart).toISOString(),
          endTime: new Date(sessionEnd).toISOString(),
        },
        authOpts
      );
      setActionMessage(t('adminActionSuccess'));
      await refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError(t('adminActionError'));
      }
    }
  };

  const runCloseSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId || !roomId) {
      return;
    }

    setActionError(null);
    setActionMessage(null);

    try {
      const authOpts = await buildAuthOpts(getToken, userId);
      await api.closeAndEliminate(
        roomId,
        {
          manualTieBreakUserId: manualTieBreakUserId || undefined,
          openNextSession,
          nextSession: openNextSession
            ? {
                name: nextSessionName,
                startTime: new Date(nextSessionStart).toISOString(),
                endTime: new Date(nextSessionEnd).toISOString(),
              }
            : undefined,
        },
        authOpts
      );
      setActionMessage(t('adminActionSuccess'));
      await refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError(t('adminActionError'));
      }
    }
  };

  const loadDetailedResults = async () => {
    if (!selectedSessionId || !userId || !roomId) {
      return;
    }

    setActionError(null);
    setActionMessage(null);

    try {
      const authOpts = await buildAuthOpts(getToken, userId);
      const response = await api.getDetailedResults(roomId, selectedSessionId, authOpts);
      setVotes(response.votes);
      setActionMessage(t('adminActionSuccess'));
    } catch (error) {
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError(t('adminActionError'));
      }
    }
  };

  const handleRoleChange = async (targetUserId: string, role: 'host' | 'member') => {
    if (!userId || !roomId) {
      return;
    }

    setActionError(null);
    setActionMessage(null);

    try {
      const authOpts = await buildAuthOpts(getToken, userId);
      await api.updateRoomMemberRole(roomId, targetUserId, role, authOpts);
      setActionMessage(t('adminActionSuccess'));
      await refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError(t('adminActionError'));
      }
    }
  };

  if (!isLoaded || loading) {
    return <div>{t('loading')}</div>;
  }

  if (!room || !status) {
    return <div className="rounded border border-red-300 bg-red-50 p-4 text-red-700">{t('roomAccessError')}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">{t('adminTitle')}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {t('roomJoinCode')}: <span className="font-mono font-semibold text-gray-900">{room.joinCode}</span>
        </p>
      </section>

      {actionError ? <div className="rounded border border-red-300 bg-red-50 p-4 text-red-700">{actionError}</div> : null}
      {actionMessage ? <div className="rounded border border-green-300 bg-green-50 p-4 text-green-700">{actionMessage}</div> : null}

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t('roomOverview')}</h2>
            <p className="text-sm text-gray-600">
              {t('remainingPlayers')}: {status.stats.remainingPlayers} · {t('roomMembersLabel')}: {room.members.length}
            </p>
          </div>
          <button type="button" onClick={() => void refresh()} className="rounded border border-gray-300 px-4 py-2 text-gray-700">
            {t('adminRefresh')}
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={runOpenSession} className="space-y-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">{t('adminOpenSession')}</h2>
          <input value={sessionName} onChange={(event) => setSessionName(event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" placeholder={t('sessionName')} />
          <label className="block text-sm text-gray-700">{t('sessionStart')}</label>
          <input type="datetime-local" value={sessionStart} onChange={(event) => setSessionStart(event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" required />
          <label className="block text-sm text-gray-700">{t('sessionEnd')}</label>
          <input type="datetime-local" value={sessionEnd} onChange={(event) => setSessionEnd(event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" required />
          <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-white">{t('openSessionSubmit')}</button>
        </form>

        <form onSubmit={runCloseSession} className="space-y-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">{t('adminCloseSession')}</h2>

          <label className="block text-sm text-gray-700">{t('manualTieBreak')}</label>
          <select value={manualTieBreakUserId} onChange={(event) => setManualTieBreakUserId(event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
            <option value="">-</option>
            {activePlayers.map((player) => (
              <option value={player.id} key={player.id}>
                {player.username}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={openNextSession} onChange={(event) => setOpenNextSession(event.target.checked)} />
            {t('openNextSession')}
          </label>

          {openNextSession ? (
            <div className="space-y-3 rounded border border-gray-200 p-3">
              <input
                value={nextSessionName}
                onChange={(event) => setNextSessionName(event.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
                placeholder={t('nextSessionName')}
              />
              <label className="block text-sm text-gray-700">{t('nextSessionStart')}</label>
              <input type="datetime-local" value={nextSessionStart} onChange={(event) => setNextSessionStart(event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" required={openNextSession} />
              <label className="block text-sm text-gray-700">{t('nextSessionEnd')}</label>
              <input type="datetime-local" value={nextSessionEnd} onChange={(event) => setNextSessionEnd(event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" required={openNextSession} />
            </div>
          ) : null}

          <button type="submit" className="rounded bg-rose-700 px-4 py-2 text-white">{t('closeSessionSubmit')}</button>
        </form>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">{t('hostManagement')}</h2>
        <div className="space-y-3">
          {room.members.map((member) => (
            <div key={member.id} className="flex flex-col gap-3 rounded border border-gray-200 bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {member.username}
                  {member.isCurrentUser ? ' (You)' : ''}
                </p>
                <p className="text-sm text-gray-600">
                  {member.role === 'host' ? t('roomRoleHost') : t('roomRoleMember')} · {member.status === 'active' ? t('roomStatusActive') : t('roomStatusEliminated')}
                </p>
              </div>

              {!member.isCurrentUser ? (
                member.role === 'host' ? (
                  <button type="button" onClick={() => void handleRoleChange(member.id, 'member')} className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700">
                    {t('demoteToMember')}
                  </button>
                ) : (
                  <button type="button" onClick={() => void handleRoleChange(member.id, 'host')} className="rounded bg-slate-800 px-3 py-2 text-sm text-white">
                    {t('promoteToHost')}
                  </button>
                )
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">{t('detailedResults')}</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select value={selectedSessionId} onChange={(event) => setSelectedSessionId(event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
            <option value="">{t('history')}</option>
            {history.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void loadDetailedResults()} className="rounded bg-slate-800 px-4 py-2 text-white">
            {t('loadDetailedResults')}
          </button>
        </div>

        {votes.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 rounded border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-gray-500">{t('voter')}</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-gray-500">{t('votedFor')}</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-gray-500">{t('type')}</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-gray-500">{t('points')}</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-gray-500">{t('reason')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {votes.map((vote) => (
                  <tr key={vote.id}>
                    <td className="px-3 py-2 text-sm text-gray-900">{vote.voter?.username || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{vote.votedFor?.username || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{vote.points === 2 ? t('votePrimaryTitle') : t('voteSecondaryTitle')}</td>
                    <td className="px-3 py-2 text-sm font-semibold text-gray-900">{vote.points}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{vote.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
