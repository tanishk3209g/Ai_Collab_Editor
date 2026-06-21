import { useState, useEffect } from 'react'

function Admin() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const SERVER_URL = "https://aicollabeditor-production.up.railway.app"

  const fetchData = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/admin`)
      const json = await res.json()
      setData(json)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch admin data')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Auto refresh every 10 seconds
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div style={{
      background: '#1e1e1e',
      color: '#fff',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px'
    }}>
      Loading...
    </div>
  )

  return (
    <div style={{
      background: '#1e1e1e',
      color: '#fff',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        borderBottom: '1px solid #444',
        paddingBottom: '15px'
      }}>
        <h1 style={{
          background: 'linear-gradient(135deg, #61dafb, #a78bfa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0
        }}>
          {'</> CodeSync Admin'}
        </h1>
        <button
          onClick={fetchData}
          style={{
            padding: '8px 16px',
            background: '#61dafb',
            color: '#000',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{
          background: '#2d2d2d',
          padding: '20px',
          borderRadius: '10px',
          flex: 1,
          textAlign: 'center',
          border: '1px solid #444'
        }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#61dafb' }}>
            {data?.totalRooms || 0}
          </div>
          <div style={{ color: '#888', marginTop: '5px' }}>Active Rooms</div>
        </div>
        <div style={{
          background: '#2d2d2d',
          padding: '20px',
          borderRadius: '10px',
          flex: 1,
          textAlign: 'center',
          border: '1px solid #444'
        }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#a78bfa' }}>
            {data?.totalUsers || 0}
          </div>
          <div style={{ color: '#888', marginTop: '5px' }}>Active Users</div>
        </div>
      </div>

      {/* Rooms */}
      <h2 style={{ color: '#888', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Active Rooms
      </h2>

      {data?.totalRooms === 0 ? (
        <div style={{ color: '#555', textAlign: 'center', padding: '40px' }}>
          No active rooms right now
        </div>
      ) : (
        Object.entries(data?.rooms || {}).map(([roomId, room]) => (
          <div key={roomId} style={{
            background: '#2d2d2d',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '15px',
            border: '1px solid #444'
          }}>
            {/* Room Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <div>
                <span style={{ color: '#61dafb', fontWeight: 'bold', fontSize: '16px' }}>
                  Room: {roomId}
                </span>
                <span style={{
                  marginLeft: '10px',
                  background: '#3a3a3a',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#888'
                }}>
                  {room.language}
                </span>
              </div>
              <span style={{ color: '#888', fontSize: '13px' }}>
                👥 {room.userCount} user{room.userCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Users */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {room.users.map((user, i) => (
                <span key={i} style={{
                  background: '#1a1a2e',
                  border: '1px solid rgba(97, 218, 251, 0.3)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  color: '#61dafb'
                }}>
                  👤 {user}
                </span>
              ))}
            </div>

            {/* Code Preview */}
            <div style={{
              background: '#1a1a1a',
              padding: '10px',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#888',
              whiteSpace: 'pre-wrap',
              borderLeft: '3px solid #444'
            }}>
              {room.codePreview}
            </div>
          </div>
        ))
      )}

      {/* Auto refresh note */}
      <div style={{ textAlign: 'center', color: '#444', fontSize: '12px', marginTop: '20px' }}>
        Auto-refreshes every 10 seconds
      </div>
    </div>
  )
}

export default Admin