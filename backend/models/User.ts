import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  eliminatedAt: {
    type: Date,
    default: null
  },
  votingRights: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.models.User || mongoose.model('User', userSchema); 