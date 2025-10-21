const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const quizRoutes = require('./routes/quiz');
const progressRoutes = require('./routes/progress');
const classroomRoutes = require('./routes/classroom');
const courseRoutes = require('./routes/course');
const documentRoutes = require('./routes/document');
const ragRoutes = require('./routes/rag');

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173", // Vite default port
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
console.log('📝 Registering routes...');
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes registered');
app.use('/api/chat', chatRoutes);
console.log('✅ Chat routes registered');
app.use('/api/quiz', quizRoutes);
console.log('✅ Quiz routes registered');
app.use('/api/progress', progressRoutes);
console.log('✅ Progress routes registered');
app.use('/api/classroom', classroomRoutes);
console.log('✅ Classroom routes registered');
app.use('/api/courses', courseRoutes);
console.log('✅ Course routes registered');
app.use('/api/documents', documentRoutes);
console.log('✅ Document routes registered');
app.use('/api/rag', ragRoutes);
console.log('✅ RAG routes registered');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
const connectedUsers = new Map();
const activeRooms = new Map();

io.on('connection', (socket) => {
  console.log(👤 User connected: ${socket.id});
  const { userId, username, roomId } = socket.handshake.auth;

  // Auto-join room if provided in auth
  if (roomId && username) {
    socket.join(roomId);
    
    // Track user in room
    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, []);
    }
    
    const participant = { id: socket.id, username, isHost: false };
    activeRooms.get(roomId).push(participant);
    connectedUsers.set(socket.id, { roomId, username, userId });

    // Send room info to the joining user
    socket.emit('room-info', {
      id: roomId,
      name: Room ${roomId},
      participants: activeRooms.get(roomId).length
    });
    
    // Update participants list
    io.to(roomId).emit('participants-update', activeRooms.get(roomId));
    
    // Broadcast user joined
    socket.to(roomId).emit('user-joined', { username, userId: socket.id });
    
    console.log(🏠 User ${username} joined room ${roomId});
  }

  // Handle manual room joining
  socket.on('join-room', (data) => {
    const { roomId: newRoomId, username: newUsername } = data;
    socket.join(newRoomId);
    
    if (!activeRooms.has(newRoomId)) {
      activeRooms.set(newRoomId, []);
    }
    
    const participant = { id: socket.id, username: newUsername, isHost: false };
    activeRooms.get(newRoomId).push(participant);
    connectedUsers.set(socket.id, { roomId: newRoomId, username: newUsername });

    socket.emit('room-info', {
      id: newRoomId,
      name: Room ${newRoomId},
      participants: activeRooms.get(newRoomId).length
    });
    
    io.to(newRoomId).emit('participants-update', activeRooms.get(newRoomId));
    socket.to(newRoomId).emit('user-joined', { username: newUsername, userId: socket.id });
  });

  // Handle sending messages
  socket.on('send-message', (message) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      // Message is already formatted from client, just broadcast to room
      socket.to(user.roomId).emit('message-received', message);
    }
  });

  // Handle leaving room
  socket.on('leave-room', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      handleUserLeave(socket.id, user);
    }
  });

  // Handle screen sharing signals
  socket.on('screen-share-start', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.to(user.roomId).emit('screen-share-start', {
        userId: socket.id,
        username: user.username
      });
    }
  });

  socket.on('screen-share-stop', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.to(user.roomId).emit('screen-share-stop', {
        userId: socket.id,
        username: user.username
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      handleUserLeave(socket.id, user);
    }
    console.log(👤 User disconnected: ${socket.id});
  });
});

// Helper function to handle user leaving
function handleUserLeave(socketId, user) {
  const { roomId, username } = user;
  
  // Remove user from room tracking
  if (activeRooms.has(roomId)) {
    const roomUsers = activeRooms.get(roomId);
    const userIndex = roomUsers.findIndex(u => u.id === socketId);
    if (userIndex > -1) {
      roomUsers.splice(userIndex, 1);
    }
    
    if (roomUsers.length === 0) {
      activeRooms.delete(roomId);
    } else {
      // Update room participants
      io.to(roomId).emit('participants-update', roomUsers);
    }
  }
  
  // Broadcast user left
  io.to(roomId).emit('user-left', { username, userId: socketId });
  
  connectedUsers.delete(socketId);
  console.log(👋 User ${username} left room ${roomId});
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(🚀 Server running on port ${PORT});
  console.log(📡 Socket.io server ready for connections);
});