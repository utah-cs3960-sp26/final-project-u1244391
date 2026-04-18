import { useGame } from '../../context/GameContext.jsx'
import Dial from './Dial.jsx'
import Button from '../../components/Button.jsx'
import ChatPanel from '../../components/ChatPanel.jsx'

export default function Reveal() {
  const { gameState, player, room, sendAction } = useGame()
  const {
    targetPosition,
    guesses = [],
    roundScores = [],
    currentRound,
    totalRounds,
    clueGiverAnswer,
    scale,
  } = gameState
  const isHost = player.id === room.hostId

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-indigo-400 mb-1">📡 Round {currentRound} of {totalRounds}</h2>

      {clueGiverAnswer && (
        <p className="text-lg font-semibold text-white mb-4">Answer: {clueGiverAnswer}</p>
      )}

      <div className="mb-6 w-full">
        <Dial
          value={targetPosition ?? 90}
          showTarget
          targetPosition={targetPosition}
          scale={scale}
          guessLines={guesses}
        />
      </div>

      {/* Score breakdown sorted by round score */}
      {roundScores.length > 0 && (
        <div className="w-full space-y-2 mb-6">
          <h3 className="font-semibold text-slate-300">Round Scores</h3>
          {roundScores.map((s, i) => {
            const isSuper = s.points === 7
            return (
              <div
                key={i}
                className={`flex items-center justify-between rounded-lg px-4 py-2 ${
                  isSuper
                    ? 'animate-pulse bg-gradient-to-r from-yellow-500/30 via-pink-500/30 to-indigo-500/30 border border-yellow-400'
                    : i === 0
                      ? 'bg-indigo-900/40 border border-indigo-500'
                      : 'bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: s.color || '#6366f1' }}
                  >
                    {s.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span className="font-medium">{s.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  {isSuper ? (
                    <span className="font-extrabold text-yellow-400 animate-bounce text-lg">⭐ +7 SUPER</span>
                  ) : (
                    <span className="font-bold text-indigo-400">+{s.points}</span>
                  )}
                  <span className="text-sm text-slate-400">({s.total} total)</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isHost && (
        <Button variant="primary" fullWidth onClick={() => sendAction('nextRound', {})}>
          {currentRound < totalRounds ? 'Next Round' : 'See Final Scores'}
        </Button>
      )}
      {!isHost && (
        <p className="text-slate-400 text-center animate-pulse">Waiting for host to continue...</p>
      )}

      <ChatPanel />
    </div>
  )
}
