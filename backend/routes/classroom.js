const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const Room = require('../models/Room');
const crypto = require('crypto');

const router = express.Router();

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
    .withMessage('Description cannot exceed 500 characters'),
  body('maxParticipants')
    .optional()
    .isInt({ min: 2, max: 100 })
    .withMessage('Max participants must be between 2 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: errors.array()
      });
    }

    const { roomName, description = '', isPrivate = false, maxParticipants = 20 } = req.body;
    
    // Generate invite code for private rooms
    const inviteCode = isPrivate 
      ? crypto.randomBytes(4).toString('hex').toUpperCase()
      : null;

    const room = new Room({
      name: roomName,
      description,
      createdBy: req.user._id,
      maxParticipants,
      isPrivate,
      isActive: false,
      participants: [req.user._id],
      inviteCode
    });

    await room.save();
    await room.populate('createdBy', 'username profile');

    res.status(201).json({
      message: 'Classroom created successfully',
      room: {
        id: room._id,
        name: room.name,
        description: room.description,
        createdBy: room.createdBy.username,
        createdAt: room.createdAt,
        participantCount: 1,
        maxParticipants: room.maxParticipants,
        isPrivate: room.isPrivate,
        inviteCode: room.inviteCode
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
    const { search = '' } = req.query;
    
    const query = {
      $or: [
        { isPrivate: false },
        { createdBy: req.user._id },
        { participants: req.user._id }
      ]
    };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const rooms = await Room.find(query)
      .populate('createdBy', 'username profile')
      .sort({ isActive: -1, createdAt: -1 })
      .lean();

    const roomsWithStats = rooms.map(room => ({
      id: room._id,
      name: room.name,
      description: room.description,
      createdBy: room.createdBy.username,
      createdAt: room.createdAt,
      participantCount: room.participants.length,
      maxParticipants: room.maxParticipants,
      isPrivate: room.isPrivate,
      isActive: room.isActive
    }));

    res.json({ rooms: roomsWithStats });

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
    const room = await Room.findById(roomId)
      .populate('createdBy', 'username profile')
      .populate('participants', 'username profile');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user has access to private room
    if (room.isPrivate) {
      const hasAccess = room.createdBy._id.toString() === req.user._id.toString() ||
                       room.participants.some(p => p._id.toString() === req.user._id.toString());
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to private room' });
      }
    }

    const roomDetails = {
      id: room._id,
      name: room.name,
      description: room.description,
      createdBy: room.createdBy.username,
      createdAt: room.createdAt,
      participants: room.participants.map(p => ({
        userId: p._id,
        username: p.username,
        profile: p.profile
      })),
      participantCount: room.participants.length,
      maxParticipants: room.maxParticipants,
      isPrivate: room.isPrivate,
      isActive: room.isActive,
      inviteCode: room.isPrivate ? room.inviteCode : null
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
    const { inviteCode } = req.body;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Verify invite code for private rooms
    if (room.isPrivate && room.inviteCode !== inviteCode) {
      return res.status(403).json({ error: 'Invalid invite code' });
    }

    // Check if room is full
    if (room.participants.length >= room.maxParticipants) {
      return res.status(400).json({ error: 'Room is full' });
    }

    // Check if user is already in the room
    if (room.participants.includes(req.user._id)) {
      return res.json({ 
        message: 'Already in room',
        room: {
          id: room._id,
          name: room.name
        }
      });
    }

    // Add user to participants
    room.participants.push(req.user._id);
    await room.save();

    res.json({
      message: 'Joined room successfully',
      room: {
        id: room._id,
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
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Remove user from participants
    room.participants = room.participants.filter(
      p => p.toString() !== req.user._id.toString()
    );

    // If creator leaves or room is empty, deactivate
    if (room.createdBy.toString() === req.user._id.toString() || room.participants.length === 0) {
      room.isActive = false;
    }

    await room.save();

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
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is the creator
    if (room.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only room creator can delete the room' });
    }

    await Room.findByIdAndDelete(roomId);

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
    const myRooms = await Room.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const roomsFormatted = myRooms.map(room => ({
      id: room._id,
      name: room.name,
      description: room.description,
      createdAt: room.createdAt,
      participantCount: room.participants.length,
      maxParticipants: room.maxParticipants,
      isPrivate: room.isPrivate,
      isActive: room.isActive
    }));

    res.json({ rooms: roomsFormatted });

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
    .isInt({ min: 2, max: 100 })
    .withMessage('Max participants must be between 2 and 100')
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
    const room = await Room.findById(roomId);

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

    await room.save();

    res.json({
      message: 'Room updated successfully',
      room: {
        id: room._id,
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

// @route   PUT /api/classroom/rooms/:roomId/activate
// @desc    Activate/deactivate room (creator only)
// @access  Private
router.put('/rooms/:roomId/activate', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { isActive } = req.body;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only room creator can activate/deactivate the room' });
    }

    room.isActive = isActive;
    await room.save();

    res.json({
      message: `Room ${isActive ? 'activated' : 'deactivated'} successfully`,
      room: {
        id: room._id,
        name: room.name,
        isActive: room.isActive
      }
    });

  } catch (error) {
    console.error('Activate room error:', error);
    res.status(500).json({ 
      error: 'Failed to update room status',
      message: error.message 
    });
  }
});

module.exports = router;
