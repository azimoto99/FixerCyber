import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'

export function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setCurrentView } = useGameStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      alert('Passwords do not match')
      return
    }
    
    setLoading(true)
    
    try {
      // TODO: Implement actual registration
      console.log('Registration attempt:', { username, email, password })
      
      // Simulate registration success
      setTimeout(() => {
        setCurrentView('login')
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Registration failed:', error)
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-cyberpunk-gray/80 backdrop-blur-sm border border-cyberpunk-primary rounded-lg p-8 neon-glow">
        <h1 className="text-3xl font-bold text-cyberpunk-primary text-center mb-8">
          NEW IDENTITY
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
              placeholder="Choose your handle"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-cyberpunk-light mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="cyber-input w-full"
              placeholder="Enter your contact"
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
              placeholder="Create a passcode"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-cyberpunk-light mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="cyber-input w-full"
              placeholder="Confirm your passcode"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="cyber-button w-full disabled:opacity-50"
          >
            {loading ? 'CREATING...' : 'REGISTER'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => setCurrentView('login')}
            className="text-cyberpunk-primary hover:text-cyberpunk-accent transition-colors"
          >
            Already have an identity?
          </button>
        </div>
      </div>
    </div>
  )
}



