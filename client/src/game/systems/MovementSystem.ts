// Ultra-lightweight Movement system for maximum performance
import { Vector2 } from '../../types/game'

export class MovementSystem {
  private currentPlayer: Player | null = null
  private velocity: Vector2 = { x: 0, y: 0 }
  
  // Movement constants
  private readonly MOVEMENT_SPEED = 300 // pixels per second
  private readonly INPUT_DEADZONE = 0.1 // Minimum input threshold
  
  // Performance optimizations
  private collisionEnabled = false // Disable collision for now due to performance
  
  constructor(_worldSystem?: any) {
    console.log('🚀 MovementSystem: High-performance mode enabled (collision disabled)')
  }
  
  setPlayer(player: Player) {
    if (!player) return
    this.currentPlayer = player
    // Ensure player has valid position
    if (!player.position || typeof player.position.x !== 'number' || typeof player.position.y !== 'number') {
      player.position = { x: 0, y: 0 }
    }
  }
  
  update(deltaTime: number, inputManager: any) {
    // Ultra-fast early returns
    if (!this.currentPlayer?.position || !inputManager) return
    if (deltaTime <= 0 || deltaTime > 50) return // Skip invalid frames
    
    const dt = deltaTime / 1000 // Convert to seconds
    
    // Get movement input
    const input = inputManager.getMovementInput()
    if (!input) return
    
    // Update movement (direct, no try-catch for performance)
    this.updateMovement(input, dt)
  }
  
  private updateMovement(input: { x: number, y: number }, deltaTime: number) {
    const pos = this.currentPlayer!.position
    
    // Check for meaningful input (fast check)
    const inputMag = input.x * input.x + input.y * input.y
    if (inputMag < this.INPUT_DEADZONE * this.INPUT_DEADZONE) {
      this.velocity.x = this.velocity.y = 0
      return
    }
    
    // Normalize input for consistent speed
    const magnitude = Math.sqrt(inputMag)
    const normalizedX = input.x / magnitude
    const normalizedY = input.y / magnitude
    
    // Set velocity
    this.velocity.x = normalizedX * this.MOVEMENT_SPEED
    this.velocity.y = normalizedY * this.MOVEMENT_SPEED
    
    // Update position directly (no collision for performance)
    pos.x += this.velocity.x * deltaTime
    pos.y += this.velocity.y * deltaTime
    
    // Optional: Basic bounds checking (much faster than building collision)
    const maxBounds = 10000
    if (pos.x < -maxBounds) pos.x = -maxBounds
    if (pos.x > maxBounds) pos.x = maxBounds
    if (pos.y < -maxBounds) pos.y = -maxBounds
    if (pos.y > maxBounds) pos.y = maxBounds
  }
  
  // High-performance public methods
  getPlayerPosition(): Vector2 {
    return this.currentPlayer?.position || { x: 0, y: 0 }
  }
  
  getVelocity(): Vector2 {
    return this.velocity
  }
  
  getMovementSpeed(): number {
    return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y)
  }
  
  // Enable collision (use with caution - can cause performance issues)
  enableCollision(enabled: boolean = true) {
    this.collisionEnabled = enabled
    console.log(`MovementSystem: Collision ${enabled ? 'enabled' : 'disabled'}`)
  }
  
  // Simple server update
  receiveServerUpdate(serverPosition: Vector2) {
    if (!this.currentPlayer?.position || !serverPosition) return
    
    const dx = serverPosition.x - this.currentPlayer.position.x
    const dy = serverPosition.y - this.currentPlayer.position.y
    const distSq = dx * dx + dy * dy
    
    // Snap to server position if too far off (fast distance check)
    if (distSq > 10000) { // 100px squared
      this.currentPlayer.position.x = serverPosition.x
      this.currentPlayer.position.y = serverPosition.y
    }
  }
  
  // Debug info
  getDebugInfo() {
    return {
      position: this.getPlayerPosition(),
      velocity: this.velocity,
      speed: this.getMovementSpeed().toFixed(1),
      collisionEnabled: this.collisionEnabled
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
