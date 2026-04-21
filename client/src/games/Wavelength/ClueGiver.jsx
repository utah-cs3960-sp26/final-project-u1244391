import { useState, useEffect } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import Dial from './Dial.jsx'
import Button from '../../components/Button.jsx'
import PhaseTimer from '../../components/PhaseTimer.jsx'

export default function ClueGiver() {
  const { gameState, sendAction } = useGame()
  const [answer, setAnswer] = useState('')

  useEffect(() => {
    setAnswer('')
  }, [gameState.currentRound])

  function handleSubmit() {
    if (!answer.trim()) return
    sendAction('submitAnswer', { answer: answer.trim() })
  }

  const displayTarget = gameState.targetPosition != null
    ? Math.round((gameState.targetPosition / 180) * 100)
    : '?'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-indigo-400 mb-1">📡 You are the Clue Giver</h2>
      <p className="text-sm text-slate-400 mb-4">Round {gameState.currentRound} of {gameState.totalRounds}</p>

      <div className="mb-4 w-full">
        <Dial
          value={gameState.targetPosition ?? 90}
          showTarget
          targetPosition={gameState.targetPosition}
          scale={gameState.scale}
        />
      </div>

      <PhaseTimer deadline={gameState.deadline} />

      <p className="text-sm text-slate-400 mb-2">The target is at {displayTarget}. Think of something that fits here on the scale!</p>

      <input
        type="text"
        placeholder="Your answer..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        className="w-full rounded-lg bg-slate-800 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
        maxLength={60}
      />

      <Button variant="primary" fullWidth onClick={handleSubmit} disabled={!answer.trim()}>
        Submit Answer
      </Button>
    </div>
  )
}
