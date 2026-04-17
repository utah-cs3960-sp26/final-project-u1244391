import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGame } from '../context/GameContext.jsx'
import Button from '../components/Button.jsx'
import PlayerList from '../components/PlayerList.jsx'

const CHAMELEON_THEMES = ['Movies', 'College Majors', 'Sports', 'Celebrities', 'Video Games']

export default function Lobby() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { player, room, setRoom, on, off, emit } = useGame()
  const [theme, setTheme] = useState(room.theme || CHAMELEON_THEMES[0])
  const [copied, setCopied] = useState(false)

  const isHost = player.id === room.hostId
  const isChameleon = room.gameType === 'chameleon'

  useEffect(() => {
    const handleUpdate = (data) => {
      setRoom((prev) => ({ ...prev, ...data }))
    }
    const handleStarted = () => {
      navigate(`/game/${code}`)
    }
    const handleState = () => {
      navigate(`/game/${code}`)
    }
    const handleClosed = () => navigate('/')
    on('room:update', handleUpdate)
    on('game:started', handleStarted)
    on('game:state', handleState)
    on('room:closed', handleClosed)
    return () => {
      off('room:update', handleUpdate)
      off('game:started', handleStarted)
      off('game:state', handleState)
      off('room:closed', handleClosed)
    }
  }, [on, off, code, navigate, setRoom])

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleStart() {
    emit('game:start', { code, theme: isChameleon ? theme : undefined })
  }

  function handleLeave() {
    emit('room:leave', { code })
    navigate('/')
  }

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Room code */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">
          {isChameleon ? '🦎 Chameleon' : '📡 Wavelength'} Lobby
        </h2>
        <button
          onClick={handleCopy}
          className="bg-slate-800 rounded-lg px-4 py-2 font-mono text-2xl tracking-widest hover:bg-slate-700 transition-colors cursor-pointer"
        >
          {copied ? '✓ Copied' : code}
        </button>
      </div>

      {/* Theme selector (Chameleon host only) */}
      {isChameleon && isHost && (
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-1">Choose Theme</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full rounded-lg bg-slate-800 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {CHAMELEON_THEMES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      {/* Players */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2 text-slate-300">Players ({room.players.length})</h3>
        <PlayerList players={room.players} hostId={room.hostId} />
      </div>

      {/* Actions */}
      {isHost ? (
        <div className="space-y-3">
          <Button
            variant={isChameleon ? 'success' : 'primary'}
            fullWidth
            onClick={handleStart}
            disabled={room.players.length < 2}
          >
            Start Game
          </Button>
          <Button variant="danger" fullWidth onClick={handleLeave}>Close Room</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-slate-400 text-lg">Waiting for host to start...</p>
          <Button variant="danger" fullWidth onClick={handleLeave}>Leave Room</Button>
        </div>
      )}
    </div>
  )
}
