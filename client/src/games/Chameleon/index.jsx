import { useState } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import Grid from './Grid.jsx'
import VotePanel from './VotePanel.jsx'
import RevealPanel from './RevealPanel.jsx'

export default function ChameleonGame() {
  const { gameState } = useGame()
  const { phase, isChameleon } = gameState

  if (phase === 'clues') return <Grid />
  if (phase === 'voting') return <VotePanel />
  if (phase === 'redemption') {
    if (isChameleon) {
      return <RedemptionInput />
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-emerald-400 mb-4">🦎 Chameleon</h2>
        <p className="text-lg text-slate-400 animate-pulse">Waiting for the Chameleon to guess the word...</p>
      </div>
    )
  }
  if (phase === 'reveal') return <RevealPanel />

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400 text-lg animate-pulse">Loading game...</p>
    </div>
  )
}

function RedemptionInput() {
  const { sendAction } = useGame()
  const [guess, setGuess] = useState('')

  function handleSubmit() {
    if (!guess.trim()) return
    sendAction('submitRedemption', { guess: guess.trim() })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-emerald-400 mb-2">🦎 You were caught!</h2>
      <p className="text-lg text-slate-300 mb-4 text-center">
        Guess the secret word to redeem yourself!
      </p>
      <input
        type="text"
        placeholder="Your guess..."
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        className="w-full rounded-lg bg-slate-800 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
        maxLength={40}
      />
      <button
        onClick={handleSubmit}
        disabled={!guess.trim()}
        className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 px-6 py-3 font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        Submit Guess
      </button>
    </div>
  )
}
