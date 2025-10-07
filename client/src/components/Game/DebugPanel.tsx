import { useEffect, useState } from 'react'

interface DebugPanelProps {
  gameEngine: any
}

export function DebugPanel({ gameEngine }: DebugPanelProps) {
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!gameEngine) return

    const updateInterval = setInterval(() => {
      const movementSystem = gameEngine.getMovementSystem()
      if (movementSystem) {
        const info = movementSystem.getDebugInfo()
        const playerPos = movementSystem.getPlayerPosition()
        const velocity = movementSystem.getVelocity()
        const speed = movementSystem.getMovementSpeed()

        setDebugInfo({
          ...info,
          currentPosition: playerPos,
          speed: Math.round(speed * 100) / 100,
          velocityMagnitude: Math.round(Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y) * 100) / 100
        })
      }
    }, 100) // Update 10 times per second

    return () => clearInterval(updateInterval)
  }, [gameEngine])

  // Toggle debug panel with F3
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault()
        setIsVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  if (!isVisible) {
    return (
      <div className="absolute top-4 left-4 text-xs text-cyberpunk-light/50">
        Press F3 for debug info
      </div>
    )
  }

  return (
    <div className="absolute top-4 left-4 bg-black/80 text-cyberpunk-light p-4 rounded border border-cyberpunk-primary text-xs font-mono">
      <div className="text-cyberpunk-primary font-bold mb-2">🔧 DEBUG PANEL</div>
      
      <div className="space-y-1">
        <div>
          <span className="text-cyberpunk-accent">Position:</span> 
          {debugInfo.currentPosition ? 
            ` (${Math.round(debugInfo.currentPosition.x)}, ${Math.round(debugInfo.currentPosition.y)})` : 
            ' N/A'
          }
        </div>
        
        <div>
          <span className="text-cyberpunk-accent">Predicted:</span> 
          {debugInfo.predictedPosition ? 
            ` (${Math.round(debugInfo.predictedPosition.x)}, ${Math.round(debugInfo.predictedPosition.y)})` : 
            ' N/A'
          }
        </div>
        
        <div>
          <span className="text-cyberpunk-accent">Server:</span> 
          {debugInfo.serverPosition ? 
            ` (${Math.round(debugInfo.serverPosition.x)}, ${Math.round(debugInfo.serverPosition.y)})` : 
            ' N/A'
          }
        </div>
        
        <div>
          <span className="text-cyberpunk-accent">Velocity:</span> 
          {debugInfo.velocity ? 
            ` (${Math.round(debugInfo.velocity.x * 100) / 100}, ${Math.round(debugInfo.velocity.y * 100) / 100})` : 
            ' N/A'
          }
        </div>
        
        <div>
          <span className="text-cyberpunk-accent">Speed:</span> {debugInfo.speed || 0} px/s
        </div>
        
        <div>
          <span className="text-cyberpunk-accent">Input Buffer:</span> {debugInfo.inputBufferSize || 0}
        </div>
        
        <div>
          <span className="text-cyberpunk-accent">Last Server Update:</span> 
          {debugInfo.lastServerUpdate ? 
            ` ${Date.now() - debugInfo.lastServerUpdate}ms ago` : 
            ' Never'
          }
        </div>
      </div>
      
      <div className="mt-3 text-xs text-cyberpunk-light/70">
        WASD: Move • F3: Toggle Debug
      </div>
    </div>
  )
}