import { createContext, useContext, useState, useCallback } from 'react'
import useSocket from '../hooks/useSocket.js'

const GameContext = createContext(null)

export function GameProvider({ children }) {
  const { socket, emit, on, off } = useSocket()
  const [player, setPlayer] = useState({ id: null, name: '' })
  const [room, setRoom] = useState({ code: '', players: [], hostId: null, gameType: '', theme: '' })
  const [gameState, setGameState] = useState({})

  const sendAction = useCallback(
    (action, payload = {}) => {
      emit('game:action', { code: room.code, action, payload })
    },
    [emit, room.code],
  )

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
