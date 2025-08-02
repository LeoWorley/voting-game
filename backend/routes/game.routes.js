const express = require('express');
const router = express.Router();
const { VotingSession, User } = require('../models');

// Corresponds to GET /api/voting/status from PLANNING.md
router.get('/status', async (req, res) => {
  try {
    // TODO: Get authenticated user's Clerk ID from req.auth to check their status
    
    const activeSession = await VotingSession.findOne({ isActive: true });
    const eligiblePlayers = await User.find({ status: 'active' }, 'username imageUrl clerkId');

    res.json({
      isVotingActive: !!activeSession,
      startTime: activeSession?.startTime,
      endTime: activeSession?.endTime,
      sessionName: activeSession?.name,
      eligiblePlayers,
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to fetch voting status',
      error: error.message 
    });
  }
});

module.exports = router; 
