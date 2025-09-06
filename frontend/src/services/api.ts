export type Player = {
  id: string;
  username: string;
};

type VotingStatus = {
  isVotingDay: boolean;
  nextVotingDate: Date;
  isPlayerActive: boolean;
  remainingPlayers: number;
  eligiblePlayers: Player[];
};

type VoteDetail = {
  voter: string;
  votedFor: string;
  reason: string;
  type: 'PRIMARY' | 'SECONDARY';
}

export type VotingResult = {
  eliminatedPlayer: {
    username: string;
  } | null;
  votes: VoteDetail[];
  votingDate: Date;
};

type VotePayload = {
  userId: string;
  reason: string;
};

const url = process.env.NEXT_PUBLIC_API_BASE_URL || 5050;

type AuthOpts = { devUserId?: string; token?: string };

function buildHeaders(base?: Record<string, string>, opts?: AuthOpts): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(base || {})
  };
  if (opts?.token) {
    headers['Authorization'] = `Bearer ${opts.token}`;
  } else if (opts?.devUserId) {
    headers['X-Dev-User-Id'] = opts.devUserId;
  }
  return headers;
}

export const api = {
  async getVotingStatus(opts?: AuthOpts): Promise<VotingStatus> {
    const response = await fetch(`${url}/api/voting/status`, {
      headers: buildHeaders(undefined, opts)
    });
    if (!response.ok) {
      throw new Error('Failed to fetch voting status');
    }
    const data = await response.json();
    return {
      ...data,
      nextVotingDate: new Date(data.nextVotingDate)
    };
  },

  async submitVotes(primaryVote: VotePayload, secondaryVote: VotePayload, opts?: AuthOpts): Promise<void> {
    const response = await fetch(`${url}/api/votes`, {
      method: 'POST',
      headers: buildHeaders(undefined, opts),
      body: JSON.stringify({
        primaryVote,
        secondaryVote,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Failed to submit votes' }));
      throw new Error(errorBody.message || 'Failed to submit votes');
    }
  },

  async getLatestResults(): Promise<VotingResult | null> {
    const response = await fetch(`${url}/api/results/latest`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch latest results');
    }
    const data = await response.json();
    return {
        ...data,
        votingDate: new Date(data.votingDate)
    };
  }
};
