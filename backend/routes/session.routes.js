const express = require('express');
const router = express.Router();
const { getSessionHistory } = require('../services/game.service');
const { handleRouteError } = require('../utils/http');

router.get('/history', async (req, res) => {
  try {
    const sessions = await getSessionHistory();
    return res.json({ sessions });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to fetch session history');
  }
});

module.exports = router;
