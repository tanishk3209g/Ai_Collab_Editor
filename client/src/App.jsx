import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"
import Editor from "./Editor"
import './index.css'

const socket = io("http://localhost:8080")

function App() {
  const [roomId, setRoomId]       = useState("")
  const [username, setUsername]   = useState("")
  const [joined, setJoined]       = useState(false)
  const [code, setCode]           = useState('// Start coding here...\n')
  const [language, setLanguage]   = useState("javascript")
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState("")
  const [users, setUsers]         = useState([])
  const [output, setOutput]       = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const messagesEndRef            = useRef(null)
  const isRemoteUpdate            = useRef(false)

  // Auto scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    // Get room state when joining
    socket.on("room-state", ({ code, language }) => {
      setCode(code)
      setLanguage(language)
    })

    // Code changed by another user
    socket.on("code-update", (newCode) => {
      isRemoteUpdate.current = true
      setCode(newCode)
    })

    // Language changed by another user
    socket.on("language-update", (newLanguage) => {
      setLanguage(newLanguage)
    })

    // Code execution started
    socket.on("execution-start", () => {
      setIsRunning(true)
      setOutput({ waiting: true })
    })

    // Code execution finished
    socket.on("execution-result", (result) => {
      setIsRunning(false)
      setOutput(result)
    })

    // Chat message from another user
    socket.on("receive-message", ({ username, message }) => {
      setMessages(prev => [...prev, {
        text: `${username}: ${message}`,
        type: "other"
      }])
    })

    // Someone joined the room
    socket.on("user-joined", (username) => {
      setUsers(prev => [...prev, username])
      setMessages(prev => [...prev, {
        text: `🟢 ${username} joined`,
        type: "system"
      }])
    })

    // Someone left the room
    socket.on("user-left", (username) => {
      setUsers(prev => prev.filter(u => u !== username))
      setMessages(prev => [...prev, {
        text: `🔴 ${username} left`,
        type: "system"
      }])
    })

    // Cleanup all listeners on unmount
    return () => {
      socket.off("room-state")
      socket.off("code-update")
      socket.off("language-update")
      socket.off("execution-start")
      socket.off("execution-result")
      socket.off("receive-message")
      socket.off("user-joined")
      socket.off("user-left")
    }
  }, [])

  const joinRoom = () => {
    if (!roomId.trim() || !username.trim()) return
    socket.emit("join-room", { roomId, username })
    setJoined(true)
    setUsers([username])
    setMessages([{
      text: `Welcome to room: ${roomId} 👋`,
      type: "system"
    }])
  }

  const handleCodeChange = (newCode) => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false
      setCode(newCode)
      return
    }
    setCode(newCode)
    socket.emit("code-change", { roomId, code: newCode })
  }

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value
    setLanguage(newLanguage)
    socket.emit("language-change", { roomId, language: newLanguage })
  }

  const handleRunCode = () => {
    if (isRunning) return
    // Send code to server for execution
    socket.emit("run-code", { roomId, code, language })
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

  // Decide what to show in output panel
  const renderOutput = () => {
    if (!output) return (
      <div className="output-content waiting">
        Click ▶ Run to execute your code...
      </div>
    )
    if (output.waiting) return (
      <div className="output-content waiting">
        ⏳ Running your code...
      </div>
    )
    if (output.error && output.error.length > 0) return (
      <div className="output-content error">
        ❌ {output.error}
      </div>
    )
    return (
      <div className="output-content success">
        ✅ {output.output || '(No output)'}
      </div>
    )
  }

  // ── JOIN SCREEN ──────────────────────────────
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
        <button onClick={joinRoom}>Join Room</button>
      </div>
    )
  }

  // ── MAIN SCREEN ──────────────────────────────
  return (
    <div className="main-layout">

      {/* TOP BAR */}
      <div className="top-bar">
        <h2>AI Collab Editor 🚀</h2>
        <select value={language} onChange={handleLanguageChange}>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
        </select>
        <span className="users-online">
          👥 {users.join(', ')}
        </span>
      </div>

      {/* CONTENT AREA */}
      <div className="content-area">

        {/* LEFT — EDITOR + OUTPUT */}
        <div className="editor-side">

          {/* Code Editor */}
          <Editor
            code={code}
            onChange={handleCodeChange}
            language={language}
          />

          {/* Output Panel */}
          <div className="output-panel">
            <div className="output-header">
              <span>Output</span>
              <button
                className={`run-button ${isRunning ? 'running' : ''}`}
                onClick={handleRunCode}
                disabled={isRunning}
              >
                {isRunning ? '⏳ Running...' : '▶ Run Code'}
              </button>
            </div>
            {renderOutput()}
          </div>

        </div>

        {/* RIGHT — CHAT */}
        <div className="chat-side">
          <div className="chat-header">💬 Chat</div>
          <div className="chat-box">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.type}`}>
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-area">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default App