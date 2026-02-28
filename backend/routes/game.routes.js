const express = require('express');
const router = express.Router();
const { getVotingStatus } = require('../services/game.service');
const { handleRouteError } = require('../utils/http');

router.get('/status', async (req, res) => {
  try {
    const status = await getVotingStatus(req.auth?.userId);
    return res.json(status);
  } catch (error) {
    return handleRouteError(res, error, 'Failed to fetch voting status');
  }
});

module.exports = router;
