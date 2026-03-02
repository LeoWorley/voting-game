'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { api, LatestResultsResponse, SessionHistoryEntry, UserVotes, VotingStatus } from '@/services/api';
import { VotingForm } from '@/components/VotingForm';
import { VotingResults } from '@/components/VotingResults';
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

export default function DashboardPage() {
  const { userId, getToken, isLoaded } = useAuth();
  const router = useRouter();
  const { t, locale } = useI18n();
  const dateLocale = locale === 'es' ? 'es-ES' : 'en-US';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<VotingStatus | null>(null);
  const [latestResults, setLatestResults] = useState<LatestResultsResponse>({ session: null });
  const [history, setHistory] = useState<SessionHistoryEntry[]>([]);
  const [myVotes, setMyVotes] = useState<UserVotes | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!userId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const authOpts = token ? { token } : { devUserId: userId };

      const [nextStatus, nextHistory, nextLatest] = await Promise.all([
        api.getVotingStatus(authOpts),
        api.getSessionHistory(),
        api.getLatestResults(),
      ]);

      setStatus(nextStatus);
      setHistory(nextHistory.sessions);
      setLatestResults(nextLatest);

      if (nextStatus.session?.id && nextStatus.me.isActive) {
        const votes = await api.getMyVotes('current', authOpts);
        setMyVotes(votes);
      } else {
        setMyVotes(null);
      }
    } catch {
      setError(t('statusFetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [getToken, t, userId]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!userId) {
      router.replace('/sign-in');
      return;
    }

    void loadDashboard();
  }, [isLoaded, userId, router, loadDashboard]);

  const sessionRange = useMemo(() => {
    if (!status?.session) {
      return '-';
    }
    return `${formatDate(status.session.startTime, dateLocale)} - ${formatDate(status.session.endTime, dateLocale)}`;
  }, [status, dateLocale]);

  if (!isLoaded || loading) {
    return <div className="text-gray-700">{t('loading')}</div>;
  }

  if (error) {
    return <div className="rounded border border-red-300 bg-red-50 p-4 text-red-700">{error}</div>;
  }

  if (!status) {
    return <div className="rounded border border-yellow-300 bg-yellow-50 p-4">{t('statusFetchFailed')}</div>;
  }

  return (
    <div className="space-y-6">
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

      {status.me.isActive && status.isVotingOpen ? (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">{t('castVotes')}</h2>
          <VotingForm eligiblePlayers={status.eligiblePlayers} initialVotes={myVotes} />
        </section>
      ) : (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">{t('latestResults')}</h2>
          <VotingResults results={latestResults} />
        </section>
      )}

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
