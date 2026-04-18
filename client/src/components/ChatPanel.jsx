import { useState, useRef, useEffect } from 'react'
import { useGame } from '../context/GameContext.jsx'

export default function ChatPanel() {
  const { player, chat, sendChat } = useGame()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.length])

  function handleSend() {
    if (!input.trim()) return
    sendChat(input.trim())
    setInput('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="w-full mt-4">
      <div className="bg-slate-800 rounded-lg px-4 py-2 text-sm font-medium text-slate-300 mb-0 rounded-b-none">
        💬 Chat
      </div>
      <div className="bg-slate-800/90 backdrop-blur rounded-b-lg border-t border-slate-700">
        <div className="h-60 overflow-y-auto p-3 space-y-1">
          {chat.length === 0 && (
            <p className="text-sm text-slate-500 italic text-center py-4">No messages yet</p>
          )}
          {chat.map((msg, i) => (
            <div
              key={i}
              className={`text-sm rounded px-2 py-1 ${
                msg.playerId === player.id ? 'bg-slate-700/50' : ''
              }`}
            >
              <span style={{ color: msg.color }} className="font-bold">{msg.name}</span>
              <span className="text-slate-400">: </span>
              <span className="text-slate-200">{msg.message}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-2 border-t border-slate-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 200))}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
              maxLength={200}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
