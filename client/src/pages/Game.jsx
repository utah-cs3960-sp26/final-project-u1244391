import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext.jsx'
import WavelengthGame from '../games/Wavelength/index.jsx'
import ChameleonGame from '../games/Chameleon/index.jsx'

export default function Game() {
  const navigate = useNavigate()
  const { room, on, off, setGameState, setChat } = useGame()
  const [error, setError] = useState(null)

  useEffect(() => {
    const handler = (state) => setGameState(state)
    const endHandler = () => { setChat([]); navigate(`/lobby/${room.code}`) }
    const closedHandler = () => navigate('/')
    const errorHandler = ({ message }) => {
      setError(message)
      setTimeout(() => setError(null), 3000)
    }
    on('game:state', handler)
    on('game:ended', endHandler)
    on('room:closed', closedHandler)
    on('game:error', errorHandler)
    return () => {
      off('game:state', handler)
      off('game:ended', endHandler)
      off('room:closed', closedHandler)
      off('game:error', errorHandler)
    }
  }, [on, off, setGameState, navigate, room.code])

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 text-sm font-medium">
          {error}
        </div>
      )}
      {room.gameType === 'wavelength' && <WavelengthGame />}
      {room.gameType === 'chameleon' && <ChameleonGame />}
      {room.gameType !== 'wavelength' && room.gameType !== 'chameleon' && (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-xl text-slate-400">Unknown game type</p>
        </div>
      )}
    </>
  )
}
