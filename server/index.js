const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",  // Vite runs here
    methods: ["GET", "POST"]
  }
})

// Track users in rooms
const roomUsers = {}

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id)

  socket.on('join-room', ({ roomId, username }) => {
    socket.join(roomId)
    socket.username = username
    socket.roomId = roomId

    if (!roomUsers[roomId]) roomUsers[roomId] = []
    roomUsers[roomId].push(username)

    console.log(`${username} joined room: ${roomId}`)
    socket.to(roomId).emit('user-joined', username)
  })

  socket.on('send-message', ({ roomId, username, message }) => {
    socket.to(roomId).emit('receive-message', { username, message })
    console.log(`${username} in ${roomId}: ${message}`)
  })

  socket.on('disconnect', () => {
    const { username, roomId } = socket
    if (username && roomId) {
      if (roomUsers[roomId]) {
        roomUsers[roomId] = roomUsers[roomId].filter(u => u !== username)
      }
      socket.to(roomId).emit('user-left', username)
      console.log(`${username} left room: ${roomId}`)
    }
  })
})

server.listen(8080, () => {
  console.log('🚀 Server running on http://localhost:8080')
})