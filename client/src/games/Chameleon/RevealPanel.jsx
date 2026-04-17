import { useNavigate } from 'react-router-dom'
import { useGame } from '../../context/GameContext.jsx'
import Button from '../../components/Button.jsx'

export default function RevealPanel() {
  const navigate = useNavigate()
  const { gameState, player, room, emit } = useGame()
  const {
    keyword,
    chameleonName,
    chameleonCaught,
    chameleonGuessedCorrectly,
    outcome,
    hints = [],
    players = [],
    votes = [],
  } = gameState

  const isHost = player.id === room.hostId

  // Group all hints by player (all 3 rounds)
  const hintsByPlayer = {}
  for (const h of hints) {
    if (!hintsByPlayer[h.playerId]) hintsByPlayer[h.playerId] = []
    hintsByPlayer[h.playerId].push(h.hint)
  }

  function handleBackToLobby() {
    emit('game:end', { code: room.code })
    navigate(`/lobby/${room.code}`)
  }

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto flex flex-col items-center justify-center">
      <h2 className="text-3xl font-bold text-emerald-400 mb-4">🦎 Round Over</h2>

      {/* Outcome banner */}
      {outcome && (
        <div className="bg-slate-800 rounded-xl px-6 py-3 mb-4 text-center w-full">
          <p className="text-xl font-bold">
            {outcome === 'chameleon_wins' && '🦎 The Chameleon wins!'}
            {outcome === 'players_win' && '🎉 Players win!'}
            {outcome === 'draw' && '🤝 It\'s a draw!'}
          </p>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl px-6 py-4 mb-4 text-center w-full">
        <p className="text-sm text-slate-400">The secret word was</p>
        <p className="text-3xl font-bold">{keyword}</p>
      </div>

      <div className="bg-slate-800 rounded-xl px-6 py-4 mb-4 text-center w-full">
        <p className="text-sm text-slate-400">The Chameleon was</p>
        <p className="text-2xl font-bold text-emerald-400">{chameleonName}</p>
      </div>

      {chameleonCaught != null && (
        <p className="text-lg mb-2">
          {chameleonCaught ? '✅ The Chameleon was caught!' : '❌ The Chameleon got away!'}
        </p>
      )}

      {chameleonGuessedCorrectly != null && chameleonCaught && (
        <p className="text-lg mb-4">
          {chameleonGuessedCorrectly
            ? '🎯 The Chameleon guessed the word correctly!'
            : '❌ The Chameleon failed to guess the word.'}
        </p>
      )}

      {/* All hints by player */}
      <div className="w-full mb-4">
        <h3 className="font-semibold text-slate-300 mb-2">All Hints</h3>
        <div className="grid grid-cols-2 gap-3">
          {players.map((p) => (
            <div key={p.id} className="rounded-lg bg-slate-800 px-4 py-3">
              <p className="text-sm text-slate-400 truncate">{p.name}</p>
              {(hintsByPlayer[p.id] || []).map((h, i) => (
                <p key={i} className="text-lg font-medium">{h}</p>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Votes */}
      {votes.length > 0 && (
        <div className="w-full mb-6">
          <h3 className="font-semibold text-slate-300 mb-2">Votes</h3>
          {votes.map((v, i) => (
            <div key={i} className="flex justify-between bg-slate-800 rounded-lg px-4 py-2 mb-1">
              <span>{v.voterName}</span>
              <span className="text-slate-400">→ {v.targetName}</span>
            </div>
          ))}
        </div>
      )}

      {isHost ? (
        <Button variant="success" fullWidth onClick={handleBackToLobby}>
          Back to Lobby
        </Button>
      ) : (
        <p className="text-slate-400 text-center animate-pulse">Waiting for host to return to lobby...</p>
      )}
    </div>
  )
}
