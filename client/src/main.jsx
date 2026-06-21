import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Admin from './Admin.jsx'
import './index.css'

// Simple routing — if URL has /admin show admin page
const isAdmin = window.location.pathname === '/admin'

ReactDOM.createRoot(document.getElementById('root')).render(
  isAdmin ? <Admin /> : <App />
)