import { useGame } from '../../context/GameContext.jsx'
import Dial from './Dial.jsx'
import Button from '../../components/Button.jsx'

export default function Reveal() {
  const { gameState, player, room, sendAction } = useGame()
  const { targetPosition, guesses = [], roundScores = [], currentRound, totalRounds, clueGiverAnswer, question } = gameState
  const isHost = player.id === room.hostId

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-indigo-400 mb-1">📡 Round {currentRound} of {totalRounds}</h2>
      {question && <p className="text-slate-300 mb-1">{question}</p>}
      {clueGiverAnswer && <p className="text-lg font-semibold text-white mb-4">Answer: {clueGiverAnswer}</p>}

      <div className="mb-6 w-full">
        <Dial value={targetPosition ?? 90} showTarget targetPosition={targetPosition} />
      </div>

      {/* Guesses */}
      <div className="w-full space-y-2 mb-4">
        <h3 className="font-semibold text-slate-300">Guesses</h3>
        {guesses.map((g, i) => (
          <div key={i} className="flex justify-between bg-slate-800 rounded-lg px-4 py-2">
            <span>{g.name}</span>
            <span className="font-mono">{g.position}°</span>
          </div>
        ))}
      </div>

      {/* Round Scores */}
      {roundScores.length > 0 && (
        <div className="w-full space-y-2 mb-6">
          <h3 className="font-semibold text-slate-300">Round Scores</h3>
          {roundScores.map((s, i) => (
            <div key={i} className="flex justify-between bg-slate-800 rounded-lg px-4 py-2">
              <span>{s.name}</span>
              <span className="font-bold text-indigo-400">+{s.points}</span>
            </div>
          ))}
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
    </div>
  )
}
