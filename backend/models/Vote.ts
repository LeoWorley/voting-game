import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema({
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  weight: {
    type: Number,
    required: true,
    enum: [1, 2] // Only allows values of 1 or 2
  },
  votingSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VotingSession',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.Vote || mongoose.model('Vote', voteSchema); 