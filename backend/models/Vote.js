const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VotingSession',
    required: true
  },
  voterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  votedForId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  points: {
    type: Number,
    required: true,
    enum: [1, 2] // 2 for primary vote, 1 for secondary
  },
  reason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

module.exports = mongoose.models.Vote || mongoose.model('Vote', voteSchema);
