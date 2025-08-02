import { VotingResult } from '@/services/api';

type VotingResultsProps = {
  results: VotingResult | null;
};

export function VotingResults({ results }: VotingResultsProps) {
  if (!results) {
    return (
      <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <p className="text-gray-600 dark:text-gray-300">Aún no hay resultados de votación disponibles. Vuelve a consultar después de que finalice el período de votación.</p>
      </div>
    );
  }

  const { eliminatedPlayer, votes, votingDate } = results;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Resultados para {new Date(votingDate).toLocaleDateString()}
        </h3>
        {eliminatedPlayer ? (
          <p className="mt-2 text-lg font-semibold text-red-600 dark:text-red-400">
            Jugador Eliminado: {eliminatedPlayer.username}
          </p>
        ) : (
          <p className="mt-2 text-lg font-semibold text-green-600 dark:text-green-400">
            Ningún jugador fue eliminado en esta ronda.
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">Desglose de Votos</h4>
        <div className="align-middle inline-block min-w-full">
          <div className="shadow overflow-hidden border-b border-gray-200 dark:border-gray-700 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Votante</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Votó Por</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo de Voto</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Razón</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {votes.map((vote, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{vote.voter}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{vote.votedFor}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${vote.type === 'PRIMARY' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}>
                        {vote.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 dark:text-gray-400">{vote.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
