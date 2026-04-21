import { useState } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import Button from '../../components/Button.jsx'
import PhaseTimer from '../../components/PhaseTimer.jsx'

export default function VotePanel() {
  const { gameState, player, sendAction } = useGame()
  const { players = [], hints = [] } = gameState
  const [voted, setVoted] = useState(false)

  function handleVote(targetId) {
    sendAction('submitVote', { votedFor: targetId })
    setVoted(true)
  }

  // Group all hints by player
  const hintsByPlayer = {}
  for (const h of hints) {
    if (!hintsByPlayer[h.playerId]) hintsByPlayer[h.playerId] = []
    hintsByPlayer[h.playerId].push(h.hint)
  }

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-emerald-400 mb-1">🦎 Vote for the Chameleon</h2>
        <p className="text-sm text-slate-400">Who do you think is the Chameleon?</p>
      </div>

      {/* Hints display */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {players.map((p) => (
          <div key={p.id} className="rounded-lg bg-slate-800 px-4 py-3">
            <p className="text-sm text-slate-400 truncate">{p.name}</p>
            {(hintsByPlayer[p.id] || []).map((h, i) => (
              <p key={i} className="text-lg font-medium">{h}</p>
            ))}
          </div>
        ))}
      </div>

      <PhaseTimer deadline={gameState.deadline} />

      {/* Vote buttons */}
      {!voted ? (
        <div className="space-y-2">
          {players
            .filter((p) => p.id !== player.id)
            .map((p) => (
              <Button key={p.id} variant="success" fullWidth onClick={() => handleVote(p.id)}>
                Vote for {p.name}
              </Button>
            ))}
        </div>
      ) : (
        <p className="text-center text-slate-400 text-lg animate-pulse">
          Waiting for all votes...
        </p>
      )}
    </div>
  )
}
