// Movement system with client prediction and server reconciliation
import { Vector2 } from '../../types/game'

export class MovementSystem {
  private currentPlayer: Player | null = null
  private inputBuffer: MovementInput[] = []
  private serverPosition: Vector2 = { x: 0, y: 0 }
  private predictedPosition: Vector2 = { x: 0, y: 0 }
  private velocity: Vector2 = { x: 0, y: 0 }
  private inputSequence = 0
  private lastServerUpdate = 0
  
  // Movement constants
  private readonly MOVEMENT_SPEED = 200 // pixels per second
  private readonly ACCELERATION = 800
  private readonly DECELERATION = 1000
  private readonly MAX_INPUT_BUFFER = 60 // ~1 second at 60fps
  private readonly RECONCILIATION_THRESHOLD = 5 // pixels
  
  constructor() {}
  
  setPlayer(player: Player) {
    this.currentPlayer = player
    this.predictedPosition = { ...player.position }
    this.serverPosition = { ...player.position }
  }
  
  update(deltaTime: number, inputManager: any) {
    if (!this.currentPlayer) return
    
    const dt = deltaTime / 1000 // Convert to seconds
    
    // Get current input
    const movementInput = inputManager.getMovementInput()
    const hasInput = Math.abs(movementInput.x) > 0 || Math.abs(movementInput.y) > 0
    
    if (hasInput) {
      this.processMovementInput(movementInput, dt)
    }
    
    // Apply movement physics
    this.updateVelocity(movementInput, dt)
    this.updatePosition(dt)
    
    // Clean up old inputs
    this.cleanupInputBuffer()
    
    // Update camera to follow player
    this.updateCamera()
  }
  
  private processMovementInput(input: { x: number, y: number }, deltaTime: number) {
    // Store input with sequence number for server reconciliation
    const movementInput: MovementInput = {
      sequence: ++this.inputSequence,
      input: { ...input },
      timestamp: performance.now(),
      deltaTime
    }
    
    this.inputBuffer.push(movementInput)
    
    // Limit buffer size
    if (this.inputBuffer.length > this.MAX_INPUT_BUFFER) {
      this.inputBuffer.shift()
    }
    
    // Emit to server (will be handled by networking layer)
    this.emitMovement(movementInput)
  }
  
  private updateVelocity(input: { x: number, y: number }, deltaTime: number) {
    const targetVelocityX = input.x * this.MOVEMENT_SPEED
    const targetVelocityY = input.y * this.MOVEMENT_SPEED
    
    // Apply acceleration or deceleration
    const accel = Math.abs(input.x) > 0 ? this.ACCELERATION : this.DECELERATION
    const accelY = Math.abs(input.y) > 0 ? this.ACCELERATION : this.DECELERATION
    
    // Smooth velocity changes
    this.velocity.x = this.lerp(this.velocity.x, targetVelocityX, accel * deltaTime / this.MOVEMENT_SPEED)
    this.velocity.y = this.lerp(this.velocity.y, targetVelocityY, accelY * deltaTime / this.MOVEMENT_SPEED)
    
    // Apply speed limit
    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y)
    if (speed > this.MOVEMENT_SPEED) {
      const scale = this.MOVEMENT_SPEED / speed
      this.velocity.x *= scale
      this.velocity.y *= scale
    }
  }
  
  private updatePosition(deltaTime: number) {
    // Update predicted position
    this.predictedPosition.x += this.velocity.x * deltaTime
    this.predictedPosition.y += this.velocity.y * deltaTime
    
    // Update player position (client prediction)
    if (this.currentPlayer) {
      this.currentPlayer.position.x = this.predictedPosition.x
      this.currentPlayer.position.y = this.predictedPosition.y
    }
  }
  
  private updateCamera() {
    // This will be called by the GameEngine to update the camera
    // The camera should smoothly follow the player
  }
  
  // Server reconciliation
  receiveServerUpdate(serverData: ServerMovementUpdate) {
    this.lastServerUpdate = performance.now()
    this.serverPosition = { ...serverData.position }
    
    // Calculate prediction error
    const errorX = Math.abs(this.predictedPosition.x - serverData.position.x)
    const errorY = Math.abs(this.predictedPosition.y - serverData.position.y)
    const totalError = Math.sqrt(errorX * errorX + errorY * errorY)
    
    if (totalError > this.RECONCILIATION_THRESHOLD) {
      console.log(`Movement reconciliation needed: ${totalError.toFixed(2)}px error`)
      
      // Snap to server position if error is large
      if (totalError > 50) {
        this.predictedPosition = { ...serverData.position }
        if (this.currentPlayer) {
          this.currentPlayer.position = { ...serverData.position }
        }
      } else {
        // Smooth correction for smaller errors
        this.smoothCorrection(serverData.position)
      }
      
      // Re-apply inputs that happened after server's last processed input
      this.reapplyInputs(serverData.lastInputSequence)
    }
  }
  
  private smoothCorrection(serverPosition: Vector2) {
    const correctionFactor = 0.1 // Adjust for smoothness vs accuracy
    this.predictedPosition.x += (serverPosition.x - this.predictedPosition.x) * correctionFactor
    this.predictedPosition.y += (serverPosition.y - this.predictedPosition.y) * correctionFactor
    
    if (this.currentPlayer) {
      this.currentPlayer.position.x = this.predictedPosition.x
      this.currentPlayer.position.y = this.predictedPosition.y
    }
  }
  
  private reapplyInputs(lastProcessedSequence: number) {
    // Find inputs that need to be re-applied
    const inputsToReapply = this.inputBuffer.filter(input => input.sequence > lastProcessedSequence)
    
    // Re-apply them to get the correct predicted position
    let tempPosition = { ...this.serverPosition }
    let tempVelocity = { x: 0, y: 0 }
    
    inputsToReapply.forEach(inputData => {
      // Simulate movement for this input
      const targetVelX = inputData.input.x * this.MOVEMENT_SPEED
      const targetVelY = inputData.input.y * this.MOVEMENT_SPEED
      
      tempVelocity.x = this.lerp(tempVelocity.x, targetVelX, this.ACCELERATION * inputData.deltaTime / this.MOVEMENT_SPEED)
      tempVelocity.y = this.lerp(tempVelocity.y, targetVelY, this.ACCELERATION * inputData.deltaTime / this.MOVEMENT_SPEED)
      
      tempPosition.x += tempVelocity.x * inputData.deltaTime
      tempPosition.y += tempVelocity.y * inputData.deltaTime
    })
    
    this.predictedPosition = tempPosition
    this.velocity = tempVelocity
    
    if (this.currentPlayer) {
      this.currentPlayer.position = { ...this.predictedPosition }
    }
  }
  
  private cleanupInputBuffer() {
    const now = performance.now()
    const maxAge = 2000 // Keep inputs for 2 seconds
    
    this.inputBuffer = this.inputBuffer.filter(input => 
      now - input.timestamp < maxAge
    )
  }
  
  private emitMovement(input: MovementInput) {
    // This will be connected to the networking system
    // For now, we'll emit a custom event that can be caught by the GameEngine
    window.dispatchEvent(new CustomEvent('playerMovement', { 
      detail: {
        sequence: input.sequence,
        input: input.input,
        position: { ...this.predictedPosition },
        timestamp: input.timestamp
      }
    }))
  }
  
  private lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * Math.min(1, Math.max(0, factor))
  }
  
  // Public methods
  getPlayerPosition(): Vector2 {
    return this.currentPlayer ? { ...this.currentPlayer.position } : { x: 0, y: 0 }
  }
  
  getVelocity(): Vector2 {
    return { ...this.velocity }
  }
  
  getPredictedPosition(): Vector2 {
    return { ...this.predictedPosition }
  }
  
  getMovementSpeed(): number {
    const vel = this.getVelocity()
    return Math.sqrt(vel.x * vel.x + vel.y * vel.y)
  }
  
  // For debugging
  getDebugInfo() {
    return {
      predictedPosition: this.predictedPosition,
      serverPosition: this.serverPosition,
      velocity: this.velocity,
      inputBufferSize: this.inputBuffer.length,
      lastServerUpdate: this.lastServerUpdate
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

interface MovementInput {
  sequence: number
  input: { x: number, y: number }
  timestamp: number
  deltaTime: number
}

interface ServerMovementUpdate {
  playerId: string
  position: Vector2
  velocity?: Vector2
  timestamp: number
  lastInputSequence: number
}