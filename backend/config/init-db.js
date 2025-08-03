const mongoose = require('mongoose');
require('dotenv').config();

async function initializeDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable not set');
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
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
