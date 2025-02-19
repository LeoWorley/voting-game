import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { api } from '@/services/api';

export default async function Dashboard() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const gameStatus = await api.getGameStatus();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Game Status</h2>
        
        {gameStatus.isPlayerActive ? (
          <div className="text-green-600 dark:text-green-400 mb-4">
            You are still in the game!
          </div>
        ) : (
          <div className="text-red-600 dark:text-red-400 mb-4">
            You have been eliminated from the game.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Next Voting Day
            </h3>
            <p className="mt-1 text-lg font-semibold">
              {gameStatus.nextVotingDate.toLocaleDateString()}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Remaining Players
            </h3>
            <p className="mt-1 text-lg font-semibold">
              {gameStatus.remainingPlayers}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Voting Status
            </h3>
            <p className="mt-1 text-lg font-semibold">
              {gameStatus.isVotingDay ? 'Voting is OPEN' : 'Voting is CLOSED'}
            </p>
          </div>
        </div>
      </div>

      {gameStatus.isVotingDay && gameStatus.isPlayerActive && (
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Cast Your Votes</h2>
          {/* We'll add the voting component here later */}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Game History</h2>
        {/* We'll add the history component here later */}
      </div>
    </div>
  );
} 