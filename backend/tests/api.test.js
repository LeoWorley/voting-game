const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createApp } = require('../app');
const { User, VotingSession, Vote } = require('../models');

describe('Voting game API', () => {
  let mongoServer;
  let app;
  let users;
  let activeSession;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_DEV_AUTH_FALLBACK = 'true';
    process.env.ADMIN_API_KEY = 'test-admin-key';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = createApp();
  });

  beforeEach(async () => {
    await Promise.all([
      Vote.deleteMany({}),
      VotingSession.deleteMany({}),
      User.deleteMany({}),
    ]);

    users = await User.insertMany([
      { clerkId: 'user_voter', username: 'Voter', status: 'active' },
      { clerkId: 'user_alice', username: 'Alice', status: 'active' },
      { clerkId: 'user_bob', username: 'Bob', status: 'active' },
    ]);

    activeSession = await VotingSession.create({
      name: 'Week 1',
      startTime: new Date(Date.now() - 60 * 1000),
      endTime: new Date(Date.now() + 60 * 60 * 1000),
      isActive: true,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('returns canonical voting status contract', async () => {
    const response = await request(app)
      .get('/api/voting/status')
      .set('X-Dev-User-Id', 'user_voter');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      isVotingOpen: true,
      me: {
        clerkId: 'user_voter',
        isActive: true,
      },
      stats: {
        remainingPlayers: 3,
      },
    });
    expect(response.body.session.id).toBe(String(activeSession._id));
    expect(Array.isArray(response.body.eligiblePlayers)).toBe(true);
    expect(response.body.eligiblePlayers).toHaveLength(2);
  });

  it('rejects same target for primary and secondary votes', async () => {
    const target = String(users[1]._id);
    const response = await request(app)
      .post('/api/votes')
      .set('X-Dev-User-Id', 'user_voter')
      .send({
        primaryVote: { userId: target, reason: 'Reason A' },
        secondaryVote: { userId: target, reason: 'Reason B' },
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('SAME_TARGET_FOR_BOTH_VOTES');
  });

  it('saves and fetches editable votes', async () => {
    const primaryTarget = String(users[1]._id);
    const secondaryTarget = String(users[2]._id);

    const submit = await request(app)
      .post('/api/votes')
      .set('X-Dev-User-Id', 'user_voter')
      .send({
        primaryVote: { userId: primaryTarget, reason: 'Main vote' },
        secondaryVote: { userId: secondaryTarget, reason: 'Tie breaker' },
      });

    expect(submit.status).toBe(201);

    const mine = await request(app)
      .get('/api/votes/me?sessionId=current')
      .set('X-Dev-User-Id', 'user_voter');

    expect(mine.status).toBe(200);
    expect(mine.body.primaryVote.targetUserId).toBe(primaryTarget);
    expect(mine.body.secondaryVote.targetUserId).toBe(secondaryTarget);
    expect(mine.body.sessionId).toBe(String(activeSession._id));
  });

  it('closes session with manual tie-break when needed', async () => {
    const close = await request(app)
      .post('/api/admin/sessions/close-and-eliminate')
      .set('X-API-Key', 'test-admin-key')
      .send({
        manualTieBreakUserId: String(users[2]._id),
      });

    expect(close.status).toBe(200);
    expect(close.body.code).toBe('SESSION_CLOSED');
    expect(close.body.tieBreak.method).toBe('MANUAL_ADMIN_DECISION');
    expect(close.body.eliminatedUser.id).toBe(String(users[2]._id));

    const updatedUser = await User.findById(users[2]._id).lean();
    expect(updatedUser.status).toBe('eliminated');
  });

  it('returns tie-break-required error when unresolved tie has no manual input', async () => {
    const close = await request(app)
      .post('/api/admin/sessions/close-and-eliminate')
      .set('X-API-Key', 'test-admin-key')
      .send({});

    expect(close.status).toBe(409);
    expect(close.body.code).toBe('TIE_BREAK_REQUIRED');
    expect(Array.isArray(close.body.details.tiedUserIds)).toBe(true);
  });
});
