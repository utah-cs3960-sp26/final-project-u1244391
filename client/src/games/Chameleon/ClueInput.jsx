import { useState } from 'react'
import Button from '../../components/Button.jsx'

export default function ClueInput({ onSubmit }) {
  const [hint, setHint] = useState('')

  function handleSubmit() {
    if (!hint.trim()) return
    onSubmit(hint.trim())
    setHint('')
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="Your hint..."
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        className="flex-1 rounded-lg bg-slate-700 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-emerald-500"
        maxLength={40}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
      />
      <Button variant="success" onClick={handleSubmit} disabled={!hint.trim()}>
        Submit
      </Button>
    </div>
  )
}
