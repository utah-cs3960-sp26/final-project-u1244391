import { useState, useEffect } from 'react'

export default function PhaseTimer({ deadline }) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!deadline) { setRemaining(0); return }

    function tick() {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setRemaining(left)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  if (!deadline || remaining <= 0) return null

  const urgent = remaining <= 10

  return (
    <div className={`text-center font-mono font-bold text-lg mb-3 ${urgent ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
      ⏱ {remaining}s
    </div>
  )
}
