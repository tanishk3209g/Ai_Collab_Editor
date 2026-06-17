const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
})

// Store room data
const rooms = {}

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id)

  // User joins room
  socket.on('join-room', ({ roomId, username }) => {
    socket.join(roomId)
    socket.username = username
    socket.roomId = roomId

    // Initialize room if first user
    if (!rooms[roomId]) {
      rooms[roomId] = {
        code: '// Start coding here...\n',
        language: 'javascript',
        users: []
      }
    }

    rooms[roomId].users.push(username)
    console.log(`${username} joined room: ${roomId}`)

    // Send current room state to new user
    socket.emit('room-state', {
      code: rooms[roomId].code,
      language: rooms[roomId].language
    })

    // Tell others someone joined
    socket.to(roomId).emit('user-joined', username)
  })

  // User changed code
  socket.on('code-change', ({ roomId, code }) => {
    if (rooms[roomId]) {
      rooms[roomId].code = code
    }
    // Broadcast to everyone else in room
    socket.to(roomId).emit('code-update', code)
  })

  // User changed language
  socket.on('language-change', ({ roomId, language }) => {
    if (rooms[roomId]) {
      rooms[roomId].language = language
    }
    socket.to(roomId).emit('language-update', language)
  })

  // User sends chat message
  socket.on('send-message', ({ roomId, username, message }) => {
    socket.to(roomId).emit('receive-message', { username, message })
    console.log(`${username} in ${roomId}: ${message}`)
  })

  // User disconnects
  socket.on('disconnect', () => {
    const { username, roomId } = socket
    if (username && roomId) {
      if (rooms[roomId]) {
        rooms[roomId].users = rooms[roomId].users.filter(u => u !== username)
      }
      socket.to(roomId).emit('user-left', username)
      console.log(`${username} left room: ${roomId}`)
    }
  })
})

server.listen(8080, () => {
  console.log('🚀 Server running on http://localhost:8080')
})