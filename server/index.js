require('dotenv').config()

const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
const cors       = require('cors')
const { runCode} = require('./judge0')
const { askAI  } = require('./ai')

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

const rooms = {}

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id)

  // ─── JOIN ROOM ────────────────────────────
  socket.on('join-room', ({ roomId, username }) => {
  socket.join(roomId)
  socket.username = username
  socket.roomId   = roomId

  if (!rooms[roomId]) {
    rooms[roomId] = {
      code:      '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World!" << endl;\n    return 0;\n}\n',
      language:  'cpp',
      users:     [],
      lastError: ''
    }
  }

  rooms[roomId].users.push(username)
  console.log(`${username} joined room: ${roomId}`)

  // Send current room state INCLUDING existing users
  socket.emit('room-state', {
    code:     rooms[roomId].code,
    language: rooms[roomId].language,
    users:    rooms[roomId].users  // ← ADD THIS
  })

  socket.to(roomId).emit('user-joined', username)
})

  // ─── CODE CHANGE ──────────────────────────
  socket.on('code-change', ({ roomId, code }) => {
    if (rooms[roomId]) rooms[roomId].code = code
    socket.to(roomId).emit('code-update', code)
  })

  // ─── LANGUAGE CHANGE ──────────────────────
  socket.on('language-change', ({ roomId, language }) => {
    if (rooms[roomId]) rooms[roomId].language = language
    socket.to(roomId).emit('language-update', language)
  })

  // ─── RUN CODE ─────────────────────────────
  socket.on('run-code', async ({ roomId, code, language }) => {
    console.log(`Running ${language} code in room: ${roomId}`)
    io.to(roomId).emit('execution-start')

    const result = await runCode(code, language)

    // Store last error for AI context
    if (rooms[roomId]) {
      rooms[roomId].lastError = result.error || ''
    }

    io.to(roomId).emit('execution-result', result)
    console.log('Execution done. Status:', result.status)
  })

  // ─── ASK AI ───────────────────────────────
socket.on('ask-ai', async ({ roomId, username, question, history }) => {
  console.log(`Cody question from ${username} in room ${roomId}: ${question}`)

  io.to(roomId).emit('ai-thinking', { username })

  const room = rooms[roomId] || {}

  const result = await askAI({
    question,
    code:     room.code     || '',
    language: room.language || 'cpp',
    error:    room.lastError || '',
    history:  history       || []
  })

  io.to(roomId).emit('ai-response', {
    question,
    answer:        result.answer || result.error,
    extractedCode: result.extractedCode || null,
    username,
    isError:       !!result.error
  })

  console.log('Cody response sent to room:', roomId)
})
// ─── FIX CODE ─────────────────────────────
socket.on('fix-code', async ({ roomId, username, history }) => {
  console.log(`Fix code request from ${username} in room ${roomId}`)

  io.to(roomId).emit('fix-start')

  const room = rooms[roomId] || {}

  // Special fix prompt — ask for complete corrected code
  const result = await askAI({
    question: `Fix all the errors in my code and return the complete corrected version. Make sure the entire code is correct and ready to run.`,
    code:     room.code     || '',
    language: room.language || 'cpp',
    error:    room.lastError || '',
    history:  history       || []
  })

  io.to(roomId).emit('fix-response', {
    answer:        result.answer || result.error,
    extractedCode: result.extractedCode || null,
    isError:       !!result.error
  })

  console.log('Fix response sent to room:', roomId)
})

  // ─── CHAT MESSAGE ─────────────────────────
  socket.on('send-message', ({ roomId, username, message }) => {
    socket.to(roomId).emit('receive-message', { username, message })
  })

  // ─── DISCONNECT ───────────────────────────
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