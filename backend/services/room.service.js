const mongoose = require('mongoose');
const { AppError } = require('../utils/app-error');
const { Room, RoomMember, User, VotingSession } = require('../models');

const JOIN_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function asObjectId(id, code = 'INVALID_ID', message = 'Invalid identifier') {
  if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
    throw new AppError(400, code, message);
  }
  return new mongoose.Types.ObjectId(String(id));
}

function generateCodeValue() {
  let value = '';
  for (let index = 0; index < 6; index += 1) {
    const next = Math.floor(Math.random() * JOIN_CODE_CHARS.length);
    value += JOIN_CODE_CHARS[next];
  }
  return value;
}

async function generateUniqueJoinCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const joinCode = generateCodeValue();
    const existing = await Room.exists({ joinCode });
    if (!existing) {
      return joinCode;
    }
  }
  throw new AppError(500, 'ROOM_CODE_GENERATION_FAILED', 'Unable to generate a unique room code');
}

async function getOrCreateUserByClerkId(clerkId, profile = {}) {
  if (!clerkId) {
    throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');
  }

  const normalizedUsername = String(profile.username || '').trim() || String(clerkId);
  const normalizedImageUrl = String(profile.imageUrl || '').trim();

  return User.findOneAndUpdate(
    { clerkId: String(clerkId) },
    {
      $set: {
        username: normalizedUsername,
        imageUrl: normalizedImageUrl,
      },
      $setOnInsert: {
        clerkId: String(clerkId),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function getRoomAccessByClerkId({ clerkId, roomId }) {
  const [user, room] = await Promise.all([
    getOrCreateUserByClerkId(clerkId),
    Room.findById(asObjectId(roomId, 'INVALID_ROOM_ID', 'Invalid room id')).lean(),
  ]);

  if (!room) {
    throw new AppError(404, 'ROOM_NOT_FOUND', 'Room not found');
  }

  const membership = await RoomMember.findOne({ roomId: room._id, userId: user._id }).lean();
  if (!membership) {
    throw new AppError(403, 'ROOM_ACCESS_DENIED', 'You are not a member of this room');
  }

  return { user, room, membership };
}

async function buildRoomSummaryForMembership(membership) {
  const roomId = membership.roomId._id ? membership.roomId._id : membership.roomId;
  const room = membership.roomId._id ? membership.roomId : await Room.findById(roomId).lean();

  const [memberCount, activeMemberCount, hostCount, activeSession] = await Promise.all([
    RoomMember.countDocuments({ roomId }),
    RoomMember.countDocuments({ roomId, status: 'active' }),
    RoomMember.countDocuments({ roomId, role: 'host' }),
    VotingSession.findOne({ roomId, isActive: true }).lean(),
  ]);

  return {
    id: String(room._id),
    name: room.name,
    joinCode: room.joinCode,
    role: membership.role,
    membershipStatus: membership.status,
    memberCount,
    activeMemberCount,
    hostCount,
    activeSession: activeSession
      ? {
          id: String(activeSession._id),
          name: activeSession.name,
          startTime: activeSession.startTime,
          endTime: activeSession.endTime,
          isActive: activeSession.isActive,
        }
      : null,
  };
}

async function ensureCurrentUser({ clerkId, username, imageUrl }) {
  const user = await getOrCreateUserByClerkId(clerkId, { username, imageUrl });
  return {
    id: String(user._id),
    clerkId: user.clerkId,
    username: user.username,
    imageUrl: user.imageUrl || '',
  };
}

async function listMyRooms({ clerkId }) {
  const user = await getOrCreateUserByClerkId(clerkId);
  const memberships = await RoomMember.find({ userId: user._id })
    .populate('roomId', 'name joinCode createdBy')
    .sort({ updatedAt: -1 })
    .lean();

  const rooms = await Promise.all(memberships.map((membership) => buildRoomSummaryForMembership(membership)));
  return { rooms };
}

async function createRoom({ clerkId, name }) {
  const user = await getOrCreateUserByClerkId(clerkId);
  const joinCode = await generateUniqueJoinCode();

  const room = await Room.create({
    name: String(name || '').trim() || `${user.username}'s Room`,
    joinCode,
    createdBy: user._id,
  });

  const membership = await RoomMember.create({
    roomId: room._id,
    userId: user._id,
    role: 'host',
    status: 'active',
  });

  return buildRoomSummaryForMembership({
    ...membership.toObject(),
    roomId: room.toObject(),
  });
}

async function joinRoom({ clerkId, joinCode }) {
  const user = await getOrCreateUserByClerkId(clerkId);
  const normalizedCode = String(joinCode || '').trim().toUpperCase();

  if (!normalizedCode) {
    throw new AppError(400, 'ROOM_CODE_REQUIRED', 'Room code is required');
  }

  const room = await Room.findOne({ joinCode: normalizedCode }).lean();
  if (!room) {
    throw new AppError(404, 'ROOM_CODE_NOT_FOUND', 'Room code not found');
  }

  const membership = await RoomMember.findOneAndUpdate(
    { roomId: room._id, userId: user._id },
    {
      $setOnInsert: {
        roomId: room._id,
        userId: user._id,
        role: 'member',
        status: 'active',
      },
      $set: {
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return buildRoomSummaryForMembership({
    ...membership,
    roomId: room,
  });
}

async function getRoomDetails({ clerkId, roomId }) {
  const access = await getRoomAccessByClerkId({ clerkId, roomId });

  const [members, activeSession] = await Promise.all([
    RoomMember.find({ roomId: access.room._id })
      .populate('userId', 'username imageUrl clerkId')
      .sort({ role: 1, createdAt: 1 })
      .lean(),
    VotingSession.findOne({ roomId: access.room._id, isActive: true }).lean(),
  ]);

  return {
    id: String(access.room._id),
    name: access.room.name,
    joinCode: access.room.joinCode,
    role: access.membership.role,
    membershipStatus: access.membership.status,
    activeSession: activeSession
      ? {
          id: String(activeSession._id),
          name: activeSession.name,
          startTime: activeSession.startTime,
          endTime: activeSession.endTime,
          isActive: activeSession.isActive,
        }
      : null,
    members: members.map((member) => ({
      id: String(member.userId?._id || member.userId),
      username: member.userId?.username || 'Unknown',
      imageUrl: member.userId?.imageUrl || '',
      role: member.role,
      status: member.status,
      isCurrentUser: String(member.userId?._id || member.userId) === String(access.user._id),
    })),
  };
}

async function updateRoomMemberRole({ clerkId, roomId, targetUserId, role }) {
  if (!['host', 'member'].includes(role)) {
    throw new AppError(400, 'INVALID_ROLE', 'Invalid room member role');
  }

  const access = await getRoomAccessByClerkId({ clerkId, roomId });
  if (access.membership.role !== 'host') {
    throw new AppError(403, 'FORBIDDEN', 'Only room hosts can update member roles');
  }

  const targetId = asObjectId(targetUserId, 'INVALID_USER_ID', 'Invalid user id');
  const targetMembership = await RoomMember.findOne({ roomId: access.room._id, userId: targetId });
  if (!targetMembership) {
    throw new AppError(404, 'ROOM_MEMBER_NOT_FOUND', 'Room member not found');
  }

  if (targetMembership.role === 'host' && role === 'member') {
    const hostCount = await RoomMember.countDocuments({ roomId: access.room._id, role: 'host' });
    if (hostCount <= 1) {
      throw new AppError(400, 'LAST_HOST_REQUIRED', 'At least one host must remain in the room');
    }
  }

  targetMembership.role = role;
  await targetMembership.save();

  const updated = await RoomMember.findById(targetMembership._id)
    .populate('userId', 'username imageUrl')
    .lean();

  return {
    id: String(updated.userId?._id || updated.userId),
    username: updated.userId?.username || 'Unknown',
    imageUrl: updated.userId?.imageUrl || '',
    role: updated.role,
    status: updated.status,
  };
}

async function leaveRoom({ clerkId, roomId }) {
  const access = await getRoomAccessByClerkId({ clerkId, roomId });
  const activeSession = await VotingSession.findOne({ roomId: access.room._id, isActive: true }).lean();

  if (activeSession) {
    throw new AppError(409, 'ACTIVE_SESSION_PREVENTS_LEAVE', 'You cannot leave a room while a session is active');
  }

  if (access.membership.role === 'host') {
    const hostCount = await RoomMember.countDocuments({ roomId: access.room._id, role: 'host' });
    if (hostCount <= 1) {
      throw new AppError(400, 'LAST_HOST_CANNOT_LEAVE', 'The last remaining host cannot leave the room');
    }
  }

  await RoomMember.deleteOne({ _id: access.membership._id });

  return {
    code: 'ROOM_LEFT',
    message: 'Left room successfully',
  };
}

module.exports = {
  asObjectId,
  ensureCurrentUser,
  listMyRooms,
  createRoom,
  joinRoom,
  getRoomDetails,
  getRoomAccessByClerkId,
  updateRoomMemberRole,
  leaveRoom,
  getOrCreateUserByClerkId,
};
