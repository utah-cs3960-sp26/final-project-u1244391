import { useState, useEffect } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import Dial from './Dial.jsx'
import Button from '../../components/Button.jsx'

export default function Guesser() {
  const { gameState, sendAction } = useGame()
  const hasGuessed = gameState.hasGuessed || false
  const [position, setPosition] = useState(gameState.myGuess ?? 90)

  useEffect(() => {
    if (!hasGuessed) {
      setPosition(90)
    }
  }, [gameState.currentRound])

  function handleSubmit() {
    sendAction('submitGuess', { guess: position })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-indigo-400 mb-1">📡 Wavelength</h2>
      <p className="text-sm text-slate-400 mb-2">Round {gameState.currentRound} of {gameState.totalRounds}</p>

      {gameState.clueGiverAnswer && (
        <div className="bg-indigo-900/50 rounded-xl px-6 py-4 mb-4 text-center">
          <p className="text-sm text-indigo-300">Answer from {gameState.clueGiverName || 'Clue Giver'}</p>
          <p className="text-2xl font-bold text-white">{gameState.clueGiverAnswer}</p>
        </div>
      )}

      <div className="mb-4 w-full">
        <Dial
          value={position}
          onChange={hasGuessed ? undefined : setPosition}
          scale={gameState.scale}
        />
      </div>

      {!hasGuessed ? (
        <Button variant="primary" fullWidth onClick={handleSubmit}>
          Confirm Guess
        </Button>
      ) : (
        <p className="text-slate-400 text-lg animate-pulse">
          Waiting for others... ({gameState.guessCount ?? 0}/{gameState.totalGuessers ?? '?'})
        </p>
      )}
    </div>
  )
}
