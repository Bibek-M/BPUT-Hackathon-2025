const express = require('express');
const { body, validationResult } = require('express-validator');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const aiService = require('../utils/aiService');

const router = express.Router();

// @route   GET /api/chat/conversations
// @desc    Get user's conversations
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, archived = false } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const conversations = await Conversation.find({
      userId: req.user._id,
      isArchived: archived === 'true'
    })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select('title updatedAt stats messages')
    .lean();

    // Add last message preview
    const conversationsWithPreview = conversations.map(conv => ({
      ...conv,
      lastMessage: conv.messages.length > 0 
        ? conv.messages[conv.messages.length - 1]
        : null,
      messageCount: conv.messages.length
    }));

    res.json({
      conversations: conversationsWithPreview,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await Conversation.countDocuments({
          userId: req.user._id,
          isArchived: archived === 'true'
        })
      }
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ 
      error: 'Failed to get conversations',
      message: error.message 
    });
  }
});

// @route   POST /api/chat/conversations
// @desc    Create new conversation
// @access  Private
router.post('/conversations', auth, [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  body('context')
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Context cannot exceed 10000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { title, context } = req.body;

    const conversation = new Conversation({
      userId: req.user._id,
      title: title || 'New Conversation',
      context: context || '',
      settings: {
        aiProvider: req.user.preferences.aiProvider,
        model: req.user.preferences.aiProvider === 'openai' ? 'gpt-3.5-turbo' : 'gemini-pro'
      }
    });

    await conversation.save();

    res.status(201).json({
      message: 'Conversation created successfully',
      conversation
    });

  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ 
      error: 'Failed to create conversation',
      message: error.message 
    });
  }
});

// @route   GET /api/chat/conversations/:id
// @desc    Get conversation by ID
// @access  Private
router.get('/conversations/:id', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ conversation });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ 
      error: 'Failed to get conversation',
      message: error.message 
    });
  }
});

// @route   POST /api/chat/conversations/:id/messages
// @desc    Send message to AI
// @access  Private
router.post('/conversations/:id/messages', auth, [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 5000 })
    .withMessage('Message cannot exceed 5000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { message } = req.body;
    const conversationId = req.params.id;

    // Get conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Add user message
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    conversation.messages.push(userMessage);

    // Prepare conversation history for AI
    const conversationHistory = conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Generate AI response
    const startTime = Date.now();
    try {
      const aiResponse = await aiService.generateResponse(
        conversationHistory,
        conversation.context,
        {
          ...conversation.settings,
          ...req.user.preferences
        }
      );

      const responseTime = Date.now() - startTime;

      // Add AI response message
      const aiMessage = {
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        metadata: {
          tokens: aiResponse.tokens,
          model: aiResponse.model,
          responseTime
        }
      };
      conversation.messages.push(aiMessage);

      // Update conversation title if it's the first user message
      conversation.generateTitle();
      conversation.updateStats();

      await conversation.save();

      // Update user stats
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { 'stats.totalMessages': 1 }
      });

      res.json({
        message: 'Message sent successfully',
        userMessage,
        aiMessage,
        conversation: {
          _id: conversation._id,
          title: conversation.title,
          stats: conversation.stats
        }
      });

    } catch (aiError) {
      // Save user message even if AI fails
      await conversation.save();
      
      console.error('AI Service Error:', aiError);
      res.status(500).json({ 
        error: 'Failed to generate AI response',
        message: aiError.message,
        userMessage // Still return the user message
      });
    }

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      error: 'Failed to send message',
      message: error.message 
    });
  }
});

// @route   PUT /api/chat/conversations/:id
// @desc    Update conversation
// @access  Private
router.put('/conversations/:id', auth, [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  body('context')
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Context cannot exceed 10000 characters'),
  body('isArchived')
    .optional()
    .isBoolean()
    .withMessage('isArchived must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: errors.array()
      });
    }

    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.context !== undefined) updates.context = req.body.context;
    if (req.body.isArchived !== undefined) updates.isArchived = req.body.isArchived;

    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      message: 'Conversation updated successfully',
      conversation
    });

  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ 
      error: 'Failed to update conversation',
      message: error.message 
    });
  }
});

// @route   DELETE /api/chat/conversations/:id
// @desc    Delete conversation
// @access  Private
router.delete('/conversations/:id', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted successfully' });

  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ 
      error: 'Failed to delete conversation',
      message: error.message 
    });
  }
});

// @route   POST /api/chat/quick-ask
// @desc    Quick AI query without saving to conversation
// @access  Private
router.post('/quick-ask', auth, [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 5000 })
    .withMessage('Message cannot exceed 5000 characters'),
  body('context')
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Context cannot exceed 10000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { message, context } = req.body;

    const startTime = Date.now();
    const aiResponse = await aiService.generateResponse(
      [{ role: 'user', content: message }],
      context || '',
      req.user.preferences
    );

    const responseTime = Date.now() - startTime;

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalMessages': 1 }
    });

    res.json({
      response: aiResponse.content,
      metadata: {
        tokens: aiResponse.tokens,
        model: aiResponse.model,
        responseTime
      }
    });

  } catch (error) {
    console.error('Quick ask error:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response',
      message: error.message 
    });
  }
});

// Session routes (aliases for conversations to match frontend expectations)
// @route   GET /api/chat/sessions
// @desc    Get user's chat sessions (alias for conversations)
// @access  Private
router.get('/sessions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sessions = await Conversation.find({
      userId: req.user._id,
      isArchived: false
    })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select('title updatedAt messages')
    .lean();

    const formattedSessions = sessions.map(session => ({
      id: session._id,
      title: session.title || 'Untitled Session',
      lastMessage: session.messages.length > 0 
        ? session.messages[session.messages.length - 1].content.slice(0, 100) + '...'
        : null,
      updatedAt: session.updatedAt
    }));

    res.json({ sessions: formattedSessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// @route   POST /api/chat/sessions
// @desc    Create new chat session
// @access  Private
router.post('/sessions', auth, async (req, res) => {
  try {
    const { title } = req.body;

    const session = new Conversation({
      userId: req.user._id,
      title: title || 'New Chat Session',
      settings: {
        aiProvider: req.user.preferences?.aiProvider || 'gemini',
        model: req.user.preferences?.aiProvider === 'openai' ? 'gpt-3.5-turbo' : 'gemini-pro'
      }
    });

    await session.save();

    res.status(201).json({
      session: {
        id: session._id,
        title: session.title
      }
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// @route   DELETE /api/chat/sessions/:id
// @desc    Delete chat session
// @access  Private
router.delete('/sessions/:id', auth, async (req, res) => {
  try {
    const session = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// @route   POST /api/chat/messages
// @desc    Send message to AI (quick chat)
// @access  Private
router.post('/messages', auth, [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required'),
  body('context')
    .optional()
    .trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { message, context } = req.body;

    const aiResponse = await aiService.generateResponse(
      [{ role: 'user', content: message }],
      context || '',
      req.user.preferences || {}
    );

    res.json({ message: aiResponse.content });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

module.exports = router;
