import { useGame } from '../../context/GameContext.jsx'
import ClueGiver from './ClueGiver.jsx'
import Guesser from './Guesser.jsx'
import Reveal from './Reveal.jsx'
import Scores from './Scores.jsx'
import PhaseTimer from '../../components/PhaseTimer.jsx'

export default function WavelengthGame() {
  const { gameState } = useGame()
  const { phase, isClueGiver } = gameState

  if (phase === 'giving-clue' && isClueGiver) return <ClueGiver />
  if (phase === 'giving-clue' && !isClueGiver) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-bold mb-2 text-indigo-400">📡 Wavelength</h2>
        <p className="text-sm text-slate-400 mb-4">Round {gameState.currentRound} of {gameState.totalRounds}</p>
        {gameState.scale && (
          <p className="text-lg text-slate-300 mb-4">
            {gameState.scale.left} ⟷ {gameState.scale.right}
          </p>
        )}
        <PhaseTimer deadline={gameState.deadline} />
        <p className="text-lg text-slate-400 animate-pulse">Waiting for {gameState.clueGiverName || 'clue giver'}...</p>
      </div>
    )
  }
  if (phase === 'guessing' && isClueGiver) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-bold mb-2 text-indigo-400">📡 Wavelength</h2>
        <p className="text-sm text-slate-400 mb-2">Round {gameState.currentRound} of {gameState.totalRounds}</p>
        {gameState.scale && (
          <p className="text-lg text-slate-300 mb-2">
            {gameState.scale.left} ⟷ {gameState.scale.right}
          </p>
        )}
        <div className="bg-indigo-900/50 rounded-xl px-6 py-4 mb-4">
          <p className="text-sm text-indigo-300">Your answer</p>
          <p className="text-2xl font-bold text-white">{gameState.clueGiverAnswer}</p>
        </div>
        <PhaseTimer deadline={gameState.deadline} />
        <p className="text-lg text-slate-400 animate-pulse">Waiting for guesses...</p>
      </div>
    )
  }
  if (phase === 'guessing' && !isClueGiver) return <Guesser />
  if (phase === 'round-reveal') return <Reveal />
  if (phase === 'scores') return <Scores />

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400 text-lg animate-pulse">Loading game...</p>
    </div>
  )
}
