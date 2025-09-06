"use client";

import { useState } from 'react';
import { api, Player } from '@/services/api';
import { useAuth } from "@clerk/nextjs";

type VotingFormProps = {
  eligiblePlayers: Player[];
};

export function VotingForm({ eligiblePlayers }: VotingFormProps) {
  const { userId } = useAuth();
  const [primaryVote, setPrimaryVote] = useState('');
  const [primaryReason, setPrimaryReason] = useState('');
  const [secondaryVote, setSecondaryVote] = useState('');
  const [secondaryReason, setSecondaryReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryVote || !secondaryVote) {
      setError('Debes seleccionar un jugador para ambos votos, primario y secundario.');
      return;
    }
    if (primaryVote === secondaryVote) {
      setError('Los votos primario y secundario deben ser para jugadores diferentes.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      await api.submitVotes(
        { userId: primaryVote, reason: primaryReason },
        { userId: secondaryVote, reason: secondaryReason },
        { devUserId: userId || undefined }
      );
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center p-4 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 rounded-lg">
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">¡Voto Enviado Exitosamente!</h3>
        <p className="text-green-700 dark:text-green-300">Gracias por participar. Los resultados estarán disponibles cuando termine el período de votación.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Primary Vote Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Voto Primario</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Este voto tiene más peso en el proceso de eliminación.</p>
        <div>
          <label htmlFor="primaryVote" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Jugador por quien votar
          </label>
          <select
            id="primaryVote"
            name="primaryVote"
            value={primaryVote}
            onChange={(e) => setPrimaryVote(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            required
          >
            <option value="" disabled>Selecciona un jugador</option>
            {eligiblePlayers.map((player) => (
              <option key={player.id} value={player.id}>{player.username}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="primaryReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Razón (opcional)
          </label>
          <textarea
            id="primaryReason"
            name="primaryReason"
            rows={3}
            value={primaryReason}
            onChange={(e) => setPrimaryReason(e.target.value)}
            className="mt-1 shadow-sm block w-full focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
          />
        </div>
      </div>

      {/* Secondary Vote Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Voto Secundario</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Este voto se usa como desempate.</p>
        <div>
          <label htmlFor="secondaryVote" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Jugador por quien votar
          </label>
          <select
            id="secondaryVote"
            name="secondaryVote"
            value={secondaryVote}
            onChange={(e) => setSecondaryVote(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            required
          >
            <option value="" disabled>Selecciona un jugador</option>
            {eligiblePlayers.map((player) => (
              <option key={player.id} value={player.id}>{player.username}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="secondaryReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Razón (opcional)
          </label>
          <textarea
            id="secondaryReason"
            name="secondaryReason"
            rows={3}
            value={secondaryReason}
            onChange={(e) => setSecondaryReason(e.target.value)}
            className="mt-1 shadow-sm block w-full focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      
      <div className="pt-5">
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Votos'}
          </button>
        </div>
      </div>
    </form>
  );
}
