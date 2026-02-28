const express = require('express');
const router = express.Router();
const { adminApiKeyGuard } = require('../middleware/admin');
const { getDetailedResults, openSession, closeAndEliminate } = require('../services/game.service');
const { handleRouteError } = require('../utils/http');

router.use(adminApiKeyGuard);

router.get('/detailed-results/:sessionId', async (req, res) => {
  try {
    const votes = await getDetailedResults(req.params.sessionId);
    return res.json({ votes });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to fetch detailed results');
  }
});

router.post('/sessions/open', async (req, res) => {
  try {
    const session = await openSession({
      actor: 'admin_api_key',
      name: req.body?.name,
      startTime: req.body?.startTime,
      endTime: req.body?.endTime,
    });
    return res.status(201).json({
      code: 'SESSION_OPENED',
      message: 'Session opened successfully',
      session,
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to open session');
  }
});

router.post('/sessions/close-and-eliminate', async (req, res) => {
  try {
    const result = await closeAndEliminate({
      actor: 'admin_api_key',
      manualTieBreakUserId: req.body?.manualTieBreakUserId || null,
      openNextSession: Boolean(req.body?.openNextSession),
      nextSession: req.body?.nextSession || null,
    });

    return res.json({
      code: 'SESSION_CLOSED',
      message: 'Session closed and elimination applied',
      ...result,
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to close session');
  }
});

module.exports = router;
