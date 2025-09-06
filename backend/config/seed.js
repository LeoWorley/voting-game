const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { VotingSession } = require('../models');
const { initializeDatabase, closeDatabase } = require('./init-db');

async function seedDatabase() {
  // Clear existing voting sessions
  await VotingSession.deleteMany({});

  // Create a new voting session
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
