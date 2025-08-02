const express = require('express');
const router = express.Router();
const { User } = require('../models');

// NOTE: For production, you must verify Clerk webhooks for security.
// This endpoint handles Clerk's user creation and update webhooks.
router.post('/sync', async (req, res) => {
  const payload = req.body;
  const eventType = payload.type;
  const data = payload.data;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    try {
      const { id, image_url, username } = data;

      await User.findOneAndUpdate(
        { clerkId: id },
        { username: username, imageUrl: image_url },
        { upsert: true, new: true } // Creates a doc if none is found
      );

      return res.status(200).json({ message: 'User synchronized' });
    } catch (error) {
      return res.status(500).json({ message: 'Error synchronizing user' });
    }
  }
  
  res.status(200).json({ message: 'Event handled' });
});

module.exports = router;
