const mongoose = require('mongoose');
const { AppError } = require('../utils/app-error');
const { User, Vote, VotingSession, AuditLog } = require('../models');

function asObjectId(id, code = 'INVALID_ID', message = 'Invalid identifier') {
  if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
    throw new AppError(400, code, message);
  }
  return new mongoose.Types.ObjectId(String(id));
}

function isSessionOpen(session, now = new Date()) {
  if (!session || !session.isActive) return false;
  if (session.startTime && now < session.startTime) return false;
  if (session.endTime && now > session.endTime) return false;
  return true;
}

async function writeAudit({ actor, action, target = null, metadata = {} }) {
  await AuditLog.create({ actor, action, target, metadata });
}

async function getActiveSession() {
  return VotingSession.findOne({ isActive: true });
}

async function buildScoreboard(sessionId, userCandidates = null) {
  const objectSessionId = asObjectId(sessionId, 'INVALID_SESSION_ID', 'Invalid session id');

  const [votes, users] = await Promise.all([
    Vote.find({ sessionId: objectSessionId }, 'votedForId points updatedAt').lean(),
    userCandidates
      ? Promise.resolve(userCandidates)
      : User.find({}, '_id username imageUrl').lean(),
  ]);

  const scoreboard = new Map();
  users.forEach((user) => {
    scoreboard.set(String(user._id), {
      userId: String(user._id),
      username: user.username,
      imageUrl: user.imageUrl || '',
      primaryVotes: 0,
      secondaryVotes: 0,
      totalPoints: 0,
      latestVoteAt: null,
    });
  });

  votes.forEach((vote) => {
    const key = String(vote.votedForId);
    if (!scoreboard.has(key)) {
      return;
    }
    const entry = scoreboard.get(key);
    if (vote.points === 2) entry.primaryVotes += 1;
    if (vote.points === 1) entry.secondaryVotes += 1;
    entry.totalPoints += vote.points;
    if (!entry.latestVoteAt || new Date(vote.updatedAt) > new Date(entry.latestVoteAt)) {
      entry.latestVoteAt = vote.updatedAt;
    }
  });

  return Array.from(scoreboard.values()).sort((a, b) => b.totalPoints - a.totalPoints || b.primaryVotes - a.primaryVotes || a.username.localeCompare(b.username));
}

function resolveElimination(scoreboard, manualTieBreakUserId = null) {
  if (!scoreboard.length) {
    throw new AppError(400, 'NO_ELIGIBLE_PLAYERS', 'No eligible players found for elimination');
  }

  const maxTotal = Math.max(...scoreboard.map((row) => row.totalPoints));
  let tied = scoreboard.filter((row) => row.totalPoints === maxTotal);

  if (tied.length === 1) {
    return {
      eliminatedUserId: tied[0].userId,
      method: 'TOTAL_POINTS',
      tiedUserIds: [],
    };
  }

  const maxPrimary = Math.max(...tied.map((row) => row.primaryVotes));
  tied = tied.filter((row) => row.primaryVotes === maxPrimary);

  if (tied.length === 1) {
    return {
      eliminatedUserId: tied[0].userId,
      method: 'PRIMARY_VOTES',
      tiedUserIds: [],
    };
  }

  const withDate = tied.filter((row) => row.latestVoteAt);
  if (withDate.length > 0) {
    const earliestTs = Math.min(...withDate.map((row) => new Date(row.latestVoteAt).getTime()));
    const earliest = withDate.filter((row) => new Date(row.latestVoteAt).getTime() === earliestTs);
    if (earliest.length === 1) {
      return {
        eliminatedUserId: earliest[0].userId,
        method: 'EARLIEST_FINAL_SUBMISSION',
        tiedUserIds: [],
      };
    }
    tied = earliest;
  }

  if (!manualTieBreakUserId) {
    throw new AppError(409, 'TIE_BREAK_REQUIRED', 'Manual tie-break selection required', {
      tiedUserIds: tied.map((row) => row.userId),
    });
  }

  const picked = tied.find((row) => row.userId === String(manualTieBreakUserId));
  if (!picked) {
    throw new AppError(400, 'INVALID_TIE_BREAK_USER', 'Manual tie-break user must be one of tied users', {
      tiedUserIds: tied.map((row) => row.userId),
    });
  }

  return {
    eliminatedUserId: picked.userId,
    method: 'MANUAL_ADMIN_DECISION',
    tiedUserIds: tied.map((row) => row.userId),
  };
}

async function getVotingStatus(clerkId) {
  if (!clerkId) {
    throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');
  }

  const me = await User.findOne({ clerkId }, '_id clerkId username status').lean();
  if (!me) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const [activeSession, remainingPlayers] = await Promise.all([
    getActiveSession(),
    User.countDocuments({ status: 'active' }),
  ]);

  const now = new Date();
  const isVotingOpen = isSessionOpen(activeSession, now);

  const eligiblePlayers = me.status === 'active'
    ? await User.find({ status: 'active', _id: { $ne: me._id } }, '_id username imageUrl').lean()
    : [];

  return {
    isVotingOpen,
    session: activeSession
      ? {
          id: String(activeSession._id),
          name: activeSession.name,
          startTime: activeSession.startTime,
          endTime: activeSession.endTime,
        }
      : null,
    eligiblePlayers: eligiblePlayers.map((player) => ({
      id: String(player._id),
      username: player.username,
      imageUrl: player.imageUrl || '',
    })),
    me: {
      id: String(me._id),
      clerkId: me.clerkId,
      username: me.username,
      isActive: me.status === 'active',
    },
    stats: {
      remainingPlayers,
    },
  };
}

async function submitVotes({ clerkId, primaryVote, secondaryVote }) {
  if (!clerkId) {
    throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');
  }

  if (!primaryVote?.userId || !secondaryVote?.userId) {
    throw new AppError(400, 'MISSING_VOTES', 'Both primary and secondary votes are required');
  }

  if (String(primaryVote.userId) === String(secondaryVote.userId)) {
    throw new AppError(400, 'SAME_TARGET_FOR_BOTH_VOTES', 'Primary and secondary votes must target different users');
  }

  const primaryTargetId = asObjectId(primaryVote.userId, 'INVALID_PRIMARY_TARGET', 'Invalid primary target user id');
  const secondaryTargetId = asObjectId(secondaryVote.userId, 'INVALID_SECONDARY_TARGET', 'Invalid secondary target user id');

  const [activeSession, voter] = await Promise.all([
    getActiveSession(),
    User.findOne({ clerkId }),
  ]);

  if (!activeSession) {
    throw new AppError(400, 'NO_ACTIVE_SESSION', 'No active voting session is available');
  }

  if (!voter || voter.status !== 'active') {
    throw new AppError(403, 'INACTIVE_VOTER', 'Only active players can vote');
  }

  if (!isSessionOpen(activeSession, new Date())) {
    throw new AppError(400, 'VOTING_CLOSED', 'Voting is not currently open');
  }

  if (String(primaryTargetId) === String(voter._id) || String(secondaryTargetId) === String(voter._id)) {
    throw new AppError(400, 'SELF_VOTE_NOT_ALLOWED', 'You cannot vote for yourself');
  }

  const targets = await User.find({ _id: { $in: [primaryTargetId, secondaryTargetId] } }, '_id status').lean();
  if (targets.length !== 2) {
    throw new AppError(400, 'TARGET_NOT_FOUND', 'One or more selected users do not exist');
  }
  if (targets.some((target) => target.status !== 'active')) {
    throw new AppError(400, 'TARGET_NOT_ACTIVE', 'You can only vote for active users');
  }

  const filterBase = { sessionId: activeSession._id, voterId: voter._id };

  try {
    await Promise.all([
      Vote.findOneAndUpdate(
        { ...filterBase, points: 2 },
        {
          $set: {
            votedForId: primaryTargetId,
            reason: primaryVote.reason?.trim() || null,
          },
          $setOnInsert: {
            sessionId: activeSession._id,
            voterId: voter._id,
            points: 2,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ),
      Vote.findOneAndUpdate(
        { ...filterBase, points: 1 },
        {
          $set: {
            votedForId: secondaryTargetId,
            reason: secondaryVote.reason?.trim() || null,
          },
          $setOnInsert: {
            sessionId: activeSession._id,
            voterId: voter._id,
            points: 1,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ),
    ]);
  } catch (error) {
    if (error && error.code === 11000) {
      throw new AppError(409, 'DUPLICATE_VOTE', 'Duplicate vote detected for this session and point value');
    }
    throw error;
  }

  return {
    sessionId: String(activeSession._id),
  };
}

async function getMyVotes({ clerkId, sessionId = 'current' }) {
  if (!clerkId) {
    throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');
  }

  const voter = await User.findOne({ clerkId }, '_id').lean();
  if (!voter) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  let targetSession = null;
  if (sessionId === 'current') {
    targetSession = await getActiveSession();
  } else {
    targetSession = await VotingSession.findById(asObjectId(sessionId, 'INVALID_SESSION_ID', 'Invalid session id')).lean();
  }

  if (!targetSession) {
    return {
      sessionId: null,
      primaryVote: null,
      secondaryVote: null,
    };
  }

  const votes = await Vote.find({ sessionId: targetSession._id, voterId: voter._id }, 'votedForId points reason updatedAt').lean();

  const primaryVote = votes.find((vote) => vote.points === 2);
  const secondaryVote = votes.find((vote) => vote.points === 1);

  return {
    sessionId: String(targetSession._id),
    primaryVote: primaryVote
      ? {
          targetUserId: String(primaryVote.votedForId),
          reason: primaryVote.reason || '',
          updatedAt: primaryVote.updatedAt,
        }
      : null,
    secondaryVote: secondaryVote
      ? {
          targetUserId: String(secondaryVote.votedForId),
          reason: secondaryVote.reason || '',
          updatedAt: secondaryVote.updatedAt,
        }
      : null,
  };
}

async function getAggregateResults(sessionId) {
  const session = await VotingSession.findById(asObjectId(sessionId, 'INVALID_SESSION_ID', 'Invalid session id')).lean();
  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Voting session not found');
  }

  const users = await User.find({}, '_id username imageUrl').lean();
  const scoreBoard = await buildScoreboard(session._id, users);

  return {
    session: {
      id: String(session._id),
      name: session.name,
      startTime: session.startTime,
      endTime: session.endTime,
      isActive: session.isActive,
      eliminatedUser: session.eliminatedUser ? String(session.eliminatedUser) : null,
    },
    scoreboard: scoreBoard.map((row) => ({
      userId: row.userId,
      username: row.username,
      imageUrl: row.imageUrl,
      primaryVotes: row.primaryVotes,
      secondaryVotes: row.secondaryVotes,
      totalPoints: row.totalPoints,
    })),
  };
}

async function getLatestResults() {
  const session = await VotingSession.findOne({ isActive: false }).sort({ endTime: -1 }).populate('eliminatedUser', 'username imageUrl').lean();

  if (!session) {
    return { session: null };
  }

  const users = await User.find({}, '_id username imageUrl').lean();
  const scoreBoard = await buildScoreboard(session._id, users);

  return {
    session: {
      id: String(session._id),
      name: session.name,
      startTime: session.startTime,
      endTime: session.endTime,
      eliminatedUser: session.eliminatedUser
        ? {
            id: String(session.eliminatedUser._id),
            username: session.eliminatedUser.username,
            imageUrl: session.eliminatedUser.imageUrl || '',
          }
        : null,
      scoreboard: scoreBoard.map((row) => ({
        userId: row.userId,
        username: row.username,
        imageUrl: row.imageUrl,
        primaryVotes: row.primaryVotes,
        secondaryVotes: row.secondaryVotes,
        totalPoints: row.totalPoints,
      })),
    },
  };
}

async function getSessionHistory() {
  const sessions = await VotingSession.find({ isActive: false })
    .sort({ endTime: -1 })
    .populate('eliminatedUser', 'username imageUrl')
    .lean();

  return sessions.map((session) => ({
    id: String(session._id),
    name: session.name,
    startTime: session.startTime,
    endTime: session.endTime,
    eliminatedUser: session.eliminatedUser
      ? {
          id: String(session.eliminatedUser._id),
          username: session.eliminatedUser.username,
          imageUrl: session.eliminatedUser.imageUrl || '',
        }
      : null,
  }));
}

async function getDetailedResults(sessionId) {
  const objectSessionId = asObjectId(sessionId, 'INVALID_SESSION_ID', 'Invalid session id');
  const votes = await Vote.find({ sessionId: objectSessionId })
    .populate('voterId', 'username imageUrl')
    .populate('votedForId', 'username imageUrl')
    .lean();

  if (!votes.length) {
    throw new AppError(404, 'NO_VOTES_FOUND', 'No votes found for this session');
  }

  return votes.map((vote) => ({
    id: String(vote._id),
    sessionId: String(vote.sessionId),
    points: vote.points,
    reason: vote.reason || '',
    voter: vote.voterId
      ? {
          id: String(vote.voterId._id),
          username: vote.voterId.username,
          imageUrl: vote.voterId.imageUrl || '',
        }
      : null,
    votedFor: vote.votedForId
      ? {
          id: String(vote.votedForId._id),
          username: vote.votedForId.username,
          imageUrl: vote.votedForId.imageUrl || '',
        }
      : null,
  }));
}

async function openSession({ actor, name, startTime, endTime }) {
  const [existingActive, parsedStart, parsedEnd] = await Promise.all([
    getActiveSession(),
    Promise.resolve(new Date(startTime)),
    Promise.resolve(new Date(endTime)),
  ]);

  if (existingActive) {
    throw new AppError(409, 'ACTIVE_SESSION_EXISTS', 'An active session already exists');
  }

  if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
    throw new AppError(400, 'INVALID_SESSION_WINDOW', 'Invalid session start or end time');
  }

  if (parsedEnd <= parsedStart) {
    throw new AppError(400, 'INVALID_SESSION_WINDOW', 'Session end time must be after start time');
  }

  const session = await VotingSession.create({
    name: name?.trim() || `Session ${parsedStart.toISOString()}`,
    startTime: parsedStart,
    endTime: parsedEnd,
    isActive: true,
    eliminatedUser: null,
  });

  await writeAudit({
    actor,
    action: 'SESSION_OPENED',
    target: String(session._id),
    metadata: {
      name: session.name,
      startTime: session.startTime,
      endTime: session.endTime,
    },
  });

  return {
    id: String(session._id),
    name: session.name,
    startTime: session.startTime,
    endTime: session.endTime,
    isActive: session.isActive,
  };
}

async function closeAndEliminate({ actor, manualTieBreakUserId = null, openNextSession = false, nextSession = null }) {
  const activeSession = await getActiveSession();
  if (!activeSession) {
    throw new AppError(400, 'NO_ACTIVE_SESSION', 'No active session to close');
  }

  const activeUsers = await User.find({ status: 'active' }, '_id username imageUrl status').lean();
  if (activeUsers.length < 2) {
    throw new AppError(400, 'INSUFFICIENT_ACTIVE_PLAYERS', 'Need at least two active players to close session');
  }

  const scoreBoard = await buildScoreboard(activeSession._id, activeUsers);
  const tieBreak = resolveElimination(scoreBoard, manualTieBreakUserId);

  const eliminatedUserId = asObjectId(tieBreak.eliminatedUserId, 'INVALID_ELIMINATED_USER', 'Invalid eliminated user id');

  let nextSessionWindow = null;
  if (openNextSession) {
    const parsedStart = new Date(nextSession?.startTime);
    const parsedEnd = new Date(nextSession?.endTime);
    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime()) || parsedEnd <= parsedStart) {
      throw new AppError(400, 'INVALID_NEXT_SESSION', 'Next session window is invalid');
    }
    nextSessionWindow = {
      name: nextSession?.name || `Next ${activeSession.name}`,
      startTime: parsedStart,
      endTime: parsedEnd,
    };
  }

  activeSession.isActive = false;
  activeSession.eliminatedUser = eliminatedUserId;
  await activeSession.save();

  const eliminatedUser = await User.findByIdAndUpdate(
    eliminatedUserId,
    {
      $set: {
        status: 'eliminated',
        eliminationSession: activeSession._id,
      },
    },
    { new: true }
  ).lean();

  let nextSessionRecord = null;
  if (openNextSession) {
    nextSessionRecord = await openSession({
      actor,
      name: nextSessionWindow.name,
      startTime: nextSessionWindow.startTime,
      endTime: nextSessionWindow.endTime,
    });
  }

  await writeAudit({
    actor,
    action: 'SESSION_CLOSED',
    target: String(activeSession._id),
    metadata: {
      eliminatedUserId: String(eliminatedUserId),
      tieBreakMethod: tieBreak.method,
      tiedUserIds: tieBreak.tiedUserIds,
      openNextSession,
      nextSessionId: nextSessionRecord?.id || null,
    },
  });

  return {
    session: {
      id: String(activeSession._id),
      name: activeSession.name,
      startTime: activeSession.startTime,
      endTime: activeSession.endTime,
      isActive: false,
    },
    eliminatedUser: eliminatedUser
      ? {
          id: String(eliminatedUser._id),
          username: eliminatedUser.username,
          imageUrl: eliminatedUser.imageUrl || '',
        }
      : null,
    tieBreak,
    scoreboard: scoreBoard.map((row) => ({
      userId: row.userId,
      username: row.username,
      imageUrl: row.imageUrl,
      primaryVotes: row.primaryVotes,
      secondaryVotes: row.secondaryVotes,
      totalPoints: row.totalPoints,
    })),
    nextSession: nextSessionRecord,
  };
}

module.exports = {
  getVotingStatus,
  submitVotes,
  getMyVotes,
  getAggregateResults,
  getLatestResults,
  getSessionHistory,
  getDetailedResults,
  openSession,
  closeAndEliminate,
  isSessionOpen,
};
