require('dotenv').config();  // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const { initializeDatabase, closeDatabase } = require('./config/init-db');

// Add middleware to parse JSON
app.use(express.json());

// Import database configuration
require('./config/database');  // This will execute the MongoDB connection

// Routes
const userRoutes = require('./routes/user.routes');
const votingRoutes = require('./routes/game.routes');
const voteRoutes = require('./routes/vote.routes');
const resultsRoutes = require('./routes/results.routes');

app.use('/api/users', userRoutes);
app.use('/api/voting', votingRoutes); // Path changed from /game
app.use('/api/votes', voteRoutes);
app.use('/api/results', resultsRoutes);

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

// Start server
const port = process.env.PORT || 3001;
initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}).catch(error => {
  console.error('Error initializing database:', error);
  process.exit(1);
});

// Graceful shutdhown handling
process.on('SIGTERM', closeDatabase);
process.on('SIGINT', closeDatabase);
process.on('uncaughtException', closeDatabase);
