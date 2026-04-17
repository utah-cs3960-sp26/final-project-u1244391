import { useGame } from '../../context/GameContext.jsx'
import ClueGiver from './ClueGiver.jsx'
import Guesser from './Guesser.jsx'
import Reveal from './Reveal.jsx'
import Scores from './Scores.jsx'

export default function WavelengthGame() {
  const { gameState } = useGame()
  const { phase, isClueGiver } = gameState

  if (phase === 'giving-clue' && isClueGiver) return <ClueGiver />
  if (phase === 'giving-clue' && !isClueGiver) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-bold mb-2 text-indigo-400">📡 Wavelength</h2>
        {gameState.question && (
          <p className="text-xl text-slate-300 mb-4">{gameState.question}</p>
        )}
        <p className="text-lg text-slate-400 animate-pulse">Waiting for clue giver...</p>
      </div>
    )
  }
  if (phase === 'guessing') return <Guesser />
  if (phase === 'reveal') return <Reveal />
  if (phase === 'scores') return <Scores />

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400 text-lg animate-pulse">Loading game...</p>
    </div>
  )
}
