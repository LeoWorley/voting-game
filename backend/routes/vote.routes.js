const express = require('express');
const router = express.Router();
const { Vote, VotingSession, User } = require('../models');

router.post('/', async (req, res) => {
  try {
    // Clerk-authenticated user from middleware
    const voterClerkId = req.auth?.userId;
    if (!voterClerkId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { primaryVote, secondaryVote } = req.body; // Expects { userId, reason }

    // Basic payload validation
    if (!primaryVote?.userId || !secondaryVote?.userId) {
      return res.status(400).json({ message: 'Both primary and secondary votes are required.' });
    }

    if (String(primaryVote.userId) === String(secondaryVote.userId)) {
      return res.status(400).json({ message: 'Primary and secondary votes must be for different users.' });
    }

    const now = new Date();

    // Validate ObjectId format
    const isValidObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v));
    if (!isValidObjectId(primaryVote.userId) || !isValidObjectId(secondaryVote.userId)) {
      return res.status(400).json({ message: 'Invalid user id format for vote targets.' });
    }
    const activeSession = await VotingSession.findOne({ isActive: true });

    if (!activeSession) {
      return res.status(400).json({ message: 'No active voting session is available.' });
    }

    const voter = await User.findOne({ clerkId: voterClerkId });
    if (!voter || voter.status !== 'active') {
      return res.status(403).json({ message: 'Voter is not active or not found.' });
    }

    // Ensure session windows are respected if provided
    if ((activeSession.startTime && now < activeSession.startTime) || (activeSession.endTime && now > activeSession.endTime)) {
      return res.status(400).json({ message: 'Voting is not currently open.' });
    }

    // Prevent self-voting
    if (String(primaryVote.userId) === String(voter._id) || String(secondaryVote.userId) === String(voter._id)) {
      return res.status(400).json({ message: 'You cannot vote for yourself.' });
    }

    // Verify targets are active users
    const targetIds = [primaryVote.userId, secondaryVote.userId];
    const targets = await User.find({ _id: { $in: targetIds } }, 'status');
    if (targets.length !== 2) {
      return res.status(400).json({ message: 'One or both selected users do not exist.' });
    }
    if (targets.some(t => t.status !== 'active')) {
      return res.status(400).json({ message: 'You can only vote for active users.' });
    }

    // Upsert policy: A voter may update their votes until session closes
    // This prevents duplicates and enables corrections; backed by a unique index.
    const filterBase = { sessionId: activeSession._id, voterId: voter._id };

    const primaryUpdate = Vote.findOneAndUpdate(
      { ...filterBase, points: 2 },
      {
        $set: {
          votedForId: primaryVote.userId,
          reason: primaryVote.reason ?? null,
        },
        $setOnInsert: { points: 2, sessionId: activeSession._id, voterId: voter._id }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const secondaryUpdate = Vote.findOneAndUpdate(
      { ...filterBase, points: 1 },
      {
        $set: {
          votedForId: secondaryVote.userId,
          reason: secondaryVote.reason ?? null,
        },
        $setOnInsert: { points: 1, sessionId: activeSession._id, voterId: voter._id }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Promise.all([primaryUpdate, secondaryUpdate]);

    res.status(201).json({ message: 'Votes submitted successfully' });
  } catch (error) {
    // Handle potential unique index violation with a friendlier message
    if (error && error.code === 11000) {
      return res.status(409).json({ message: 'Duplicate vote detected for this session and point value.' });
    }
    res.status(500).json({ 
      message: 'Failed to submit votes',
      error: error.message 
    });
  }
});

module.exports = router; 
