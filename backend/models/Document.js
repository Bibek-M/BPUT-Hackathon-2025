const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  originalFile: {
    name: String,
    type: String,
    size: Number
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'file'],
    required: true
  },
  metadata: {
    wordCount: Number,
    language: String,
    topics: [String]
  },
  embeddings: [{
    chunk: String,
    vector: [Number],
    chunkIndex: Number
  }],
  isProcessed: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient searching
documentSchema.index({ course: 1, isActive: 1 });
documentSchema.index({ 'embeddings.vector': 1 });

module.exports = mongoose.model('Document', documentSchema);