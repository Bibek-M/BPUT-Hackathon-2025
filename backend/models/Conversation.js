const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    tokens: Number,
    model: String,
    responseTime: Number // in milliseconds
  }
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    default: 'New Conversation'
  },
  messages: [messageSchema],
  context: {
    type: String,
    default: '' // User-provided context/notes
  },
  settings: {
    aiProvider: {
      type: String,
      enum: ['openai', 'gemini'],
      default: 'gemini'
    },
    model: {
      type: String,
      default: 'gemini-pro'
    },
    temperature: {
      type: Number,
      min: 0,
      max: 2,
      default: 0.7
    },
    maxTokens: {
      type: Number,
      default: 1000
    }
  },
  stats: {
    totalMessages: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    }
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Update stats when messages are added
conversationSchema.methods.updateStats = function() {
  this.stats.totalMessages = this.messages.length;
  
  const assistantMessages = this.messages.filter(msg => msg.role === 'assistant');
  if (assistantMessages.length > 0) {
    const totalTokens = assistantMessages.reduce((sum, msg) => 
      sum + (msg.metadata?.tokens || 0), 0);
    const totalResponseTime = assistantMessages.reduce((sum, msg) => 
      sum + (msg.metadata?.responseTime || 0), 0);
    
    this.stats.totalTokens = totalTokens;
    this.stats.averageResponseTime = totalResponseTime / assistantMessages.length;
  }
};

// Auto-generate title from first user message
conversationSchema.methods.generateTitle = function() {
  const firstUserMessage = this.messages.find(msg => msg.role === 'user');
  if (firstUserMessage && this.title === 'New Conversation') {
    this.title = firstUserMessage.content.slice(0, 50) + 
      (firstUserMessage.content.length > 50 ? '...' : '');
  }
};

// Index for better query performance
conversationSchema.index({ userId: 1, createdAt: -1 });
conversationSchema.index({ userId: 1, isArchived: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);