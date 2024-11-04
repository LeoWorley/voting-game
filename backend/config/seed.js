const mongoose = require('mongoose');
const { VotingSession } = require('../models');

async function seedDatabase() {
  try {
    // Clear existing voting sessions
    await VotingSession.deleteMany({});

    // Create a new voting session
    await VotingSession.create({
      startTime: new Date(),
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      isActive: true,
      eliminatedUser: null
    });

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Connect to MongoDB and run the seeding
require('./database');  // This will connect to MongoDB
seedDatabase(); 