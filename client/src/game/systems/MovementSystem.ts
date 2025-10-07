// Simplified Movement system for stable gameplay
import { Vector2 } from '../../types/game'

export class MovementSystem {
  private currentPlayer: Player | null = null
  private velocity: Vector2 = { x: 0, y: 0 }
  private worldSystem: any = null // Reference to WorldSystem for collision detection
  
  // Movement constants
  private readonly MOVEMENT_SPEED = 300 // pixels per second
  private readonly INPUT_DEADZONE = 0.15 // Minimum input threshold to prevent micro-movements
  private readonly PLAYER_RADIUS = 16 // Player collision radius
  
  constructor(worldSystem?: any) {
    this.worldSystem = worldSystem
  }
  
  setPlayer(player: Player) {
    if (!player) {
      console.warn('MovementSystem: Attempted to set null player')
      return
    }
    this.currentPlayer = player
    // Ensure player has valid position
    if (!player.position || typeof player.position.x !== 'number' || typeof player.position.y !== 'number') {
      player.position = { x: 0, y: 0 }
    }
  }
  
  update(deltaTime: number, inputManager: any) {
    if (!this.currentPlayer || !inputManager) return
    
    // Safety check for deltaTime
    if (!deltaTime || deltaTime <= 0 || deltaTime > 100) {
      console.warn('MovementSystem: Invalid deltaTime:', deltaTime)
      return
    }
    
    const dt = Math.min(deltaTime / 1000, 0.016) // Cap at ~60fps frame time
    
    try {
      // Get current input safely
      const movementInput = inputManager.getMovementInput()
      if (!movementInput || typeof movementInput.x !== 'number' || typeof movementInput.y !== 'number') {
        console.warn('MovementSystem: Invalid movement input:', movementInput)
        return
      }
      
      // Update velocity based on input
      this.updateVelocity(movementInput)
      
      // Update position
      this.updatePosition(dt)
      
    } catch (error) {
      console.error('MovementSystem: Error in update:', error)
    }
  }
  
  private updateVelocity(input: { x: number, y: number }) {
    // Check if there's meaningful input
    const hasInput = Math.abs(input.x) > this.INPUT_DEADZONE || Math.abs(input.y) > this.INPUT_DEADZONE
    
    if (hasInput) {
      // Normalize input for consistent diagonal movement
      const inputMagnitude = Math.sqrt(input.x * input.x + input.y * input.y)
      
      if (inputMagnitude > 0) {
        // Set velocity with consistent speed in all directions
        this.velocity.x = (input.x / inputMagnitude) * this.MOVEMENT_SPEED
        this.velocity.y = (input.y / inputMagnitude) * this.MOVEMENT_SPEED
      } else {
        this.velocity.x = 0
        this.velocity.y = 0
      }
    } else {
      // Instant stop when no input
      this.velocity.x = 0
      this.velocity.y = 0
    }
  }
  
  private updatePosition(deltaTime: number) {
    if (!this.currentPlayer || !this.currentPlayer.position) return
    
    // Calculate potential new position
    const newX = this.currentPlayer.position.x + this.velocity.x * deltaTime
    const newY = this.currentPlayer.position.y + this.velocity.y * deltaTime
    
    // Simple collision detection if world system is available
    let finalX = newX
    let finalY = newY
    
    if (this.worldSystem && typeof this.worldSystem.isBlocked === 'function') {
      try {
        // Check basic collision points
        const centerBlocked = this.worldSystem.isBlocked({ x: newX, y: newY })
        const leftBlocked = this.worldSystem.isBlocked({ x: newX - this.PLAYER_RADIUS, y: newY })
        const rightBlocked = this.worldSystem.isBlocked({ x: newX + this.PLAYER_RADIUS, y: newY })
        const topBlocked = this.worldSystem.isBlocked({ x: newX, y: newY - this.PLAYER_RADIUS })
        const bottomBlocked = this.worldSystem.isBlocked({ x: newX, y: newY + this.PLAYER_RADIUS })
        
        // If any collision detected, revert to previous position
        if (centerBlocked || leftBlocked || rightBlocked || topBlocked || bottomBlocked) {
          // Try X movement only
          const xOnlyBlocked = this.worldSystem.isBlocked({ x: newX, y: this.currentPlayer.position.y })
          if (!xOnlyBlocked) {
            finalX = newX
            finalY = this.currentPlayer.position.y
          } else {
            // Try Y movement only
            const yOnlyBlocked = this.worldSystem.isBlocked({ x: this.currentPlayer.position.x, y: newY })
            if (!yOnlyBlocked) {
              finalX = this.currentPlayer.position.x
              finalY = newY
            } else {
              // No movement allowed
              finalX = this.currentPlayer.position.x
              finalY = this.currentPlayer.position.y
            }
          }
        }
      } catch (error) {
        console.warn('MovementSystem: Collision detection error:', error)
        // Fallback: allow movement without collision
      }
    }
    
    // Update player position with safety checks
    if (typeof finalX === 'number' && typeof finalY === 'number' && 
        !isNaN(finalX) && !isNaN(finalY) && 
        isFinite(finalX) && isFinite(finalY)) {
      this.currentPlayer.position.x = finalX
      this.currentPlayer.position.y = finalY
    }
  }
  
  // Public methods
  getPlayerPosition(): Vector2 {
    if (this.currentPlayer && this.currentPlayer.position) {
      return { x: this.currentPlayer.position.x, y: this.currentPlayer.position.y }
    }
    return { x: 0, y: 0 }
  }
  
  getVelocity(): Vector2 {
    return { x: this.velocity.x, y: this.velocity.y }
  }
  
  getMovementSpeed(): number {
    return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y)
  }
  
  // Simple server update without complex reconciliation
  receiveServerUpdate(serverPosition: Vector2) {
    if (!this.currentPlayer || !serverPosition) return
    
    try {
      // Simple position correction for multiplayer
      const dx = serverPosition.x - this.currentPlayer.position.x
      const dy = serverPosition.y - this.currentPlayer.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // If server position is significantly different, snap to it
      if (distance > 100) {
        this.currentPlayer.position.x = serverPosition.x
        this.currentPlayer.position.y = serverPosition.y
      }
    } catch (error) {
      console.warn('MovementSystem: Error in server update:', error)
    }
  }
  
  // For debugging
  getDebugInfo() {
    return {
      playerPosition: this.getPlayerPosition(),
      velocity: this.getVelocity(),
      speed: this.getMovementSpeed()
    }
  }
}

// Types
interface Player {
  id: string
  username: string
  position: Vector2
  health: number
  credits: number
  isAlive: boolean
}
