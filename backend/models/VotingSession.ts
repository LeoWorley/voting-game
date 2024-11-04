import mongoose from 'mongoose';

const votingSessionSchema = new mongoose.Schema({
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

export default mongoose.models.VotingSession || mongoose.model('VotingSession', votingSessionSchema); 