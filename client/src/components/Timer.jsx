export default function Timer({ seconds }) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return (
    <div className="text-2xl font-mono font-bold text-white">
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  )
}
