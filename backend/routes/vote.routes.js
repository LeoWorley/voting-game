const express = require('express');
const router = express.Router();
const { submitVotes, getMyVotes } = require('../services/game.service');
const { handleRouteError } = require('../utils/http');

router.post('/', async (req, res) => {
  try {
    const result = await submitVotes({
      clerkId: req.auth?.userId,
      primaryVote: req.body?.primaryVote,
      secondaryVote: req.body?.secondaryVote,
    });

    return res.status(201).json({
      code: 'VOTES_SAVED',
      message: 'Votes submitted successfully',
      ...result,
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to submit votes');
  }
});

router.get('/me', async (req, res) => {
  try {
    const sessionId = req.query?.sessionId || 'current';
    const votes = await getMyVotes({
      clerkId: req.auth?.userId,
      sessionId,
    });

    return res.json(votes);
  } catch (error) {
    return handleRouteError(res, error, 'Failed to fetch your votes');
  }
});

module.exports = router;
