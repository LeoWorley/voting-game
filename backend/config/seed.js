const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { User, Room, RoomMember, Vote, VotingSession } = require('../models');
const { initializeDatabase, closeDatabase } = require('./init-db');

async function seedDatabase() {
  const devClerkId = (process.env.DEV_CLERK_USER_ID || 'user_voter').trim();
  const devUsername = process.env.DEV_CLERK_USERNAME || 'Dev Player';

  // Canonical dev players; remove duplicates by clerkId
  const basePlayers = [
    { clerkId: 'user_voter', username: 'Voter', imageUrl: '' },
    { clerkId: 'user_alice', username: 'Alice', imageUrl: '' },
    { clerkId: 'user_bob', username: 'Bob', imageUrl: '' },
  ];

  if (!basePlayers.find(player => player.clerkId === devClerkId)) {
    basePlayers.unshift({ clerkId: devClerkId, username: devUsername, imageUrl: '' });
  } else {
    basePlayers.forEach(player => {
      if (player.clerkId === devClerkId) {
        player.username = devUsername;
      }
    });
  }

  // Reset collections for a clean local sandbox
  await Promise.all([
    Vote.deleteMany({}),
    RoomMember.deleteMany({}),
    VotingSession.deleteMany({}),
    Room.deleteMany({}),
    User.deleteMany({}),
  ]);

  const insertedUsers = await User.insertMany(
    basePlayers.map(player => ({
      ...player,
      status: 'active',
      eliminationSession: null,
    }))
  );

  const room = await Room.create({
    name: 'Main Dev Room',
    joinCode: 'DEV123',
    createdBy: insertedUsers[0]._id,
  });

  await RoomMember.insertMany(
    insertedUsers.map((user, index) => ({
      roomId: room._id,
      userId: user._id,
      role: index === 0 ? 'host' : 'member',
      status: 'active',
      eliminationSession: null,
    }))
  );

  await VotingSession.create({
    roomId: room._id,
    name: 'Week 1 Voting',
    startTime: new Date(),
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    isActive: true,
    eliminatedUser: null,
  });

  console.log('Database seeded successfully');
}

async function run() {
  let exitCode = 0;
  try {
    await initializeDatabase();
    await seedDatabase();
  } catch (error) {
    console.error('Error seeding database:', error);
    exitCode = 1;
  } finally {
    await closeDatabase();
    process.exit(exitCode);
  }
}

run();
