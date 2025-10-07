import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { GameEngine } from '../../game/engine/GameEngine'
import { LoadingProgress } from '../../game/systems/LoadingSystem'
import { DebugPanel } from './DebugPanel'
import LoadingScreen from './LoadingScreen'
import { InteractionPrompt } from './InteractionPrompt'

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameEngineRef = useRef<GameEngine | null>(null)
  const { player } = useGameStore()
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({
    stage: 'idle',
    progress: 0,
    message: 'Initializing...',
    chunksLoaded: 0,
    totalChunks: 0,
    estimatedTimeRemaining: 0
  })
  const [gameReady, setGameReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Initialize GameEngine with enhanced renderer
    if (!gameEngineRef.current) {
      gameEngineRef.current = new GameEngine(canvas)
    }

    const gameEngine = gameEngineRef.current

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      // Notify renderer of resize
      const renderer = gameEngine.getRenderer()
      if (renderer) {
        renderer.resize(canvas.width, canvas.height)
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Initialize loading process
    const initializeGame = async () => {
      try {
        console.log('🎮 Starting game initialization...')
        
        await gameEngine.startLoading(
          // Progress callback
          (progress) => {
            setLoadingProgress(progress)
            console.log(`Loading progress: ${progress.progress.toFixed(1)}% - ${progress.message}`)
          },
          // Complete callback  
          () => {
            console.log('✅ Loading complete, starting game...')
            setIsLoading(false)
            setGameReady(true)
            gameEngine.start()
          },
          // Spawn position
          { x: 0, y: 0 },
          // Chunk radius (smaller for faster loading)
          2
        )
      } catch (error) {
        console.error('❌ Game initialization failed:', error)
        setLoadingProgress(prev => ({
          ...prev,
          stage: 'error',
          message: `Loading failed: ${error instanceof Error ? error.message : String(error)}`
        }))
      }
    }

    // Only start loading if not already loading and not ready
    if (isLoading && !gameReady) {
      initializeGame()
    }

    // Set player in game engine if available and game is ready
    if (player && gameReady && gameEngine.isWorldReady()) {
      gameEngine.setPlayer(player)
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      gameEngine.stop()
    }
  }, []) // Empty dependency - only initialize once

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ 
          imageRendering: 'pixelated',
          cursor: 'crosshair'
        }}
      />
      
      {/* Loading Screen */}
      {isLoading && (
        <LoadingScreen 
          progress={loadingProgress}
          allowCancel={false}
        />
      )}
      
      {/* Debug Panel - only show when game is ready */}
      {gameReady && <DebugPanel gameEngine={gameEngineRef.current} />}
      
      {/* Interaction Prompt */}
      {gameReady && <InteractionPrompt gameEngine={gameEngineRef.current} />}
    </>
  )
}


