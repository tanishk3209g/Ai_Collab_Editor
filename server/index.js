// Import required packages
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Create express app
const app = express();
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.io to server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Basic route to test server
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
  });
});

// Start server on port 5000
server.listen(8080, () => {
  console.log('🚀 Server running on http://localhost:8080');
});