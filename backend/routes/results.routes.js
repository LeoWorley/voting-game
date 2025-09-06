const express = require('express');
const router = express.Router();
const { adminApiKeyGuard } = require('../middleware/admin');
const { Vote, VotingSession, User } = require('../models');

// Corresponds to GET /api/results/latest
router.get('/latest', async (req, res) => {
  try {
    const lastSession = await VotingSession.findOne({ isActive: false })
      .sort({ endTime: -1 })
      .populate('eliminatedUser', 'username imageUrl');

    if (!lastSession) {
      return res.json({ message: 'No previous voting session found.' });
    }
    res.json(lastSession);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch latest results', error: error.message });
  }
});

// Corresponds to GET /api/admin/detailed-results/:sessionId
router.get('/admin/detailed-results/:sessionId', adminApiKeyGuard, async (req, res) => {
  // TODO: Protect this route with admin-only access
  try {
    const { sessionId } = req.params;
    const votes = await Vote.find({ sessionId: sessionId })
      .populate('voterId', 'username imageUrl')
      .populate('votedForId', 'username imageUrl');

    if (!votes.length) {
      return res.status(404).json({ message: 'No votes found for this session ID' });
    }
    res.json(votes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch detailed results', error: error.message });
  }
});

module.exports = router;
