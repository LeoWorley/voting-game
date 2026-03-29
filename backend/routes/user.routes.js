const express = require('express');
const { Webhook } = require('svix');
const { User } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { ensureCurrentUser } = require('../services/room.service');

const router = express.Router();

function verifyClerkWebhook(req) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    const error = new Error('Clerk webhook secret not configured');
    error.status = 500;
    error.code = 'CLERK_WEBHOOK_SECRET_NOT_CONFIGURED';
    throw error;
  }

  const headers = {
    'svix-id': req.headers['svix-id'],
    'svix-timestamp': req.headers['svix-timestamp'],
    'svix-signature': req.headers['svix-signature'],
  };

  if (!headers['svix-id'] || !headers['svix-timestamp'] || !headers['svix-signature']) {
    const error = new Error('Missing Svix signature headers');
    error.status = 400;
    error.code = 'INVALID_WEBHOOK_SIGNATURE_HEADERS';
    throw error;
  }

  const payload = req.rawBody ? req.rawBody.toString('utf8') : null;
  if (!payload) {
    const error = new Error('Webhook payload missing raw body');
    error.status = 400;
    error.code = 'MISSING_WEBHOOK_BODY';
    throw error;
  }

  const webhook = new Webhook(secret);
  return webhook.verify(payload, headers);
}

router.post('/sync', async (req, res) => {
  let event;
  try {
    event = verifyClerkWebhook(req);
  } catch (error) {
    return res.status(error.status || 400).json({
      code: error.code || 'INVALID_WEBHOOK',
      message: error.message || 'Invalid webhook',
    });
  }

  const eventType = event.type;
  const data = event.data;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    try {
      const { id, image_url: imageUrl, username } = data;

      await User.findOneAndUpdate(
        { clerkId: id },
        {
          username: username || id,
          imageUrl: imageUrl || '',
        },
        { upsert: true, new: true }
      );

      return res.status(200).json({ code: 'USER_SYNCED', message: 'User synchronized' });
    } catch (error) {
      return res.status(500).json({ code: 'USER_SYNC_FAILED', message: 'Error synchronizing user' });
    }
  }

  return res.status(200).json({ code: 'EVENT_IGNORED', message: 'Event handled' });
});

router.post('/ensure', authMiddleware, async (req, res) => {
  try {
    const user = await ensureCurrentUser({
      clerkId: req.auth?.userId,
      username: req.body?.username,
      imageUrl: req.body?.imageUrl,
    });
    return res.json({
      code: 'USER_ENSURED',
      message: 'User ensured successfully',
      user,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Failed to ensure user',
      ...(error.details !== undefined ? { details: error.details } : {}),
    });
  }
});

module.exports = router;
