require('dotenv').config()
// Loads .env file so process.env.PORT works

const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
const cors       = require('cors')
const { runCode} = require('./judge0')
// Import our runCode function

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
})

// Store all room data in memory
const rooms = {}

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id)

  // ─── JOIN ROOM ───────────────────────────────
  socket.on('join-room', ({ roomId, username }) => {
    socket.join(roomId)
    socket.username = username
    socket.roomId   = roomId

    // Create room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {
        code:     '// Start coding here...\n',
        language: 'javascript',
        users:    []
      }
    }

    rooms[roomId].users.push(username)
    console.log(`${username} joined room: ${roomId}`)

    // Send current room state to the new user
    socket.emit('room-state', {
      code:     rooms[roomId].code,
      language: rooms[roomId].language
    })

    // Tell everyone else someone joined
    socket.to(roomId).emit('user-joined', username)
  })

  // ─── CODE CHANGE ─────────────────────────────
  socket.on('code-change', ({ roomId, code }) => {
    if (rooms[roomId]) rooms[roomId].code = code
    socket.to(roomId).emit('code-update', code)
  })

  // ─── LANGUAGE CHANGE ─────────────────────────
  socket.on('language-change', ({ roomId, language }) => {
    if (rooms[roomId]) rooms[roomId].language = language
    socket.to(roomId).emit('language-update', language)
  })

  // ─── RUN CODE ────────────────────────────────
  socket.on('run-code', async ({ roomId, code, language }) => {
    console.log(`Running ${language} code in room: ${roomId}`)

    // Tell EVERYONE in room (including runner) code is starting
    // Using io.to not socket.to because runner should see loading too
    io.to(roomId).emit('execution-start')

    // Execute code via Piston
    const result = await runCode(code, language)

    // Send result to EVERYONE in room
    io.to(roomId).emit('execution-result', result)
    console.log('Execution done. Status:', result.status || result.error)
  })

  // ─── CHAT MESSAGE ────────────────────────────
  socket.on('send-message', ({ roomId, username, message }) => {
    socket.to(roomId).emit('receive-message', { username, message })
  })

  // ─── DISCONNECT ──────────────────────────────
  socket.on('disconnect', () => {
    const { username, roomId } = socket
    if (username && roomId) {
      if (rooms[roomId]) {
        rooms[roomId].users = rooms[roomId].users.filter(u => u !== username)
      }
      socket.to(roomId).emit('user-left', username)
      console.log(`${username} left`)
    }
  })
})

server.listen(process.env.PORT || 8080, () => {
  console.log(`🚀 Server running on http://localhost:${process.env.PORT || 8080}`)
})