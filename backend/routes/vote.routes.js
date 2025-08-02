const express = require('express');
const router = express.Router();
const { Vote, VotingSession, User } = require('../models');

router.post('/', async (req, res) => {
  try {
    // TODO: Get authenticated user's Clerk ID from req.auth
    const voterClerkId = "user_2f9rblpS1yGfQ2kY8nZ7bX6cW5a"; // Placeholder

    const { primaryVote, secondaryVote } = req.body; // Expects { userId, reason }
    const activeSession = await VotingSession.findOne({ isActive: true });

    if (!activeSession) {
      return res.status(400).json({ message: 'No active voting session is available.' });
    }

    const voter = await User.findOne({ clerkId: voterClerkId });
    if (!voter || voter.status !== 'active') {
      return res.status(403).json({ message: 'Voter is not active or not found.' });
    }
    
    // TODO: Add logic to ensure user hasn't voted in this session yet

    // Create primary vote (2 points)
    await Vote.create({
      sessionId: activeSession._id,
      voterId: voter._id,
      votedForId: primaryVote.userId,
      points: 2,
      reason: primaryVote.reason,
    });

    // Create secondary vote (1 point)
    await Vote.create({
      sessionId: activeSession._id,
      voterId: voter._id,
      votedForId: secondaryVote.userId,
      points: 1,
      reason: secondaryVote.reason,
    });

    res.status(201).json({ message: 'Votes submitted successfully' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to submit votes',
      error: error.message 
    });
  }
});

module.exports = router; 
