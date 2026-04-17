import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext.jsx'
import WavelengthGame from '../games/Wavelength/index.jsx'
import ChameleonGame from '../games/Chameleon/index.jsx'

export default function Game() {
  const navigate = useNavigate()
  const { room, on, off, setGameState } = useGame()

  useEffect(() => {
    const handler = (state) => setGameState(state)
    const endHandler = () => navigate(`/lobby/${room.code}`)
    const closedHandler = () => navigate('/')
    on('game:state', handler)
    on('game:ended', endHandler)
    on('room:closed', closedHandler)
    return () => {
      off('game:state', handler)
      off('game:ended', endHandler)
      off('room:closed', closedHandler)
    }
  }, [on, off, setGameState, navigate, room.code])

  if (room.gameType === 'wavelength') return <WavelengthGame />
  if (room.gameType === 'chameleon') return <ChameleonGame />

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-xl text-slate-400">Unknown game type</p>
    </div>
  )
}
