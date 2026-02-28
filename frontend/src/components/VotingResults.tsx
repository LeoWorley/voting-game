'use client';

import { LatestResultsResponse } from '@/services/api';
import { useI18n } from '@/i18n/useI18n';

type VotingResultsProps = {
  results: LatestResultsResponse;
};

export function VotingResults({ results }: VotingResultsProps) {
  const { t } = useI18n();

  if (!results.session) {
    return <p className="text-sm text-gray-600">{t('noResults')}</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-600">
          {t('resultsDate')}: {results.session.name}
        </p>
        {results.session.eliminatedUser ? (
          <p className="text-lg font-semibold text-red-700">
            {t('eliminatedPlayer')}: {results.session.eliminatedUser.username}
          </p>
        ) : (
          <p className="text-lg font-semibold text-green-700">{t('noElimination')}</p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 rounded border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-gray-500">Player</th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-gray-500">{t('primaryVotes')}</th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-gray-500">{t('secondaryVotes')}</th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-gray-500">{t('points')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {results.session.scoreboard.map((row) => (
              <tr key={row.userId}>
                <td className="px-3 py-2 text-sm text-gray-900">{row.username}</td>
                <td className="px-3 py-2 text-sm text-gray-600">{row.primaryVotes}</td>
                <td className="px-3 py-2 text-sm text-gray-600">{row.secondaryVotes}</td>
                <td className="px-3 py-2 text-sm font-semibold text-gray-900">{row.totalPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
