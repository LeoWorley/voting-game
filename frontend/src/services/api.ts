type GameStatus = {
  isVotingDay: boolean;
  nextVotingDate: Date;
  isPlayerActive: boolean;
  remainingPlayers: number;
};

export const api = {
  async getGameStatus(): Promise<GameStatus> {
    const response = await fetch('/api/game-status');
    if (!response.ok) {
      throw new Error('Failed to fetch game status');
    }
    const data = await response.json();
    return {
      ...data,
      nextVotingDate: new Date(data.nextVotingDate)
    };
  },

  async submitVotes(primaryVote: string, secondaryVote: string): Promise<void> {
    const response = await fetch('/api/votes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        primaryVote,
        secondaryVote,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit votes');
    }
  }
}; 