import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'

export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setCurrentView, setAuthenticated } = useGameStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // TODO: Implement actual authentication
      console.log('Login attempt:', { username, password })
      
      // Simulate login success
      setTimeout(() => {
        setAuthenticated(true)
        setCurrentView('game')
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Login failed:', error)
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



