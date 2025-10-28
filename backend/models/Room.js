const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  maxParticipants: {
    type: Number,
    default: 20,
    min: 2,
    max: 100
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: false
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
roomSchema.index({ createdBy: 1, createdAt: -1 });
roomSchema.index({ isActive: 1 });
roomSchema.index({ inviteCode: 1 });

module.exports = mongoose.model('Room', roomSchema);
