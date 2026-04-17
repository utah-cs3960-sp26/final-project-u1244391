import { useState } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import Dial from './Dial.jsx'
import Button from '../../components/Button.jsx'

export default function ClueGiver() {
  const { gameState, sendAction } = useGame()
  const [answer, setAnswer] = useState('')

  function handleSubmit() {
    if (!answer.trim()) return
    sendAction('submitAnswer', { answer: answer.trim() })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-indigo-400 mb-2">📡 You are the Clue Giver</h2>
      {gameState.question && (
        <p className="text-lg text-slate-300 mb-4 text-center">{gameState.question}</p>
      )}

      <div className="mb-6 w-full">
        <Dial value={gameState.targetPosition ?? 90} showTarget targetPosition={gameState.targetPosition} />
      </div>

      <p className="text-sm text-slate-400 mb-2">The target is at {gameState.targetPosition}°. Give a clue!</p>

      <input
        type="text"
        placeholder="Your clue..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        className="w-full rounded-lg bg-slate-800 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
        maxLength={60}
      />

      <Button variant="primary" fullWidth onClick={handleSubmit} disabled={!answer.trim()}>
        Submit Answer
      </Button>
    </div>
  )
}
