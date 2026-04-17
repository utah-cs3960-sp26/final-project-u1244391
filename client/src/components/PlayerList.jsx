const COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-lime-500',
]

function hashName(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function PlayerList({ players, hostId }) {
  return (
    <div className="space-y-2">
      {players.map((p) => {
        const color = COLORS[hashName(p.name) % COLORS.length]
        return (
          <div key={p.id} className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-3">
            <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center font-bold text-sm`}>
              {getInitials(p.name)}
            </div>
            <span className="font-medium text-lg">{p.name}</span>
            {p.id === hostId && (
              <span className="ml-auto text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold">HOST</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
