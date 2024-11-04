const mongoose = require('mongoose');
const { User, Vote, VotingSession } = require('../models');

async function initializeDatabase() {
  try {
    // Create collections if they don't exist
    await Promise.all([
      User.createCollection(),
      Vote.createCollection(),
      VotingSession.createCollection()
    ]);

    console.log('Database collections initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

module.exports = initializeDatabase; 