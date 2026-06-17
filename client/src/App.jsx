import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"
import './index.css'

// Connect to backend
const socket = io("http://localhost:8080")

function App() {
  const [roomId, setRoomId]       = useState("")
  const [username, setUsername]   = useState("")
  const [joined, setJoined]       = useState(false)
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState("")
  const messagesEndRef            = useRef(null)

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Receive message from others
    socket.on("receive-message", ({ username, message }) => {
      setMessages(prev => [...prev, {
        text: `${username}: ${message}`,
        type: "other"
      }])
    })

    // Someone joined
    socket.on("user-joined", (username) => {
      setMessages(prev => [...prev, {
        text: `🟢 ${username} joined the room`,
        type: "system"
      }])
    })

    // Someone left
    socket.on("user-left", (username) => {
      setMessages(prev => [...prev, {
        text: `🔴 ${username} left the room`,
        type: "system"
      }])
    })

    return () => {
      socket.off("receive-message")
      socket.off("user-joined")
      socket.off("user-left")
    }
  }, [])

  const joinRoom = () => {
    if (!roomId.trim() || !username.trim()) return
    socket.emit("join-room", { roomId, username })
    setJoined(true)
    setMessages([{
      text: `Welcome to room: ${roomId} 👋`,
      type: "system"
    }])
  }

  const sendMessage = () => {
    if (!input.trim()) return
    socket.emit("send-message", { roomId, username, message: input })
    setMessages(prev => [...prev, {
      text: `You: ${input}`,
      type: "own"
    }])
    setInput("")
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage()
  }

  // JOIN SCREEN
  if (!joined) {
    return (
      <div className="join-container">
        <h2>AI Collab Editor 🚀</h2>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your name"
        />
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Room ID (e.g. room123)"
          onKeyPress={(e) => e.key === "Enter" && joinRoom()}
        />
        <button onClick={joinRoom}>
          Join Room
        </button>
      </div>
    )
  }

  // CHAT SCREEN
  return (
    <div className="container">
      <h2>Room: {roomId}</h2>
      <p className="status">👤 {username} | 🟢 Connected</p>

      <div className="chat-box">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.type}`}>
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  )
}

export default App