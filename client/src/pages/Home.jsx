import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext.jsx'
import Button from '../components/Button.jsx'

const GAMES = [
  { id: 'chameleon', name: 'Chameleon', emoji: '🦎', color: 'emerald', enabled: true },
  { id: 'wavelength', name: 'Wavelength', emoji: '📡', color: 'indigo', enabled: true },
]

export default function Home() {
  const navigate = useNavigate()
  const { emit, on, off, setPlayer, setRoom } = useGame()
  const [view, setView] = useState('menu') // menu | select | host | join | credits
  const [selectedGame, setSelectedGame] = useState(null)
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState('')

  const accent = selectedGame === 'chameleon' ? 'emerald' : 'indigo'
  const btnVariant = selectedGame === 'chameleon' ? 'success' : 'primary'

  function handleGameSelect(gameId) {
    setSelectedGame(gameId)
    setView('select')
    setError('')
  }

  function handleHost() {
    if (!name.trim()) { setError('Enter your name'); return }
    const handler = (data) => {
      off('room:created', handler)
      off('error', errHandler)
      setPlayer({ id: data.playerId, name: name.trim(), color: data.playerColor })
      setRoom({ code: data.code, players: data.players, hostId: data.hostId, gameType: selectedGame, theme: '' })
      navigate(`/lobby/${data.code}`)
    }
    const errHandler = (data) => { off('room:error', errHandler); setError(data.message || 'Error') }
    on('room:created', handler)
    on('room:error', errHandler)
    emit('room:create', { gameType: selectedGame, playerName: name.trim() })
  }

  function handleJoin() {
    if (!name.trim()) { setError('Enter your name'); return }
    if (!roomCode.trim()) { setError('Enter room code'); return }
    const handler = (data) => {
      off('room:joined', handler)
      off('error', errHandler)
      setPlayer({ id: data.playerId, name: name.trim(), color: data.playerColor })
      setRoom({ code: data.code, players: data.players, hostId: data.hostId, gameType: data.gameType, theme: '' })
      navigate(`/lobby/${data.code}`)
    }
    const errHandler = (data) => { off('room:error', errHandler); setError(data.message || 'Error') }
    on('room:joined', handler)
    on('room:error', errHandler)
    emit('room:join', { code: roomCode.trim().toUpperCase(), playerName: name.trim() })
  }

  if (view === 'credits') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <h2 className="text-3xl font-bold">Credits</h2>
          <p className="text-slate-300">Party Pack — A multiplayer party game collection</p>
          <p className="text-slate-400 text-sm">Built with React, Socket.IO, and Tailwind CSS</p>
          <p className="text-slate-400 text-sm">Chameleon inspired by The Chameleon board game</p>
          <p className="text-slate-400 text-sm">Wavelength inspired by the Wavelength board game</p>
          <Button variant="secondary" fullWidth onClick={() => setView('menu')}>Back</Button>
        </div>
      </div>
    )
  }

  if (view === 'select') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <h2 className="text-3xl font-bold">{selectedGame === 'chameleon' ? '🦎 Chameleon' : '📡 Wavelength'}</h2>
          <div className="space-y-3">
            <Button variant={btnVariant} fullWidth onClick={() => setView('host')}>Host Game</Button>
            <Button variant={btnVariant} fullWidth onClick={() => setView('join')}>Join Game</Button>
            <Button variant="secondary" fullWidth onClick={() => { setView('menu'); setSelectedGame(null) }}>Back</Button>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'host') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full space-y-4">
          <h2 className="text-2xl font-bold text-center">Host {selectedGame === 'chameleon' ? '🦎 Chameleon' : '📡 Wavelength'}</h2>
          {error && <p className="text-red-400 text-center text-sm">{error}</p>}
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg bg-slate-700 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-indigo-500"
            maxLength={20}
          />
          <Button variant={btnVariant} fullWidth onClick={handleHost}>Create Room</Button>
          <Button variant="secondary" fullWidth onClick={() => { setView('select'); setError('') }}>Back</Button>
        </div>
      </div>
    )
  }

  if (view === 'join') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full space-y-4">
          <h2 className="text-2xl font-bold text-center">Join {selectedGame === 'chameleon' ? '🦎 Chameleon' : '📡 Wavelength'}</h2>
          {error && <p className="text-red-400 text-center text-sm">{error}</p>}
          <input
            type="text"
            placeholder="Room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className="w-full rounded-lg bg-slate-700 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest text-center"
            maxLength={6}
          />
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg bg-slate-700 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-indigo-500"
            maxLength={20}
          />
          <Button variant={btnVariant} fullWidth onClick={handleJoin}>Join Room</Button>
          <Button variant="secondary" fullWidth onClick={() => { setView('select'); setError('') }}>Back</Button>
        </div>
      </div>
    )
  }

  // Default: menu view
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight">🎉 Party Pack</h1>
        <p className="text-slate-400 text-lg">Choose a game to get started</p>
        <div className="grid grid-cols-2 gap-4">
          {GAMES.map((game) => (
            <button
              key={game.id}
              onClick={() => handleGameSelect(game.id)}
              className={`rounded-2xl p-6 text-center transition-transform hover:scale-105 cursor-pointer ${
                game.color === 'emerald'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <div className="text-4xl mb-2">{game.emoji}</div>
              <div className="text-xl font-bold">{game.name}</div>
            </button>
          ))}
          <button
            disabled
            className="rounded-2xl p-6 text-center bg-slate-700 opacity-50 cursor-not-allowed"
          >
            <div className="text-4xl mb-2">🎮</div>
            <div className="text-xl font-bold text-slate-400">Coming Soon</div>
          </button>
          <button
            onClick={() => setView('credits')}
            className="rounded-2xl p-6 text-center bg-slate-700 hover:bg-slate-600 transition-colors cursor-pointer"
          >
            <div className="text-4xl mb-2">📜</div>
            <div className="text-xl font-bold">Credits</div>
          </button>
        </div>
      </div>
    </div>
  )
}
