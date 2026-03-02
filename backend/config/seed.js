const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { User, Vote, VotingSession } = require('../models');
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
    VotingSession.deleteMany({}),
    User.deleteMany({}),
  ]);

  await User.insertMany(
    basePlayers.map(player => ({
      ...player,
      status: 'active',
      eliminationSession: null,
    }))
  );

  await VotingSession.create({
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
