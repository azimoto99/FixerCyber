import React from 'react'
import { GameCanvas } from './components/Game/GameCanvas'
import { GameUI } from './components/Game/GameUI'
import { Login } from './components/Auth/Login'
import { Register } from './components/Auth/Register'
import { useGameStore } from './stores/gameStore'

function App() {
  const { isAuthenticated, currentView } = useGameStore()

  if (!isAuthenticated) {
    return (
      <div className="w-full h-screen bg-cyberpunk-dark flex items-center justify-center cyber-grid">
        {currentView === 'login' ? <Login /> : <Register />}
      </div>
    )
  }

  return (
    <div className="w-full h-screen bg-cyberpunk-dark relative overflow-hidden">
      <GameCanvas />
      <GameUI />
    </div>
  )
}

export default App



