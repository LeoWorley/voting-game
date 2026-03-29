export type Locale = 'en' | 'es';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type AuthOpts = {
  devUserId?: string;
  token?: string;
};

export type Player = {
  id: string;
  username: string;
  imageUrl: string;
};

export type RoomSummary = {
  id: string;
  name: string;
  joinCode: string;
  role: 'host' | 'member';
  membershipStatus: 'active' | 'eliminated';
  memberCount: number;
  activeMemberCount: number;
  hostCount: number;
  activeSession: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
  } | null;
};

export type RoomMemberSummary = {
  id: string;
  username: string;
  imageUrl: string;
  role: 'host' | 'member';
  status: 'active' | 'eliminated';
  isCurrentUser: boolean;
};

export type RoomDetail = {
  id: string;
  name: string;
  joinCode: string;
  role: 'host' | 'member';
  membershipStatus: 'active' | 'eliminated';
  activeSession: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
  } | null;
  members: RoomMemberSummary[];
};

export type VotingStatus = {
  isVotingOpen: boolean;
  session: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  } | null;
  eligiblePlayers: Player[];
  me: {
    id: string;
    clerkId: string;
    username: string;
    isActive: boolean;
    role: 'host' | 'member';
  };
  stats: {
    remainingPlayers: number;
  };
};

export type UserVotes = {
  sessionId: string | null;
  primaryVote: {
    targetUserId: string;
    reason: string;
    updatedAt: string;
  } | null;
  secondaryVote: {
    targetUserId: string;
    reason: string;
    updatedAt: string;
  } | null;
};

export type ScoreboardRow = {
  userId: string;
  username: string;
  imageUrl: string;
  primaryVotes: number;
  secondaryVotes: number;
  totalPoints: number;
};

export type SessionSummary = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  eliminatedUser: {
    id: string;
    username: string;
    imageUrl: string;
  } | null;
  scoreboard: ScoreboardRow[];
};

export type LatestResultsResponse = {
  session: SessionSummary | null;
};

export type SessionHistoryEntry = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  eliminatedUser: {
    id: string;
    username: string;
    imageUrl: string;
  } | null;
};

export type AggregateResultsResponse = {
  session: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
    eliminatedUser: string | null;
  };
  scoreboard: ScoreboardRow[];
};

export type DetailedVote = {
  id: string;
  sessionId: string;
  points: number;
  reason: string;
  voter: {
    id: string;
    username: string;
    imageUrl: string;
  } | null;
  votedFor: {
    id: string;
    username: string;
    imageUrl: string;
  } | null;
};

export type CloseSessionResponse = {
  code: string;
  message: string;
  session: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
  };
  eliminatedUser: {
    id: string;
    username: string;
    imageUrl: string;
  } | null;
  tieBreak: {
    eliminatedUserId: string;
    method: string;
    tiedUserIds: string[];
  };
  scoreboard: ScoreboardRow[];
  nextSession: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
  } | null;
};

const devUserOverride = process.env.NEXT_PUBLIC_DEV_USER_ID;

function resolveApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configured) {
    return configured.endsWith('/') ? configured.slice(0, -1) : configured;
  }

  if (typeof window === 'undefined') {
    return process.env.INTERNAL_API_BASE_URL || 'http://localhost:5050';
  }

  return '';
}

function buildHeaders(base?: Record<string, string>, opts?: AuthOpts): HeadersInit {
  const headers: Record<string, string> = {
    ...(base || {}),
  };

  const devUserId = devUserOverride || opts?.devUserId;
  if (opts?.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  } else if (devUserId) {
    headers['X-Dev-User-Id'] = devUserId;
  }

  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(
      payload?.message || `Request failed with status ${response.status}`,
      payload?.code || 'REQUEST_FAILED',
      response.status,
      payload?.details
    );
  }

  return payload as T;
}

async function request<T>(path: string, init?: RequestInit, opts?: AuthOpts): Promise<T> {
  const url = `${resolveApiBaseUrl()}${path}`;
  const headers = buildHeaders(init?.headers as Record<string, string>, opts);
  return parseResponse<T>(
    await fetch(url, {
      ...init,
      headers,
      cache: 'no-store',
    })
  );
}

export const api = {
  ensureCurrentUser(payload: { username?: string; imageUrl?: string }, opts?: AuthOpts) {
    return request<{ code: string; message: string; user: Player & { clerkId: string } }>(
      '/api/users/ensure',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      opts
    );
  },

  getMyRooms(opts?: AuthOpts) {
    return request<{ rooms: RoomSummary[] }>('/api/rooms/me', undefined, opts);
  },

  createRoom(payload: { name?: string }, opts?: AuthOpts) {
    return request<{ code: string; message: string; room: RoomSummary }>(
      '/api/rooms',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      opts
    );
  },

  joinRoom(joinCode: string, opts?: AuthOpts) {
    return request<{ code: string; message: string; room: RoomSummary }>(
      '/api/rooms/join',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode }),
      },
      opts
    );
  },

  getRoom(roomId: string, opts?: AuthOpts) {
    return request<RoomDetail>(`/api/rooms/${roomId}`, undefined, opts);
  },

  updateRoomMemberRole(roomId: string, userId: string, role: 'host' | 'member', opts?: AuthOpts) {
    return request<{ code: string; message: string; member: RoomMemberSummary }>(
      `/api/rooms/${roomId}/members/${userId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      },
      opts
    );
  },

  leaveRoom(roomId: string, opts?: AuthOpts) {
    return request<{ code: string; message: string }>(
      `/api/rooms/${roomId}/members/me`,
      {
        method: 'DELETE',
      },
      opts
    );
  },

  getVotingStatus(roomId: string, opts?: AuthOpts) {
    return request<VotingStatus>(`/api/rooms/${roomId}/voting/status`, undefined, opts);
  },

  submitVotes(roomId: string, primaryVote: { userId: string; reason?: string }, secondaryVote: { userId: string; reason?: string }, opts?: AuthOpts) {
    return request<{ code: string; message: string; sessionId: string }>(
      `/api/rooms/${roomId}/votes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryVote, secondaryVote }),
      },
      opts
    );
  },

  getMyVotes(roomId: string, sessionId = 'current', opts?: AuthOpts) {
    const query = encodeURIComponent(sessionId);
    return request<UserVotes>(`/api/rooms/${roomId}/votes/me?sessionId=${query}`, undefined, opts);
  },

  getLatestResults(roomId: string, opts?: AuthOpts) {
    return request<LatestResultsResponse>(`/api/rooms/${roomId}/results/latest`, undefined, opts);
  },

  getAggregateResults(roomId: string, sessionId: string, opts?: AuthOpts) {
    return request<AggregateResultsResponse>(`/api/rooms/${roomId}/results/aggregate/${sessionId}`, undefined, opts);
  },

  getSessionHistory(roomId: string, opts?: AuthOpts) {
    return request<{ sessions: SessionHistoryEntry[] }>(`/api/rooms/${roomId}/sessions/history`, undefined, opts);
  },

  getDetailedResults(roomId: string, sessionId: string, opts?: AuthOpts) {
    return request<{ votes: DetailedVote[] }>(`/api/rooms/${roomId}/admin/detailed-results/${sessionId}`, undefined, opts);
  },

  openSession(roomId: string, payload: { name?: string; startTime: string; endTime: string }, opts?: AuthOpts) {
    return request<{ code: string; message: string; session: { id: string; name: string; startTime: string; endTime: string; isActive: boolean } }>(
      `/api/rooms/${roomId}/admin/sessions/open`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      opts
    );
  },

  closeAndEliminate(
    roomId: string,
    payload: {
      manualTieBreakUserId?: string;
      openNextSession?: boolean;
      nextSession?: { name?: string; startTime: string; endTime: string };
    },
    opts?: AuthOpts
  ) {
    return request<CloseSessionResponse>(
      `/api/rooms/${roomId}/admin/sessions/close-and-eliminate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      opts
    );
  },
};
