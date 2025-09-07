const mongoose = require('mongoose');

const votingSessionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  eliminatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Speed up queries for active session checks
votingSessionSchema.index({ isActive: 1 });
votingSessionSchema.index({ endTime: -1 });

module.exports = mongoose.models.VotingSession || mongoose.model('VotingSession', votingSessionSchema);
