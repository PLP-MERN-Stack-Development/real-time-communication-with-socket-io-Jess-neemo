// server/server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const app = express();
const server = http.createServer(app);

// Allow your frontend origins (add Vercel URL later)
const corsOptions = {
  origin: [
    'http://localhost:5173', // Vite
    'https://socket-chat-server-pearl.vercel.app/', 
    
  ],
  credentials: true,
};

app.use(cors(corsOptions));

const io = socketIo(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
});

// In-memory storage (for demo only)
const users = {}; // { socketId: { username, room } }
const rooms = { 'general': [] }; // room -> [messages]

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  // Join default room + set username
  socket.on('join', ({ username, room = 'general' }) => {
    users[socket.id] = { username, room };
    socket.join(room);

    // Init room if new
    if (!rooms[room]) rooms[room] = [];

    // Notify others
    socket.to(room).emit('userJoined', { username });

    // Send room history & online list
    const onlineInRoom = Object.values(users)
      .filter(u => u.room === room)
      .map(u => u.username);
    
    socket.emit('init', {
      messages: rooms[room],
      online: onlineInRoom,
      currentRoom: room
    });
  });

  // Handle message
  socket.on('sendMessage', ({ text, room }) => {
    const user = users[socket.id];
    if (!user) return;

    const message = {
      id: Date.now(),
      text,
      sender: user.username,
      room,
      timestamp: new Date().toISOString(),
      read: false
    };

    rooms[room].push(message);
    io.to(room).emit('receiveMessage', message);
  });

  // Typing indicator
  socket.on('typing', ({ room, isTyping }) => {
    const user = users[socket.id];
    if (user && isTyping) {
      socket.to(room).emit('userTyping', { username: user.username });
    }
  });

  // Private message
  socket.on('privateMessage', ({ toUsername, text }) => {
    const sender = users[socket.id]?.username;
    if (!sender) return;

    // Find target socket
    const targetSocketId = Object.keys(users).find(
      id => users[id].username === toUsername
    );

    if (targetSocketId) {
      const pm = {
        id: Date.now(),
        text,
        sender,
        isPrivate: true,
        timestamp: new Date().toISOString()
      };
      io.to(targetSocketId).emit('receivePrivateMessage', pm);
      // Echo to sender
      socket.emit('receivePrivateMessage', { ...pm, to: toUsername });
    }
  });

  // Mark message as read
  socket.on('markRead', ({ messageId, room }) => {
    const roomMessages = rooms[room] || [];
    const msg = roomMessages.find(m => m.id === messageId);
    if (msg) msg.read = true;
  });

  // Disconnect cleanup
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      socket.to(user.room).emit('userLeft', { username: user.username });
      delete users[socket.id];
    }
    console.log('❌ User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Socket.io server running on port ${PORT}`);
}
);