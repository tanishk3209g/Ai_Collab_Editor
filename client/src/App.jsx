import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"
import Editor from "./Editor"
import './index.css'

function App() {
const socketRef = useRef(null)

if (!socketRef.current) {
const SERVER_URL = "https://aicollabeditor-production.up.railway.app"  
socketRef.current = io(SERVER_URL, {
    reconnectionAttempts: 5
  })
}

  const socket = socketRef.current;

  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [code, setCode] = useState("// Start coding here...\n");
  const [language, setLanguage] = useState("cpp");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [users, setUsers] = useState([]);
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiThinking, setAiThinking] = useState(false);
  const messagesEndRef = useRef(null);
  const aiEndRef = useRef(null);
  const isRemoteUpdate = useRef(false);
  const [isFixing, setIsFixing] = useState(false);
  const [connecting, setConnecting] = useState(false)

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  useEffect(() => {
    socket.on("room-state", ({ code, language, users }) => {
      setCode(code);
      setLanguage(language);
      setUsers(users || []);
    });

    socket.on("code-update", (newCode) => {
      isRemoteUpdate.current = true;
      setCode(newCode);
    });

    socket.on("language-update", (newLanguage) => {
      setLanguage(newLanguage);
    });

    socket.on("execution-start", () => {
      setIsRunning(true);
      setOutput({ waiting: true });
    });

    socket.on("execution-result", (result) => {
      setIsRunning(false);
      setOutput(result);
    });

    // AI is thinking
    socket.on("ai-thinking", ({ username: asker }) => {
      setAiThinking(true);
      setAiMessages((prev) => [
        ...prev,
        {
          type: "thinking",
          text: `⏳ ${asker} asked Cody🧚🏻‍♂️ — thinking...`,
        },
      ]);
      // Switch to AI tab automatically
      setActiveTab("ai");
    });

    // AI responded
    socket.on(
      "ai-response",
      ({ question, answer, extractedCode, username: asker, isError }) => {
        setAiThinking(false);
        setAiMessages((prev) => {
          const filtered = prev.filter((m) => m.type !== "thinking");
          return [
            ...filtered,
            { type: "question", text: `${asker}: ${question}` },
            {
              type: isError ? "error" : "answer",
              text: answer,
              extractedCode: extractedCode || null, // ← store code
            },
          ];
        });
      },
    );

    socket.on("fix-start", () => {
  setIsFixing(true)
  setAiThinking(true)
  setAiMessages(prev => [...prev, {
    type: "thinking",
    text: `⏳ Cody is fixing your code...`
  }])
})

socket.on("fix-response", ({ answer, extractedCode }) => {
  setIsFixing(false)
  setAiThinking(false)
  setAiMessages(prev => {
    const filtered = prev.filter(m => m.type !== "thinking")
    return [
      ...filtered,
      {
        type: "answer",
        text: answer,
        extractedCode: extractedCode || null,
        isFullReplace: true  // ← marks this as full replacement
      }
    ]
  })
})

    socket.on("receive-message", ({ username, message }) => {
      setMessages((prev) => [
        ...prev,
        {
          text: `${username}: ${message}`,
          type: "other",
        },
      ]);
    });

    socket.on("user-joined", (username) => {
      setUsers((prev) => [...prev, username]);
      setMessages((prev) => [
        ...prev,
        {
          text: `🟢 ${username} joined`,
          type: "system",
        },
      ]);
    });

    socket.on("user-left", (username) => {
      setUsers((prev) => prev.filter((u) => u !== username));
      setMessages((prev) => [
        ...prev,
        {
          text: `🔴 ${username} left`,
          type: "system",
        },
      ]);
    });

    return () => {
      socket.off("room-state");
      socket.off("code-update");
      socket.off("language-update");
      socket.off("execution-start");
      socket.off("execution-result");
      socket.off("ai-thinking");
      socket.off("ai-response");
      socket.off("receive-message");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("fix-start")
      socket.off("fix-response")
    };
  }, []);

  const joinRoom = () => {
    if (!roomId.trim() || !username.trim()) return;
    setConnecting(true);
    socket.emit("join-room", { roomId, username });
    setJoined(true);
    setConnecting(false);
    setMessages([
      {
        text: `Welcome to room: ${roomId} 👋`,
        type: "system",
      },
    ]);
    setAiMessages([
      {
        type: "answer",
        text: "👋 Hi! I'm Cody, your AI coding assistant.\n\nI can do magic with your code and find bugs before they find you.🐞\n\nAsk me anything — 'how to get a gf?👩🏻‍❤️‍💋‍👨🏻', 'what makes you, you🥸?', 'how do I sort a list in Python?😁'",
      },
    ]);
  };

  const handleCodeChange = (newCode) => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      setCode(newCode);
      return;
    }
    setCode(newCode);
    socket.emit("code-change", { roomId, code: newCode });
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit("language-change", { roomId, language: newLanguage });
  };

  const handleRunCode = () => {
  if (isRunning) return
  if (!code.trim()) {
    setOutput({ error: 'No code to run. Write something first!' })
    return
  }
  socket.emit("run-code", { roomId, code, language })
}
  const fixMyCode = () => {
  if (isFixing || aiThinking) return
  if (!code.trim()) return

  setIsFixing(true)
  setActiveTab('ai')

  // Build history
  const history = []
  aiMessages.forEach(msg => {
    if (msg.type === 'question') {
      history.push({ role: 'user',  text: msg.text.split(': ').slice(1).join(': ') })
    }
    if (msg.type === 'answer') {
      history.push({ role: 'model', text: msg.text })
    }
  })

  // Send special fix request to server
  socket.emit("fix-code", {
    roomId,
    username,
    history
  })
}

  const sendMessage = () => {
    if (!input.trim()) return;
    socket.emit("send-message", { roomId, username, message: input });
    setMessages((prev) => [
      ...prev,
      {
        text: `You: ${input}`,
        type: "own",
      },
    ]);
    setInput("");
  };

  const askAI = () => {
    if (!aiInput.trim() || aiThinking) return;

    // Build history from previous messages
    const history = [];
    aiMessages.forEach((msg) => {
      if (msg.type === "question") {
        history.push({
          role: "user",
          text: msg.text.split(": ").slice(1).join(": "),
        });
      }
      if (msg.type === "answer") {
        history.push({ role: "model", text: msg.text });
      }
    });

    socket.emit("ask-ai", {
      roomId,
      username,
      question: aiInput,
      history, // ← send history to server
    });
    setAiInput("");
  };

const insertCode = (codeToInsert, isFullReplace = false) => {
  const cleanCode = codeToInsert
    .split("\n")
    .filter((line) => !line.includes("/var/folders"))
    .filter((line) => !line.trim().startsWith("error:"))
    .filter((line) => !line.trim().startsWith("note:"))
    .join("\n")
    .trim()

  // Default template codes — if editor has only this, replace it
  const defaultCodes = [
    '// Start coding here...',
    '#include <iostream>',
  ]

  const isDefaultCode = defaultCodes.some(d => code.trim().startsWith(d))

  let newCode
  if (isFullReplace || isDefaultCode) {
    // Replace entirely
    newCode = cleanCode
  } else {
    // Append below existing code
    newCode = code + "\n\n" + cleanCode
  }

  setCode(newCode)
  socket.emit("code-change", { roomId, code: newCode })

  setMessages((prev) => [
    ...prev,
    {
      text: isFullReplace || isDefaultCode
        ? "✅ Cody replaced editor with generated code"
        : "✅ Cody inserted code into editor",
      type: "system",
    },
  ])

  setActiveTab("chat")
}

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  const handleAIKeyPress = (e) => {
    // Shift+Enter = new line, Enter = send
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askAI();
    }
  };

  const renderOutput = () => {
    if (!output)
      return (
        <div className="output-content waiting">
          Click ▶ Run to execute your code...
        </div>
      );
    if (output.waiting)
      return (
        <div className="output-content waiting">⏳ Running your code...</div>
      );
    if (output.error && output.error.length > 0)
      return <div className="output-content error">❌ {output.error}</div>;
    return (
      <div className="output-content success">
        ✅ {output.output || "(No output)"}
      </div>
    );
  };

  // ── JOIN SCREEN ──────────────────────────
  if (!joined) {
    return (
      <div className="join-container">
        <div className="join-card">
          {/* Logo */}
          <div className="join-logo">
            <h1>{"</> CodeSync"}</h1>
            <p>Code, Chat, and Collaborate in real-time with AI</p>
          </div>

          <hr className="join-divider" />

          {/* Name Input */}
          <div>
            <p className="join-label">Your Name</p>
            <input
              className="join-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              style={{
                border:
                  username === "" && connecting
                    ? "1px solid #f44336"
                    : "1px solid rgba(97, 218, 251, 0.2)",
              }}
            />
          </div>

          {/* Room Input */}
          <div>
            <p className="join-label">Room ID</p>
            <input
              className="join-input"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID (e.g. team123)"
              onKeyPress={(e) => e.key === "Enter" && joinRoom()}
            />
          </div>

          {/* Join Button */}
          <button
            className="join-button"
            onClick={joinRoom}
            disabled={connecting}
          >
            {connecting ? "Joining..." : "Join Room →"}
          </button>

          <hr className="join-divider" />

          {/* Features */}
          <div className="join-features">
            <div className="join-feature">
              <span>⚡</span>
              Real-time sync
            </div>
            <div className="join-feature">
              <span>🧑🏻‍💻</span>
              Run code
            </div>
            <div className="join-feature">
              <span>💬</span>
              Live chat
            </div>
            <div className="join-feature">
              <span>🧚🏻‍♂️</span>
              Cody AI
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN SCREEN ──────────────────────────
  return (
    <div className="main-layout">
      {/* TOP BAR */}
      <div className="top-bar">
        <h2
          style={{
            background: "linear-gradient(135deg, #61dafb, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontWeight: "800",
            fontSize: "18px",
          }}
        >
          {"</> CodeSync"}
        </h2>
        <select value={language} onChange={handleLanguageChange}>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
        </select>
        <span className="users-online">👥 {users.join(", ")}</span>
      </div>
      {/* ROOM INFO BAR */}
      <div
        className="room-info"
        style={{
          padding: "4px 20px",
          background: "#111",
          fontSize: "11px",
          color: "#555",
          borderBottom: "1px solid #333",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>
          Room: <span style={{ color: "#61dafb" }}>{roomId}</span>
        </span>
        <span>
          Logged in as: <span style={{ color: "#a78bfa" }}>{username}</span>
        </span>
      </div>

      {/* CONTENT */}
      <div className="content-area">
        {/* LEFT — EDITOR + OUTPUT */}
        <div className="editor-side">
          <Editor code={code} onChange={handleCodeChange} language={language} />
          <div className="output-panel">
            <div className="output-header">
              <span>Output</span>
              <div style={{ display: "flex", gap: "8px" }}>
                {/* Show Fix button only when there's an error */}
                {output && output.error && output.error.length > 0 && (
                  <button
                    className="fix-button"
                    onClick={fixMyCode}
                    disabled={isFixing || aiThinking}
                  >
                    {isFixing ? "⏳ Fixing..." : "🔧 Fix My Code"}
                  </button>
                )}
                <button
                  className={`run-button ${isRunning ? "running" : ""}`}
                  onClick={handleRunCode}
                  disabled={isRunning}
                >
                  {isRunning ? "⏳ Running..." : "▶ Run Code"}
                </button>
              </div>
            </div>
            {renderOutput()}
          </div>
        </div>

        {/* RIGHT — CHAT + AI TABS */}
        <div className="chat-side">
          {/* Tabs */}
          <div className="chat-tabs">
            <button
              className={`chat-tab ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              💬 Chat
            </button>
            <button
              className={`chat-tab ${activeTab === "ai" ? "active" : ""}`}
              onClick={() => setActiveTab("ai")}
            >
              🧚🏻‍♂️ Cody
            </button>
          </div>

          {/* CHAT TAB */}
          {activeTab === "chat" && (
            <>
              <div className="chat-box">
                {messages.length === 0 ? (
                  <div style={{
                      textAlign: "center",
                      color: "#555",
                      fontSize: "13px",
                      marginTop: "40px",
                    }}
                  >
                    💬 No messages yet. Say hello!
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.type}`}>
                      {msg.text}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-input-area">

                <input

                  type="text"

                  value={input}

                  onChange={(e) => setInput(e.target.value)}

                  onKeyDown={handleKeyPress}

                  placeholder="Type a message..."

                />

                <button onClick={sendMessage}>

                  Send

                </button>

              </div>
            </>
          )}

          {/* CODY TAB */}
          {activeTab === "ai" && (
            <>
              <div className="ai-box">
                {aiMessages.map((msg, i) => (
                  <div key={i} className="ai-message-wrapper">
                    <div className={`ai-message ${msg.type}`}>{msg.text}</div>
                    {/* Show insert button if message has code */}
                    {msg.extractedCode && (
                      <button
                        className="insert-code-btn"
                        onClick={() =>
                          insertCode(msg.extractedCode, msg.isFullReplace)
                        }
                      >
                        {msg.isFullReplace
                          ? "⚡ Replace Editor with Fixed Code"
                          : "⬆ Insert Code into Editor"}
                      </button>
                    )}
                  </div>
                ))}
                <div ref={aiEndRef} />
              </div>
              <div className="ai-input-area">
                <p className="ai-context-hint">
                  🔍 Cody can see your current code and errors
                </p>
                <textarea
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyPress={handleAIKeyPress}
                  placeholder="Ask Cody anything..."
                  disabled={aiThinking}
                />
                <button
                  className="ai-send-button"
                  onClick={askAI}
                  disabled={aiThinking}
                >
                  {aiThinking ? "⏳ Thinking..." : "🧚🏻‍♂️ Ask Cody"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

