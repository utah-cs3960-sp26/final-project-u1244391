import { useGame } from '../../context/GameContext.jsx'
import ClueInput from './ClueInput.jsx'

export default function Grid() {
  const { gameState, player, sendAction } = useGame()
  const {
    isChameleon,
    keyword,
    players = [],
    hints = [],
    activePlayerId,
    currentRound,
    totalRounds,
  } = gameState

  const isMyTurn = activePlayerId === player.id
  const activePlayer = players.find((p) => p.id === activePlayerId)

  // Only show the current round's hint per player
  const currentRoundHints = hints.filter((h) => h.round === currentRound)

  function handleSubmitHint(hint) {
    sendAction('submitHint', { hint })
  }

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-emerald-400 mb-1">🦎 Chameleon</h2>
        <p className="text-sm text-slate-400">Round {currentRound ?? 1} of {totalRounds ?? 3}</p>
      </div>

      {/* Keyword / Chameleon banner */}
      <div className={`rounded-xl px-6 py-4 mb-6 text-center ${isChameleon ? 'bg-emerald-900/50 border border-emerald-500' : 'bg-slate-800'}`}>
        {isChameleon ? (
          <p className="text-2xl font-bold text-emerald-400">You are the Chameleon! 🦎</p>
        ) : (
          <>
            <p className="text-sm text-slate-400">Secret Word</p>
            <p className="text-3xl font-bold">{keyword}</p>
          </>
        )}
      </div>

      {/* Hints grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {players.map((p) => {
          const hint = currentRoundHints.find((h) => h.playerId === p.id)
          const isActive = p.id === activePlayerId
          return (
            <div
              key={p.id}
              className={`rounded-lg px-4 py-3 ${
                isActive ? 'bg-emerald-800/50 border border-emerald-500' : 'bg-slate-800'
              }`}
            >
              <p className="text-sm text-slate-400 truncate">{p.name}</p>
              {hint ? (
                <p className="text-lg font-medium">{hint.hint}</p>
              ) : (
                <p className="text-slate-600 italic text-sm">—</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Input or waiting */}
      {isMyTurn ? (
        <ClueInput onSubmit={handleSubmitHint} />
      ) : (
        <p className="text-center text-slate-400">
          Waiting for {activePlayer?.name ?? 'player'}...
        </p>
      )}
    </div>
  )
}
