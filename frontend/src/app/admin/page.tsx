'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { ApiError, api, DetailedVote, SessionHistoryEntry, VotingStatus } from '@/services/api';
import { useI18n } from '@/i18n/useI18n';

const ADMIN_KEY_STORAGE = 'voting-game.admin-api-key';

function defaultDate(offsetHours = 0) {
  const date = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function AdminPage() {
  const { t } = useI18n();
  const { userId, getToken, isLoaded } = useAuth();
  const router = useRouter();

  const [apiKey, setApiKey] = useState('');
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

  useEffect(() => {
    const stored = window.localStorage.getItem(ADMIN_KEY_STORAGE);
    if (stored) {
      setApiKey(stored);
    }
  }, []);

  const getAuthOpts = useCallback(async () => {
    const token = await getToken();
    if (token) {
      return { token };
    }
    return { devUserId: userId || undefined };
  }, [getToken, userId]);

  const refresh = useCallback(async () => {
    if (!userId) {
      return;
    }
    setLoading(true);
    setActionError(null);
    try {
      const authOpts = await getAuthOpts();
      const [nextStatus, nextHistory] = await Promise.all([api.getVotingStatus(authOpts), api.getSessionHistory()]);
      setStatus(nextStatus);
      setHistory(nextHistory.sessions);
      if (!selectedSessionId && nextHistory.sessions.length > 0) {
        setSelectedSessionId(nextHistory.sessions[0].id);
      }
    } catch {
      setActionError(t('statusFetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [getAuthOpts, selectedSessionId, t, userId]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    if (!userId) {
      router.replace('/sign-in');
      return;
    }
    void refresh();
  }, [isLoaded, userId, router, refresh]);

  const adminOpts = useMemo(() => ({ adminApiKey: apiKey }), [apiKey]);

  const activePlayers = useMemo(() => {
    if (!status) {
      return [];
    }
    const players = [...status.eligiblePlayers];
    if (status.me.isActive) {
      players.push({ id: status.me.id, username: status.me.username, imageUrl: '' });
    }
    return players;
  }, [status]);

  const saveApiKey = () => {
    window.localStorage.setItem(ADMIN_KEY_STORAGE, apiKey);
    setActionMessage(t('adminActionSuccess'));
  };

  const runOpenSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);

    try {
      await api.openSession(
        {
          name: sessionName,
          startTime: new Date(sessionStart).toISOString(),
          endTime: new Date(sessionEnd).toISOString(),
        },
        adminOpts
      );
      setActionMessage(t('adminActionSuccess'));
      await refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'FORBIDDEN') {
        setActionError(t('unauthorized'));
      } else {
        setActionError(t('adminActionError'));
      }
    }
  };

  const runCloseSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);

    try {
      await api.closeAndEliminate(
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
        adminOpts
      );
      setActionMessage(t('adminActionSuccess'));
      await refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'TIE_BREAK_REQUIRED') {
        setActionError(t('tieBreakRequired'));
      } else if (error instanceof ApiError && error.code === 'FORBIDDEN') {
        setActionError(t('unauthorized'));
      } else {
        setActionError(t('adminActionError'));
      }
    }
  };

  const loadDetailedResults = async () => {
    if (!selectedSessionId) {
      return;
    }
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await api.getDetailedResults(selectedSessionId, adminOpts);
      setVotes(response.votes);
      setActionMessage(t('adminActionSuccess'));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'FORBIDDEN') {
        setActionError(t('unauthorized'));
      } else {
        setActionError(t('adminActionError'));
      }
    }
  };

  if (!isLoaded || loading) {
    return <div>{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('adminTitle')}</h1>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">{t('adminApiKey')}</h2>
        <p className="mb-3 text-sm text-gray-600">{t('adminApiKeyHelp')}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
            placeholder={t('adminApiKey')}
          />
          <button type="button" onClick={saveApiKey} className="rounded bg-slate-800 px-4 py-2 text-white">
            Save
          </button>
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
        <h2 className="mb-3 text-lg font-semibold">{t('detailedResults')}</h2>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <select value={selectedSessionId} onChange={(event) => setSelectedSessionId(event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
            <option value="">Select session</option>
            {history.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void loadDetailedResults()} className="rounded border border-gray-300 px-4 py-2 text-gray-700">
            {t('loadDetailedResults')}
          </button>
        </div>

        {votes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-gray-500">{t('voter')}</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-gray-500">{t('votedFor')}</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-gray-500">{t('type')}</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-gray-500">{t('reason')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {votes.map((vote) => (
                  <tr key={vote.id}>
                    <td className="px-3 py-2 text-sm text-gray-700">{vote.voter?.username || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">{vote.votedFor?.username || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">{vote.points === 2 ? 'PRIMARY' : 'SECONDARY'}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">{vote.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {actionMessage ? <p className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700">{actionMessage}</p> : null}
      {actionError ? <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{actionError}</p> : null}
    </div>
  );
}
