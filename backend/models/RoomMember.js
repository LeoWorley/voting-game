const mongoose = require('mongoose');

const roomMemberSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['host', 'member'],
    default: 'member',
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'eliminated'],
    default: 'active',
    required: true,
  },
  eliminationSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VotingSession',
    default: null,
  },
}, {
  timestamps: true,
});

roomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });
roomMemberSchema.index({ roomId: 1, role: 1 });
roomMemberSchema.index({ roomId: 1, status: 1 });

module.exports = mongoose.models.RoomMember || mongoose.model('RoomMember', roomMemberSchema);
