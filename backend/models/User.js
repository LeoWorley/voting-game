const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'eliminated'],
    default: 'active'
  },
  eliminationSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VotingSession',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
