import { Player } from '../entities/Player'
import { InputManager } from '../engine/InputManager'

export interface IsometricPlayer extends Player {
  velocity: { x: number; y: number }
  speed: number
  isMoving: boolean
  targetPosition?: { x: number; y: number }
  lastPosition: { x: number; y: number }
}

export class IsometricMovementSystem {
  private player: IsometricPlayer | null = null
  private worldSystem: any // Reference for collision detection
  private moveSpeed = 200 // pixels per second in world coordinates
  private smoothing = 0.15 // Movement smoothing factor
  private collisionEnabled = true // Enabled: uses tile-based collision map

  constructor(worldSystem?: any) {
    this.worldSystem = worldSystem
  }

  setPlayer(player: any) {
    this.player = {
      ...player,
      velocity: { x: 0, y: 0 },
      speed: this.moveSpeed,
      isMoving: false,
      lastPosition: { ...player.position }
    }
  }

  update(deltaTime: number, inputManager: InputManager) {
    if (!this.player) return

    // Get movement input from WASD keys
    const movementInput = this.getIsometricMovement(inputManager)
    
    if (movementInput.x !== 0 || movementInput.y !== 0) {
      this.handleMovement(movementInput, deltaTime)
    } else {
      // Stop movement smoothly
      this.player.velocity.x *= 0.8
      this.player.velocity.y *= 0.8
      this.player.isMoving = Math.abs(this.player.velocity.x) > 1 || Math.abs(this.player.velocity.y) > 1
    }

    // Apply movement
    this.applyMovement(deltaTime)
  }

  private getIsometricMovement(inputManager: InputManager): { x: number; y: number } {
    let x = 0
    let y = 0

    // Get raw WASD input
    if (inputManager.isKeyPressed('KeyW') || inputManager.isKeyPressed('ArrowUp')) y -= 1
    if (inputManager.isKeyPressed('KeyS') || inputManager.isKeyPressed('ArrowDown')) y += 1
    if (inputManager.isKeyPressed('KeyA') || inputManager.isKeyPressed('ArrowLeft')) x -= 1
    if (inputManager.isKeyPressed('KeyD') || inputManager.isKeyPressed('ArrowRight')) x += 1

    // Convert to isometric movement vectors
    // In isometric view:
    // W = move up-right (world: +x, -y)
    // S = move down-left (world: -x, +y)  
    // A = move up-left (world: -x, -y)
    // D = move down-right (world: +x, +y)
    
    const isoX = x - y  // D/A input affects this
    const isoY = x + y  // W/S input affects this
    
    // Normalize diagonal movement so it's not faster
    const length = Math.sqrt(isoX * isoX + isoY * isoY)
    if (length > 0) {
      return {
        x: (isoX / length),
        y: (isoY / length)
      }
    }

    return { x: 0, y: 0 }
  }

  private handleMovement(input: { x: number; y: number }, _deltaTime: number) {
    if (!this.player) return

    // Store last position for collision rollback
    this.player.lastPosition = { ...this.player.position }

    // Calculate target velocity
    const targetVelX = input.x * this.player.speed
    const targetVelY = input.y * this.player.speed

    // Smooth velocity changes for more fluid movement
    this.player.velocity.x += (targetVelX - this.player.velocity.x) * this.smoothing
    this.player.velocity.y += (targetVelY - this.player.velocity.y) * this.smoothing

    this.player.isMoving = true
  }

  private applyMovement(deltaTime: number) {
    if (!this.player) return

    // Calculate movement delta
    const deltaX = (this.player.velocity.x * deltaTime) / 1000
    const deltaY = (this.player.velocity.y * deltaTime) / 1000

    // Store proposed new position
    const newPosition = {
      x: this.player.position.x + deltaX,
      y: this.player.position.y + deltaY
    }

    // Check collision if enabled
    if (this.collisionEnabled && this.worldSystem && this.checkCollision(newPosition)) {
      // Try X movement only
      const xOnlyPosition = {
        x: this.player.position.x + deltaX,
        y: this.player.position.y
      }
      
      if (!this.checkCollision(xOnlyPosition)) {
        this.player.position.x = xOnlyPosition.x
      } else {
        // Try Y movement only
        const yOnlyPosition = {
          x: this.player.position.x,
          y: this.player.position.y + deltaY
        }
        
        if (!this.checkCollision(yOnlyPosition)) {
          this.player.position.y = yOnlyPosition.y
        }
        // If both fail, don't move (blocked)
      }
    } else {
      // No collision, move normally
      this.player.position.x = newPosition.x
      this.player.position.y = newPosition.y
    }

    // Emit movement event for other systems
    if (this.player.isMoving) {
      this.emitMovementEvent()
    }
  }

  private checkCollision(position: { x: number; y: number }): boolean {
    if (!this.worldSystem) return false

    // Check collision with world geometry
    try {
      // Convert world position to tile coordinates for collision checking
      const tileX = Math.floor(position.x / 50)
      const tileY = Math.floor(position.y / 50)
      
      // Check if position is blocked by buildings or walls
      if (this.worldSystem.isBlocked && this.worldSystem.isBlocked({ x: tileX * 50, y: tileY * 50 })) {
        return true
      }

      // Additional collision checks can be added here
      return false
    } catch (error) {
      console.warn('IsometricMovementSystem: Collision check failed:', error)
      return false
    }
  }

  private emitMovementEvent() {
    if (!this.player) return

    const movementData = {
      playerId: this.player.id,
      position: { ...this.player.position },
      velocity: { ...this.player.velocity },
      isMoving: this.player.isMoving,
      timestamp: Date.now()
    }

    // Emit custom event for other systems to listen to
    window.dispatchEvent(new CustomEvent('playerMovement', { detail: movementData }))
  }

  // Public methods for external access
  getPlayerPosition(): { x: number; y: number } {
    return this.player ? { ...this.player.position } : { x: 0, y: 0 }
  }

  getPlayer(): IsometricPlayer | null {
    return this.player
  }

  isPlayerMoving(): boolean {
    return this.player ? this.player.isMoving : false
  }

  getPlayerVelocity(): { x: number; y: number } {
    return this.player ? { ...this.player.velocity } : { x: 0, y: 0 }
  }

  getMovementSpeed(): number {
    return this.moveSpeed
  }

  getDebugInfo(): any {
    if (!this.player) return {}
    
    return {
      velocity: this.player.velocity,
      isMoving: this.player.isMoving,
      inputBufferSize: 0,
      lastServerUpdate: null
    }
  }

  // Movement configuration
  setMoveSpeed(speed: number) {
    this.moveSpeed = Math.max(50, Math.min(500, speed))
    if (this.player) {
      this.player.speed = this.moveSpeed
    }
  }

  getMoveSpeed(): number {
    return this.moveSpeed
  }

  enableCollision(enabled: boolean) {
    this.collisionEnabled = enabled
  }

  isCollisionEnabled(): boolean {
    return this.collisionEnabled
  }

  // Teleport player (useful for debugging or special events)
  teleportPlayer(x: number, y: number) {
    if (!this.player) return
    
    this.player.position.x = x
    this.player.position.y = y
    this.player.velocity.x = 0
    this.player.velocity.y = 0
    this.player.isMoving = false
    
    this.emitMovementEvent()
  }

  // Reset player movement state
  stop() {
    if (!this.player) return
    
    this.player.velocity.x = 0
    this.player.velocity.y = 0
    this.player.isMoving = false
  }

  // Debug method to get movement info
  getDebugInfo() {
    if (!this.player) return null
    
    return {
      position: this.player.position,
      velocity: this.player.velocity,
      speed: this.player.speed,
      isMoving: this.player.isMoving,
      collisionEnabled: this.collisionEnabled
    }
  }
}