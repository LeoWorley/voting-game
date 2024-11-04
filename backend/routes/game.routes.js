const express = require('express');
const router = express.Router();
const { VotingSession, User } = require('../models');

router.get('/status', async (req, res) => {
  try {
    const activeSession = await VotingSession.findOne({ isActive: true });
    const activePlayers = await User.countDocuments({ isActive: true });

    res.json({
      isVotingDay: !!activeSession,
      nextVotingDate: activeSession?.startTime || new Date('2024-03-10'),
      isPlayerActive: true, // TODO: Check user's status from Clerk ID
      remainingPlayers: activePlayers
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to fetch game status',
      error: error.message 
    });
  }
});

module.exports = router; 