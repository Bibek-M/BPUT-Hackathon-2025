const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  code: {
    type: String,
    unique: true,
    uppercase: true,
    minlength: 6,
    maxlength: 8
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    allowStudentQuestions: {
      type: Boolean,
      default: true
    },
    maxStudents: {
      type: Number,
      default: 50
    }
  }
}, {
  timestamps: true
});

// Generate unique course code
courseSchema.pre('save', function(next) {
  if (!this.isNew || this.code) return next();
  
  // Generate a random 6-character code
  this.code = Math.random().toString(36).substring(2, 8).toUpperCase();
  next();
});

module.exports = mongoose.model('Course', courseSchema);