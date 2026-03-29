const express = require('express');
const { handleRouteError } = require('../utils/http');
const { roomAccessGuard, roomHostGuard } = require('../middleware/room');
const {
  listMyRooms,
  createRoom,
  joinRoom,
  getRoomDetails,
  updateRoomMemberRole,
  leaveRoom,
} = require('../services/room.service');
const {
  getVotingStatus,
  submitVotes,
  getMyVotes,
  getLatestResults,
  getAggregateResults,
  getSessionHistory,
  getDetailedResults,
  openSession,
  closeAndEliminate,
} = require('../services/room-game.service');

const router = express.Router();

router.get('/me', async (req, res) => {
  try {
    const rooms = await listMyRooms({ clerkId: req.auth?.userId });
    return res.json(rooms);
  } catch (error) {
    return handleRouteError(res, error, 'Failed to fetch your rooms');
  }
});

router.post('/', async (req, res) => {
  try {
    const room = await createRoom({
      clerkId: req.auth?.userId,
      name: req.body?.name,
    });
    return res.status(201).json({
      code: 'ROOM_CREATED',
      message: 'Room created successfully',
      room,
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to create room');
  }
});

router.post('/join', async (req, res) => {
  try {
    const room = await joinRoom({
      clerkId: req.auth?.userId,
      joinCode: req.body?.joinCode,
    });
    return res.json({
      code: 'ROOM_JOINED',
      message: 'Joined room successfully',
      room,
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to join room');
  }
});

router.use('/:roomId', roomAccessGuard);

router.get('/:roomId', async (req, res) => {
  try {
    const room = await getRoomDetails({
      clerkId: req.auth?.userId,
      roomId: req.params.roomId,
    });
    return res.json(room);
  } catch (error) {
    return handleRouteError(res, error, 'Failed to fetch room details');
  }
});

router.patch('/:roomId/members/:userId', roomHostGuard, async (req, res) => {
  try {
    const member = await updateRoomMemberRole({
      clerkId: req.auth?.userId,
      roomId: req.params.roomId,
      targetUserId: req.params.userId,
      role: req.body?.role,
    });
    return res.json({
      code: 'ROOM_MEMBER_UPDATED',
      message: 'Room member updated successfully',
      member,
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to update room member');
  }
});

router.delete('/:roomId/members/me', async (req, res) => {
  try {
    const result = await leaveRoom({
      clerkId: req.auth?.userId,
      roomId: req.params.roomId,
    });
    return res.json(result);
  } catch (error) {
    return handleRouteError(res, error, 'Failed to leave room');
  }
});

router.get('/:roomId/voting/status', async (req, res) => {
  try {
    const status = await getVotingStatus(req.roomAccess);
    return res.json(status);
  } catch (error) {
    return handleRouteError(res, error, 'Failed to fetch voting status');
  }
});

router.post('/:roomId/votes', async (req, res) => {
  try {
    const result = await submitVotes({
      ...req.roomAccess,
      primaryVote: req.body?.primaryVote,
      secondaryVote: req.body?.secondaryVote,
    });

    return res.status(201).json({
      code: 'VOTES_SAVED',
      message: 'Votes submitted successfully',
      ...result,
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to submit votes');
  }
});

router.get('/:roomId/votes/me', async (req, res) => {
  try {
    const votes = await getMyVotes({
      ...req.roomAccess,
      sessionId: req.query?.sessionId || 'current',
    });
    return res.json(votes);
  } catch (error) {
    return handleRouteError(res, error, 'Failed to fetch your votes');
  }
});

router.get('/:roomId/results/latest', async (req, res) => {
  try {
    const latest = await getLatestResults(req.roomAccess);
    return res.json(latest);
  } catch (error) {
    return handleRouteError(res, error, 'Failed to fetch latest results');
  }
});

router.get('/:roomId/results/aggregate/:sessionId', async (req, res) => {
  try {
    const aggregate = await getAggregateResults({
      ...req.roomAccess,
      sessionId: req.params.sessionId,
    });
    return res.json(aggregate);
  } catch (error) {
    return handleRouteError(res, error, 'Failed to fetch aggregate results');
  }
});

router.get('/:roomId/sessions/history', async (req, res) => {
  try {
    const sessions = await getSessionHistory(req.roomAccess);
    return res.json({ sessions });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to fetch session history');
  }
});

router.get('/:roomId/admin/detailed-results/:sessionId', roomHostGuard, async (req, res) => {
  try {
    const votes = await getDetailedResults({
      ...req.roomAccess,
      sessionId: req.params.sessionId,
    });
    return res.json({ votes });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to fetch detailed results');
  }
});

router.post('/:roomId/admin/sessions/open', roomHostGuard, async (req, res) => {
  try {
    const session = await openSession({
      room: req.roomAccess.room,
      actorUser: req.roomAccess.user,
      name: req.body?.name,
      startTime: req.body?.startTime,
      endTime: req.body?.endTime,
    });
    return res.status(201).json({
      code: 'SESSION_OPENED',
      message: 'Session opened successfully',
      session,
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to open session');
  }
});

router.post('/:roomId/admin/sessions/close-and-eliminate', roomHostGuard, async (req, res) => {
  try {
    const result = await closeAndEliminate({
      room: req.roomAccess.room,
      actorUser: req.roomAccess.user,
      manualTieBreakUserId: req.body?.manualTieBreakUserId || null,
      openNextSession: Boolean(req.body?.openNextSession),
      nextSession: req.body?.nextSession || null,
    });

    return res.json({
      code: 'SESSION_CLOSED',
      message: 'Session closed and elimination applied',
      ...result,
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to close session');
  }
});

module.exports = router;
