import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import useSocket from '../hooks/useSocket.js'

const GameContext = createContext(null)

export function GameProvider({ children }) {
  const { socket, emit, on, off } = useSocket()
  const [player, setPlayer] = useState({ id: null, name: '', color: null })
  const [room, setRoom] = useState({ code: '', players: [], hostId: null, gameType: '', theme: '' })
  const [gameState, setGameState] = useState({})
  const [chat, setChat] = useState([])

  const sendAction = useCallback(
    (action, payload = {}) => {
      emit('game:action', { code: room.code, action, payload })
    },
    [emit, room.code],
  )

  const sendChat = useCallback(
    (message) => {
      emit('chat:send', { code: room.code, message })
    },
    [emit, room.code],
  )

  // Listen for chat messages globally
  useEffect(() => {
    const handler = (msg) => setChat((prev) => [...prev, msg])
    on('chat:message', handler)
    return () => off('chat:message', handler)
  }, [on, off])

  return (
    <GameContext.Provider
      value={{
        socket,
        emit,
        on,
        off,
        player,
        setPlayer,
        room,
        setRoom,
        gameState,
        setGameState,
        sendAction,
        chat,
        setChat,
        sendChat,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
