import { useState } from 'react'
import { useGame } from '../context/GameContext.jsx'

const PLAYER_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#6366F1', '#A855F7', '#EC4899', '#F43F5E',
  '#84CC16', '#06B6D4', '#8B5CF6', '#D946EF', '#FB923C',
  '#34D399', '#60A5FA', '#F472B6', '#A3E635', '#FBBF24',
]

function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function PlayerList({ players, hostId }) {
  const { player, emit, room, setPlayer } = useGame()
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  const takenColors = players.filter((p) => p.id !== player.id).map((p) => p.color)

  function startEdit(p) {
    setEditingId(p.id)
    setEditName(p.name)
  }

  function saveName() {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== player.name) {
      emit('player:update', { code: room.code, name: trimmed })
      setPlayer((prev) => ({ ...prev, name: trimmed }))
    }
  }

  function closeEdit() {
    saveName()
    setEditingId(null)
  }

  function selectColor(color) {
    if (takenColors.includes(color)) return
    emit('player:update', { code: room.code, color })
    setPlayer((prev) => ({ ...prev, color }))
  }

  return (
    <div className="space-y-2">
      {players.map((p) => {
        const isMe = p.id === player.id
        const isEditing = editingId === p.id

        return (
          <div key={p.id} className="bg-slate-800 rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                style={{ backgroundColor: p.color || '#6366F1' }}
              >
                {getInitials(p.name)}
              </div>

              {isEditing ? (
                <input
                  autoFocus
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  className="flex-1 bg-slate-700 rounded px-2 py-1 text-lg outline-none focus:ring-1 focus:ring-indigo-500"
                  maxLength={20}
                />
              ) : (
                <span className="font-medium text-lg">{p.name}</span>
              )}

              {p.id === hostId && (
                <span className="ml-auto text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold">HOST</span>
              )}

              {isMe && !isEditing && (
                <button
                  onClick={() => startEdit(p)}
                  className="ml-auto text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Edit
                </button>
              )}

              {isMe && isEditing && (
                <button
                  onClick={closeEdit}
                  className="ml-auto text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Done
                </button>
              )}
            </div>

            {/* Color picker when editing own card */}
            {isMe && isEditing && (
              <div className="flex flex-wrap gap-2 mt-3">
                {PLAYER_COLORS.map((c) => {
                  const taken = takenColors.includes(c)
                  const selected = c === player.color
                  return (
                    <button
                      key={c}
                      onClick={() => !taken && selectColor(c)}
                      disabled={taken}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 ${
                        selected ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
