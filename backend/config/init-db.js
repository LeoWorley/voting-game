const mongoose = require('mongoose');
const { User, Vote, VotingSession } = require('../models');
require('dotenv').config();

async function initializeDatabase() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable not set');
    }

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })

    console.log('Connected to MongoDB');
    
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

// Add cleanup function
async function closeDatabase() {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
}

module.exports = { initializeDatabase, closeDatabase };