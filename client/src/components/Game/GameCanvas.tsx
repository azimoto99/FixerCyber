import { useEffect, useRef } from 'react'
import { useGameStore } from '../../stores/gameStore'

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { player, world } = useGameStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Game loop
    const gameLoop = () => {
      // Clear canvas
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw cyberpunk grid
      drawGrid(ctx, canvas.width, canvas.height)

      // Draw player
      if (player) {
        drawPlayer(ctx, player)
      }

      // Draw world elements
      if (world) {
        drawWorld(ctx, world)
      }

      requestAnimationFrame(gameLoop)
    }

    gameLoop()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [player, world])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gridSize = 20
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.1)'
  ctx.lineWidth = 1

  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: any) {
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2

  // Draw player as a cyberpunk character
  ctx.fillStyle = '#00ff88'
  ctx.beginPath()
  ctx.arc(centerX, centerY, 15, 0, Math.PI * 2)
  ctx.fill()

  // Draw player outline
  ctx.strokeStyle = '#00ffff'
  ctx.lineWidth = 2
  ctx.stroke()

  // Draw health bar
  const healthWidth = 40
  const healthHeight = 4
  const healthX = centerX - healthWidth / 2
  const healthY = centerY - 25

  ctx.fillStyle = '#ff0000'
  ctx.fillRect(healthX, healthY, healthWidth, healthHeight)

  ctx.fillStyle = '#00ff00'
  ctx.fillRect(healthX, healthY, (player.health / 100) * healthWidth, healthHeight)
}

function drawWorld(ctx: CanvasRenderingContext2D, world: any) {
  // TODO: Implement world rendering
  // This will draw buildings, NPCs, other players, etc.
}



