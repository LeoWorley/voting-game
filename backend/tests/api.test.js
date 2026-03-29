const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createApp } = require('../app');
const { User, Room, RoomMember, VotingSession, Vote } = require('../models');

jest.setTimeout(30000);

describe('Room-based voting game API', () => {
  let mongoServer;
  let app;
  let users;
  let room;
  let activeSession;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_DEV_AUTH_FALLBACK = 'true';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = createApp();
  });

  beforeEach(async () => {
    await Promise.all([
      Vote.deleteMany({}),
      VotingSession.deleteMany({}),
      RoomMember.deleteMany({}),
      Room.deleteMany({}),
      User.deleteMany({}),
    ]);

    users = await User.insertMany([
      { clerkId: 'user_host', username: 'Host' },
      { clerkId: 'user_alice', username: 'Alice' },
      { clerkId: 'user_bob', username: 'Bob' },
      { clerkId: 'user_guest', username: 'Guest' },
    ]);

    room = await Room.create({
      name: 'Test Room',
      joinCode: 'ROOM01',
      createdBy: users[0]._id,
    });

    await RoomMember.insertMany([
      { roomId: room._id, userId: users[0]._id, role: 'host', status: 'active' },
      { roomId: room._id, userId: users[1]._id, role: 'member', status: 'active' },
      { roomId: room._id, userId: users[2]._id, role: 'member', status: 'active' },
    ]);

    activeSession = await VotingSession.create({
      roomId: room._id,
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

  it('ensures a signed-in user and lists joined rooms', async () => {
    const ensured = await request(app)
      .post('/api/users/ensure')
      .set('X-Dev-User-Id', 'user_host')
      .send({ username: 'Host', imageUrl: '' });

    expect(ensured.status).toBe(200);
    expect(ensured.body.code).toBe('USER_ENSURED');

    const response = await request(app)
      .get('/api/rooms/me')
      .set('X-Dev-User-Id', 'user_host');

    expect(response.status).toBe(200);
    expect(response.body.rooms).toHaveLength(1);
    expect(response.body.rooms[0]).toMatchObject({
      name: 'Test Room',
      joinCode: 'ROOM01',
      role: 'host',
      activeMemberCount: 3,
    });
  });

  it('creates a room and joins another room by code', async () => {
    const create = await request(app)
      .post('/api/rooms')
      .set('X-Dev-User-Id', 'user_guest')
      .send({ name: 'Guest Room' });

    expect(create.status).toBe(201);
    expect(create.body.room.role).toBe('host');
    expect(create.body.room.joinCode).toHaveLength(6);

    const join = await request(app)
      .post('/api/rooms/join')
      .set('X-Dev-User-Id', 'user_guest')
      .send({ joinCode: 'ROOM01' });

    expect(join.status).toBe(200);
    expect(join.body.room.name).toBe('Test Room');

    const list = await request(app)
      .get('/api/rooms/me')
      .set('X-Dev-User-Id', 'user_guest');

    expect(list.body.rooms).toHaveLength(2);
  });

  it('returns room-scoped voting status contract', async () => {
    const response = await request(app)
      .get(`/api/rooms/${room._id}/voting/status`)
      .set('X-Dev-User-Id', 'user_alice');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      isVotingOpen: true,
      me: {
        clerkId: 'user_alice',
        isActive: true,
        role: 'member',
      },
      stats: {
        remainingPlayers: 3,
      },
    });
    expect(response.body.session.id).toBe(String(activeSession._id));
    expect(Array.isArray(response.body.eligiblePlayers)).toBe(true);
    expect(response.body.eligiblePlayers).toHaveLength(2);
  });

  it('saves and fetches room-scoped votes', async () => {
    const primaryTarget = String(users[0]._id);
    const secondaryTarget = String(users[2]._id);

    const submit = await request(app)
      .post(`/api/rooms/${room._id}/votes`)
      .set('X-Dev-User-Id', 'user_alice')
      .send({
        primaryVote: { userId: primaryTarget, reason: 'Main vote' },
        secondaryVote: { userId: secondaryTarget, reason: 'Tie breaker' },
      });

    expect(submit.status).toBe(201);

    const mine = await request(app)
      .get(`/api/rooms/${room._id}/votes/me?sessionId=current`)
      .set('X-Dev-User-Id', 'user_alice');

    expect(mine.status).toBe(200);
    expect(mine.body.primaryVote.targetUserId).toBe(primaryTarget);
    expect(mine.body.secondaryVote.targetUserId).toBe(secondaryTarget);
    expect(mine.body.sessionId).toBe(String(activeSession._id));
  });

  it('restricts host-only actions and supports host promotion', async () => {
    const forbidden = await request(app)
      .post(`/api/rooms/${room._id}/admin/sessions/open`)
      .set('X-Dev-User-Id', 'user_alice')
      .send({
        name: 'Blocked',
        startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      });

    expect(forbidden.status).toBe(403);
    expect(forbidden.body.code).toBe('FORBIDDEN');

    const promote = await request(app)
      .patch(`/api/rooms/${room._id}/members/${users[1]._id}`)
      .set('X-Dev-User-Id', 'user_host')
      .send({ role: 'host' });

    expect(promote.status).toBe(200);
    expect(promote.body.member.role).toBe('host');
  });

  it('closes a room session and marks elimination on the room membership', async () => {
    await request(app)
      .post(`/api/rooms/${room._id}/votes`)
      .set('X-Dev-User-Id', 'user_host')
      .send({
        primaryVote: { userId: String(users[2]._id), reason: 'Vote Bob' },
        secondaryVote: { userId: String(users[1]._id), reason: 'Vote Alice' },
      });

    await request(app)
      .post(`/api/rooms/${room._id}/votes`)
      .set('X-Dev-User-Id', 'user_alice')
      .send({
        primaryVote: { userId: String(users[2]._id), reason: 'Vote Bob' },
        secondaryVote: { userId: String(users[0]._id), reason: 'Vote Host' },
      });

    const close = await request(app)
      .post(`/api/rooms/${room._id}/admin/sessions/close-and-eliminate`)
      .set('X-Dev-User-Id', 'user_host')
      .send({});

    expect(close.status).toBe(200);
    expect(close.body.code).toBe('SESSION_CLOSED');
    expect(close.body.eliminatedUser.id).toBe(String(users[2]._id));

    const updatedMembership = await RoomMember.findOne({ roomId: room._id, userId: users[2]._id }).lean();
    expect(updatedMembership.status).toBe('eliminated');
  });

  it('blocks leaving for the last host and for rooms with active sessions', async () => {
    const activeSessionLeave = await request(app)
      .delete(`/api/rooms/${room._id}/members/me`)
      .set('X-Dev-User-Id', 'user_alice');

    expect(activeSessionLeave.status).toBe(409);
    expect(activeSessionLeave.body.code).toBe('ACTIVE_SESSION_PREVENTS_LEAVE');

    await VotingSession.updateMany({ roomId: room._id }, { $set: { isActive: false } });

    const lastHostLeave = await request(app)
      .delete(`/api/rooms/${room._id}/members/me`)
      .set('X-Dev-User-Id', 'user_host');

    expect(lastHostLeave.status).toBe(400);
    expect(lastHostLeave.body.code).toBe('LAST_HOST_CANNOT_LEAVE');
  });
});
