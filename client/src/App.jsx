import { Routes, Route } from 'react-router-dom'
import { GameProvider } from './context/GameContext.jsx'
import Home from './pages/Home.jsx'
import Lobby from './pages/Lobby.jsx'
import Game from './pages/Game.jsx'

export default function App() {
  return (
    <GameProvider>
      <div className="min-h-screen bg-slate-900 text-white">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lobby/:code" element={<Lobby />} />
          <Route path="/game/:code" element={<Game />} />
        </Routes>
      </div>
    </GameProvider>
  )
}
