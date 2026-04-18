import { useRef, useCallback } from 'react'

export default function Dial({ value = 90, onChange, targetPosition, showTarget = false, scale, guessLines = [] }) {
  const svgRef = useRef(null)
  const draggable = !!onChange

  const WIDTH = 340
  const HEIGHT = 200
  const CX = WIDTH / 2
  const CY = HEIGHT - 10
  const RADIUS = 140

  // 0 = left end of arc, 180 = right end of arc
  // Internally we map: value 0 → angle 180° (left), value 180 → angle 0° (right)
  function valToXY(val, r = RADIUS) {
    const ang = ((180 - val) * Math.PI) / 180
    return {
      x: CX + r * Math.cos(ang),
      y: CY - r * Math.sin(ang),
    }
  }

  function toDisplay(internal) {
    return Math.round((internal / 180) * 100)
  }

  function posFromEvent(e) {
    const svg = svgRef.current
    if (!svg) return value
    const rect = svg.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const svgX = ((clientX - rect.left) / rect.width) * WIDTH
    const svgY = ((clientY - rect.top) / rect.height) * HEIGHT
    const dx = svgX - CX
    const dy = CY - svgY
    // atan2 gives 0° at right, 180° at left
    // We want value 0 at LEFT and value 180 at RIGHT, so invert
    let mathAngle = (Math.atan2(dy, dx) * 180) / Math.PI
    if (mathAngle < 0) mathAngle = 0
    if (mathAngle > 180) mathAngle = 180
    const val = 180 - mathAngle
    return Math.round(Math.max(0, Math.min(180, val)))
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

  const handlePos = valToXY(value)
  const arcStart = valToXY(0)
  const arcEnd = valToXY(180)

  // Target zone
  const targetHalf = 10
  let targetPath = null
  if (showTarget && targetPosition != null) {
    const tStart = valToXY(Math.max(0, targetPosition - targetHalf))
    const tEnd = valToXY(Math.min(180, targetPosition + targetHalf))
    // Arc from higher angle to lower angle (left to right)
    targetPath = `M ${tStart.x} ${tStart.y} A ${RADIUS} ${RADIUS} 0 0 1 ${tEnd.x} ${tEnd.y}`
  }

  return (
    <div className="w-full">
      {/* Scale labels above the dial */}
      {scale && (
        <div className="flex justify-between items-end mb-2 px-2 max-w-sm mx-auto">
          <span className="text-sm font-semibold text-slate-300 text-left max-w-[45%]">{scale.left}</span>
          <span className="text-sm font-semibold text-slate-300 text-right max-w-[45%]">{scale.right}</span>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full max-w-sm mx-auto select-none touch-none"
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

        {/* Target center line */}
        {showTarget && targetPosition != null && (
          <line
            x1={CX}
            y1={CY}
            x2={valToXY(targetPosition, RADIUS + 12).x}
            y2={valToXY(targetPosition, RADIUS + 12).y}
            stroke="#22c55e"
            strokeWidth="3"
          />
        )}

        {/* Guess lines for reveal */}
        {guessLines.map((g, i) => {
          const outer = valToXY(g.position, RADIUS + 10)
          const labelPos = valToXY(g.position, RADIUS + 26)
          return (
            <g key={i}>
              <line
                x1={CX}
                y1={CY}
                x2={outer.x}
                y2={outer.y}
                stroke={g.color || '#94a3b8'}
                strokeWidth="2.5"
                opacity="0.85"
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                fill={g.color || '#94a3b8'}
                fontSize="10"
                fontWeight="bold"
              >
                {g.name}
              </text>
            </g>
          )
        })}

        {/* Tick marks */}
        {[0, 45, 90, 135, 180].map((v) => {
          const inner = valToXY(v)
          const outer = valToXY(v, RADIUS + 16)
          return <line key={v} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#64748b" strokeWidth="2" />
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

        {/* Value label (display 0-100) */}
        <text x={CX} y={CY - 20} textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">
          {toDisplay(value)}
        </text>
      </svg>
    </div>
  )
}
