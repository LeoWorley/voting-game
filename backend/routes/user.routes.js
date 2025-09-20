const express = require('express');
const router = express.Router();
const { Webhook } = require('svix');
const { User } = require('../models');

function verifyClerkWebhook(req) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    const error = new Error('Clerk webhook secret not configured');
    error.status = 500;
    throw error;
  }

  const headers = {
    'svix-id': req.headers['svix-id'],
    'svix-timestamp': req.headers['svix-timestamp'],
    'svix-signature': req.headers['svix-signature']
  };

  if (!headers['svix-id'] || !headers['svix-timestamp'] || !headers['svix-signature']) {
    const error = new Error('Missing Svix signature headers');
    error.status = 400;
    throw error;
  }

  const payload = req.rawBody ? req.rawBody.toString('utf8') : null;
  if (!payload) {
    const error = new Error('Webhook payload missing raw body');
    error.status = 400;
    throw error;
  }

  const webhook = new Webhook(secret);
  return webhook.verify(payload, headers);
}

// Clerk webhook to upsert users (created/updated)
router.post('/sync', async (req, res) => {
  let event;
  try {
    event = verifyClerkWebhook(req);
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ message: error.message });
  }

  const eventType = event.type;
  const data = event.data;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    try {
      const { id, image_url, username } = data;

      await User.findOneAndUpdate(
        { clerkId: id },
        { username: username, imageUrl: image_url },
        { upsert: true, new: true }
      );

      return res.status(200).json({ message: 'User synchronized' });
    } catch (error) {
      return res.status(500).json({ message: 'Error synchronizing user' });
    }
  }

  return res.status(200).json({ message: 'Event handled' });
});

module.exports = router;
