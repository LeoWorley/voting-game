const express = require('express');
const router = express.Router();
const { getLatestResults, getAggregateResults } = require('../services/game.service');
const { handleRouteError } = require('../utils/http');

router.get('/latest', async (req, res) => {
  try {
    const latest = await getLatestResults();
    return res.json(latest);
  } catch (error) {
    return handleRouteError(res, error, 'Failed to fetch latest results');
  }
});

router.get('/aggregate/:sessionId', async (req, res) => {
  try {
    const aggregate = await getAggregateResults(req.params.sessionId);
    return res.json(aggregate);
  } catch (error) {
    return handleRouteError(res, error, 'Failed to fetch aggregate results');
  }
});

module.exports = router;
