import { useEffect, useRef } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { GameEngine } from '../../game/engine/GameEngine'
import { DebugPanel } from './DebugPanel'

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameEngineRef = useRef<GameEngine | null>(null)
  const { player, world } = useGameStore()

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

    // Start game engine
    gameEngine.start()

    // Set player in game engine if available
    if (player) {
      gameEngine.setPlayer(player)
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      gameEngine.stop()
    }
  }, [player, world])

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
      <DebugPanel gameEngine={gameEngineRef.current} />
    </>
  )
}


