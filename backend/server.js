require('dotenv').config();  // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const app = express();

// Add middleware to parse JSON
app.use(express.json());

// Import database configuration
require('./config/database');  // This will execute the MongoDB connection

// Initialize database
const initializeDatabase = require('./config/init-db');
initializeDatabase();

// Routes
const gameRoutes = require('./routes/game.routes');
const voteRoutes = require('./routes/vote.routes');

app.use('/api/game', gameRoutes);
app.use('/api/votes', voteRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Test route for database
app.get('/api/db-test', async (req, res) => {
  try {
    const dbStatus = await mongoose.connection.db.admin().ping();
    res.json({ 
      message: 'Database connection successful',
      status: dbStatus
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Database connection failed',
      error: error.message 
    });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});