import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { apiService } from '../../services/api'

export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setCurrentView, setAuthenticated, setPlayer } = useGameStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const result: any = await apiService.login(username, password)

      if (result?.token) {
        localStorage.setItem('auth_token', result.token)
      }

      // Fetch or create player profile
      try {
        const me: any = await apiService.getPlayer()
        setPlayer({
          id: me.id,
          username: me.username,
          position: me.position ?? { x: 0, y: 0 },
          health: me.health ?? 100,
          credits: me.credits ?? 0,
          isAlive: me.isAlive ?? true,
        })
      } catch (_) {
        // If no player profile exists yet, create one
        const created: any = await apiService.createPlayer(username)
        setPlayer({
          id: created.id,
          username: created.username ?? username,
          position: created.position ?? { x: 0, y: 0 },
          health: created.health ?? 100,
          credits: created.credits ?? 0,
          isAlive: created.isAlive ?? true,
        })
      }

      setAuthenticated(true)
      setCurrentView('game')
    } catch (error) {
      console.error('Login failed:', error)
      alert('Login failed. Please check your credentials and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-cyberpunk-gray/80 backdrop-blur-sm border border-cyberpunk-primary rounded-lg p-8 neon-glow">
        <h1 className="text-3xl font-bold text-cyberpunk-primary text-center mb-8">
          FIXER
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-cyberpunk-light mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="cyber-input w-full"
              placeholder="Enter your handle"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-cyberpunk-light mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="cyber-input w-full"
              placeholder="Enter your passcode"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="cyber-button w-full disabled:opacity-50"
          >
            {loading ? 'CONNECTING...' : 'LOGIN'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => setCurrentView('register')}
            className="text-cyberpunk-primary hover:text-cyberpunk-accent transition-colors"
          >
            Need a new identity?
          </button>
        </div>
      </div>
    </div>
  )
}



