const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Simple in-memory storage for classroom sessions
// In production, you'd want to use Redis or a database
const activeClassrooms = new Map();

// @route   POST /api/classroom/create-room
// @desc    Create a new classroom room
// @access  Private
router.post('/create-room', auth, [
  body('roomName')
    .trim()
    .notEmpty()
    .withMessage('Room name is required')
    .isLength({ max: 100 })
    .withMessage('Room name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { roomName, description = '', isPrivate = false } = req.body;
    
    // Generate unique room ID
    const roomId = 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Create room object
    const room = {
      id: roomId,
      name: roomName,
      description,
      createdBy: req.user._id,
      createdByUsername: req.user.username,
      createdAt: new Date(),
      isPrivate,
      participants: [],
      maxParticipants: 50,
      isActive: true
    };

    // Store room
    activeClassrooms.set(roomId, room);

    res.status(201).json({
      message: 'Classroom created successfully',
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        createdBy: room.createdByUsername,
        createdAt: room.createdAt,
        participantCount: 0,
        maxParticipants: room.maxParticipants
      }
    });

  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ 
      error: 'Failed to create classroom',
      message: error.message 
    });
  }
});

// @route   GET /api/classroom/rooms
// @desc    Get available classroom rooms
// @access  Private
router.get('/rooms', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    
    // Convert Map to Array and filter
    const rooms = Array.from(activeClassrooms.values())
      .filter(room => 
        room.isActive && 
        (!room.isPrivate || room.createdBy.toString() === req.user._id.toString()) &&
        room.name.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRooms = rooms.slice(startIndex, endIndex);

    // Format response
    const roomsWithStats = paginatedRooms.map(room => ({
      id: room.id,
      name: room.name,
      description: room.description,
      createdBy: room.createdByUsername,
      createdAt: room.createdAt,
      participantCount: room.participants.length,
      maxParticipants: room.maxParticipants,
      isPrivate: room.isPrivate
    }));

    res.json({
      rooms: roomsWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: rooms.length
      }
    });

  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ 
      error: 'Failed to get classroom rooms',
      message: error.message 
    });
  }
});

// @route   GET /api/classroom/rooms/:roomId
// @desc    Get specific room details
// @access  Private
router.get('/rooms/:roomId', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = activeClassrooms.get(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user has access
    if (room.isPrivate && room.createdBy.toString() !== req.user._id.toString()) {
      // Check if user is already a participant
      const isParticipant = room.participants.some(p => p.userId === req.user._id.toString());
      if (!isParticipant) {
        return res.status(403).json({ error: 'Access denied to private room' });
      }
    }

    const roomDetails = {
      id: room.id,
      name: room.name,
      description: room.description,
      createdBy: room.createdByUsername,
      createdAt: room.createdAt,
      participants: room.participants.map(p => ({
        userId: p.userId,
        username: p.username,
        joinedAt: p.joinedAt
      })),
      participantCount: room.participants.length,
      maxParticipants: room.maxParticipants,
      isPrivate: room.isPrivate,
      isActive: room.isActive
    };

    res.json({ room: roomDetails });

  } catch (error) {
    console.error('Get room details error:', error);
    res.status(500).json({ 
      error: 'Failed to get room details',
      message: error.message 
    });
  }
});

// @route   POST /api/classroom/rooms/:roomId/join
// @desc    Join a classroom room
// @access  Private
router.post('/rooms/:roomId/join', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = activeClassrooms.get(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.isActive) {
      return res.status(400).json({ error: 'Room is no longer active' });
    }

    // Check if room is full
    if (room.participants.length >= room.maxParticipants) {
      return res.status(400).json({ error: 'Room is full' });
    }

    // Check if user is already in the room
    const existingParticipant = room.participants.find(p => p.userId === req.user._id.toString());
    if (existingParticipant) {
      return res.json({ 
        message: 'Already in room',
        room: {
          id: room.id,
          name: room.name
        }
      });
    }

    // Add user to participants
    room.participants.push({
      userId: req.user._id.toString(),
      username: req.user.username,
      joinedAt: new Date()
    });

    // Update room
    activeClassrooms.set(roomId, room);

    res.json({
      message: 'Joined room successfully',
      room: {
        id: room.id,
        name: room.name,
        participantCount: room.participants.length
      }
    });

  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ 
      error: 'Failed to join room',
      message: error.message 
    });
  }
});

// @route   POST /api/classroom/rooms/:roomId/leave
// @desc    Leave a classroom room
// @access  Private
router.post('/rooms/:roomId/leave', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = activeClassrooms.get(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Remove user from participants
    room.participants = room.participants.filter(p => p.userId !== req.user._id.toString());

    // If room is empty and creator left, mark as inactive
    if (room.participants.length === 0 && room.createdBy.toString() === req.user._id.toString()) {
      room.isActive = false;
    }

    // Update room
    activeClassrooms.set(roomId, room);

    res.json({ message: 'Left room successfully' });

  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ 
      error: 'Failed to leave room',
      message: error.message 
    });
  }
});

// @route   DELETE /api/classroom/rooms/:roomId
// @desc    Delete a classroom room (creator only)
// @access  Private
router.delete('/rooms/:roomId', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = activeClassrooms.get(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is the creator
    if (room.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only room creator can delete the room' });
    }

    // Remove room
    activeClassrooms.delete(roomId);

    res.json({ message: 'Room deleted successfully' });

  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ 
      error: 'Failed to delete room',
      message: error.message 
    });
  }
});

// @route   GET /api/classroom/my-rooms
// @desc    Get rooms created by current user
// @access  Private
router.get('/my-rooms', auth, async (req, res) => {
  try {
    const myRooms = Array.from(activeClassrooms.values())
      .filter(room => room.createdBy.toString() === req.user._id.toString())
      .map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        createdAt: room.createdAt,
        participantCount: room.participants.length,
        maxParticipants: room.maxParticipants,
        isPrivate: room.isPrivate,
        isActive: room.isActive
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ rooms: myRooms });

  } catch (error) {
    console.error('Get my rooms error:', error);
    res.status(500).json({ 
      error: 'Failed to get your rooms',
      message: error.message 
    });
  }
});

// @route   PUT /api/classroom/rooms/:roomId
// @desc    Update room settings (creator only)
// @access  Private
router.put('/rooms/:roomId', auth, [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Room name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('maxParticipants')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max participants must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { roomId } = req.params;
    const room = activeClassrooms.get(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is the creator
    if (room.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only room creator can update the room' });
    }

    // Update room properties
    if (req.body.name) room.name = req.body.name;
    if (req.body.description !== undefined) room.description = req.body.description;
    if (req.body.maxParticipants) room.maxParticipants = req.body.maxParticipants;
    if (req.body.isPrivate !== undefined) room.isPrivate = req.body.isPrivate;

    room.updatedAt = new Date();

    // Update room
    activeClassrooms.set(roomId, room);

    res.json({
      message: 'Room updated successfully',
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        maxParticipants: room.maxParticipants,
        isPrivate: room.isPrivate
      }
    });

  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ 
      error: 'Failed to update room',
      message: error.message 
    });
  }
});

// Helper function to clean up inactive rooms (called periodically)
const cleanupInactiveRooms = () => {
  const now = new Date();
  const maxInactiveTime = 24 * 60 * 60 * 1000; // 24 hours

  for (const [roomId, room] of activeClassrooms.entries()) {
    const timeSinceCreated = now - room.createdAt;
    const hasParticipants = room.participants.length > 0;

    // Remove rooms that are inactive for more than 24 hours and have no participants
    if (!hasParticipants && (timeSinceCreated > maxInactiveTime || !room.isActive)) {
      activeClassrooms.delete(roomId);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupInactiveRooms, 60 * 60 * 1000);

module.exports = router;