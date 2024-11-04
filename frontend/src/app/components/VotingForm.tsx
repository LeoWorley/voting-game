'use client';

import { useState } from 'react';
import { api } from '@/services/api';

type Player = {
  id: string;
  username: string;
};

export default function VotingForm({ players }: { players: Player[] }) {
  const [primaryVote, setPrimaryVote] = useState<string>('');
  const [secondaryVote, setSecondaryVote] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (primaryVote === secondaryVote) {
      setError("You can't vote for the same player twice");
      return;
    }

    try {
      await api.submitVotes(primaryVote, secondaryVote);
      setPrimaryVote('');
      setSecondaryVote('');
      setError('');
    } catch (err) {
      setError('Failed to submit votes. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-200 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">
          Primary Vote (2 points)
        </label>
        <select
          value={primaryVote}
          onChange={(e) => setPrimaryVote(e.target.value)}
          className="w-full p-2 border rounded-md dark:bg-gray-700"
          required
        >
          <option value="">Select a player</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.username}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Secondary Vote (1 point)
        </label>
        <select
          value={secondaryVote}
          onChange={(e) => setSecondaryVote(e.target.value)}
          className="w-full p-2 border rounded-md dark:bg-gray-700"
          required
        >
          <option value="">Select a player</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.username}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
      >
        Submit Votes
      </button>
    </form>
  );
} 