import { useNavigate } from 'react-router-dom'
import { useGame } from '../../context/GameContext.jsx'
import Button from '../../components/Button.jsx'

export default function Scores() {
  const navigate = useNavigate()
  const { gameState, player, room, emit } = useGame()
  const { scores = [] } = gameState
  const sorted = [...scores].sort((a, b) => b.total - a.total)
  const winner = sorted[0]
  const isHost = player.id === room.hostId

  function handleBackToLobby() {
    emit('game:end', { code: room.code })
    navigate(`/lobby/${room.code}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-md mx-auto">
      <h2 className="text-3xl font-bold text-indigo-400 mb-2">🏆 Final Scores</h2>
      {winner && <p className="text-xl text-yellow-400 mb-6">{winner.name} wins!</p>}

      <div className="w-full space-y-2 mb-8">
        {sorted.map((s, i) => (
          <div
            key={i}
            className={`flex justify-between items-center rounded-lg px-4 py-3 ${
              i === 0 ? 'bg-yellow-500/20 border border-yellow-500' : 'bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-slate-500">#{i + 1}</span>
              <span className="text-lg font-medium">{s.name}</span>
            </div>
            <span className="text-xl font-bold text-indigo-400">{s.total}</span>
          </div>
        ))}
      </div>

      {isHost ? (
        <Button variant="primary" fullWidth onClick={handleBackToLobby}>
          Back to Lobby
        </Button>
      ) : (
        <p className="text-slate-400 text-center animate-pulse">Waiting for host to return to lobby...</p>
      )}
    </div>
  )
}
