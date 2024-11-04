const express = require('express');
const router = express.Router();
const { Vote, VotingSession } = require('../models');

router.post('/', async (req, res) => {
  try {
    const { primaryVote, secondaryVote } = req.body;
    const activeSession = await VotingSession.findOne({ isActive: true });

    if (!activeSession) {
      return res.status(400).json({ message: 'No active voting session' });
    }

    // Create primary vote (2 points)
    await Vote.create({
      fromUser: req.userId, // TODO: Get from Clerk auth
      toUser: primaryVote,
      weight: 2,
      votingSession: activeSession._id
    });

    // Create secondary vote (1 point)
    await Vote.create({
      fromUser: req.userId, // TODO: Get from Clerk auth
      toUser: secondaryVote,
      weight: 1,
      votingSession: activeSession._id
    });

    res.json({ message: 'Votes submitted successfully' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to submit votes',
      error: error.message 
    });
  }
});

module.exports = router; 