import { useRef, useCallback } from 'react'

export default function Dial({ value = 90, onChange, targetPosition, showTarget = false }) {
  const svgRef = useRef(null)
  const draggable = !!onChange

  const WIDTH = 320
  const HEIGHT = 180
  const CX = WIDTH / 2
  const CY = HEIGHT
  const RADIUS = 140

  function angleToXY(deg) {
    const rad = ((180 - deg) * Math.PI) / 180
    return {
      x: CX + RADIUS * Math.cos(rad),
      y: CY - RADIUS * Math.sin(rad),
    }
  }

  function posFromEvent(e) {
    const svg = svgRef.current
    if (!svg) return value
    const rect = svg.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const x = clientX - rect.left - CX * (rect.width / WIDTH)
    const y = -(clientY - rect.top - CY * (rect.height / HEIGHT))
    let angle = (Math.atan2(y, x) * 180) / Math.PI
    if (angle < 0) angle = 0
    if (angle > 180) angle = 180
    return Math.round(angle)
  }

  const handlePointerDown = useCallback(
    (e) => {
      if (!draggable) return
      e.preventDefault()
      const move = (ev) => {
        ev.preventDefault()
        onChange(posFromEvent(ev))
      }
      const up = () => {
        window.removeEventListener('mousemove', move)
        window.removeEventListener('mouseup', up)
        window.removeEventListener('touchmove', move)
        window.removeEventListener('touchend', up)
      }
      window.addEventListener('mousemove', move)
      window.addEventListener('mouseup', up)
      window.addEventListener('touchmove', move, { passive: false })
      window.addEventListener('touchend', up)
      onChange(posFromEvent(e))
    },
    [draggable, onChange],
  )

  const handlePos = angleToXY(value)

  // Arc path
  const arcStart = angleToXY(0)
  const arcEnd = angleToXY(180)

  // Target zone
  const targetHalf = 10
  let targetPath = null
  if (showTarget && targetPosition != null) {
    const tStart = angleToXY(Math.max(0, targetPosition - targetHalf))
    const tEnd = angleToXY(Math.min(180, targetPosition + targetHalf))
    targetPath = `M ${tStart.x} ${tStart.y} A ${RADIUS} ${RADIUS} 0 0 1 ${tEnd.x} ${tEnd.y}`
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WIDTH} ${HEIGHT + 10}`}
      className="w-full max-w-xs mx-auto select-none touch-none"
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
    >
      <defs>
        <linearGradient id="dialGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>

      {/* Arc background */}
      <path
        d={`M ${arcStart.x} ${arcStart.y} A ${RADIUS} ${RADIUS} 0 0 1 ${arcEnd.x} ${arcEnd.y}`}
        fill="none"
        stroke="#334155"
        strokeWidth="24"
        strokeLinecap="round"
      />

      {/* Gradient arc */}
      <path
        d={`M ${arcStart.x} ${arcStart.y} A ${RADIUS} ${RADIUS} 0 0 1 ${arcEnd.x} ${arcEnd.y}`}
        fill="none"
        stroke="url(#dialGrad)"
        strokeWidth="20"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* Target zone */}
      {targetPath && (
        <path d={targetPath} fill="none" stroke="#22c55e" strokeWidth="22" strokeLinecap="round" opacity="0.7" />
      )}

      {/* Tick marks */}
      {[0, 45, 90, 135, 180].map((deg) => {
        const inner = angleToXY(deg)
        const outer = {
          x: CX + (RADIUS + 16) * Math.cos(((180 - deg) * Math.PI) / 180),
          y: CY - (RADIUS + 16) * Math.sin(((180 - deg) * Math.PI) / 180),
        }
        return <line key={deg} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#64748b" strokeWidth="2" />
      })}

      {/* Handle */}
      <circle
        cx={handlePos.x}
        cy={handlePos.y}
        r={draggable ? 16 : 12}
        fill="#6366f1"
        stroke="white"
        strokeWidth="3"
        className={draggable ? 'cursor-grab' : ''}
      />

      {/* Value label */}
      <text x={CX} y={CY - 20} textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">
        {value}°
      </text>
    </svg>
  )
}
