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

// Ensure a voter can have at most one vote per point tier (1 or 2) per session
voteSchema.index({ sessionId: 1, voterId: 1, points: 1 }, { unique: true });
// Helpful index for aggregations/lookups
voteSchema.index({ sessionId: 1, voterId: 1, votedForId: 1 });
voteSchema.index({ sessionId: 1 });

module.exports = mongoose.models.Vote || mongoose.model('Vote', voteSchema);
