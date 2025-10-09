import { Player } from '../entities/Player';
import { InputManager } from '../engine/InputManager';

export interface IsometricPlayer extends Player {
  velocity: { x: number; y: number };
  speed: number;
  isMoving: boolean;
  targetPosition?: { x: number; y: number };
  lastPosition: { x: number; y: number };
}

export class IsometricMovementSystem {
  private player: IsometricPlayer | null = null;
  private worldSystem: any; // Reference for collision detection
  private moveSpeed = 200; // pixels per second in world coordinates
  private smoothing = 0.15; // Movement smoothing factor
  private collisionEnabled = true; // Enabled: uses tile-based collision map

  constructor(worldSystem?: any) {
    this.worldSystem = worldSystem;
  }

  setPlayer(player: any) {
    this.player = {
      ...player,
      velocity: { x: 0, y: 0 },
      speed: this.moveSpeed,
      isMoving: false,
      lastPosition: { ...player.position },
    };
  }

  update(deltaTime: number, inputManager: InputManager) {
    if (!this.player) return;

    // Get movement input from WASD keys
    const movementInput = this.getIsometricMovement(inputManager);

    if (movementInput.x !== 0 || movementInput.y !== 0) {
      this.handleMovement(movementInput, deltaTime);
    } else {
      // Stop movement smoothly
      this.player.velocity.x *= 0.8;
      this.player.velocity.y *= 0.8;
      this.player.isMoving =
        Math.abs(this.player.velocity.x) > 1 ||
        Math.abs(this.player.velocity.y) > 1;
    }

    // Apply movement
    this.applyMovement(deltaTime);
  }

  private getIsometricMovement(inputManager: InputManager): {
    x: number;
    y: number;
  } {
    let inputX = 0;
    let inputY = 0;

    // Get raw WASD input
    if (
      inputManager.isKeyPressed('KeyW') ||
      inputManager.isKeyPressed('ArrowUp')
    )
      inputY -= 1;
    if (
      inputManager.isKeyPressed('KeyS') ||
      inputManager.isKeyPressed('ArrowDown')
    )
      inputY += 1;
    if (
      inputManager.isKeyPressed('KeyA') ||
      inputManager.isKeyPressed('ArrowLeft')
    )
      inputX -= 1;
    if (
      inputManager.isKeyPressed('KeyD') ||
      inputManager.isKeyPressed('ArrowRight')
    )
      inputX += 1;

    // For isometric movement:
    // W should move north (up-left in screen space)
    // S should move south (down-right in screen space)
    // A should move west (down-left in screen space)
    // D should move east (up-right in screen space)

    // Convert screen-space input to world-space movement
    // This matches typical isometric game controls
    const worldX = inputX + inputY; // Right movement
    const worldY = inputY - inputX; // Down movement

    // Normalize diagonal movement so it's not faster
    const length = Math.sqrt(worldX * worldX + worldY * worldY);
    if (length > 0) {
      return {
        x: worldX / length,
        y: worldY / length,
      };
    }

    return { x: 0, y: 0 };
  }

  private handleMovement(input: { x: number; y: number }, _deltaTime: number) {
    if (!this.player) return;

    // Store last position for collision rollback
    this.player.lastPosition = { ...this.player.position };

    // Calculate target velocity
    const targetVelX = input.x * this.player.speed;
    const targetVelY = input.y * this.player.speed;

    // Smooth velocity changes for more fluid movement
    this.player.velocity.x +=
      (targetVelX - this.player.velocity.x) * this.smoothing;
    this.player.velocity.y +=
      (targetVelY - this.player.velocity.y) * this.smoothing;

    this.player.isMoving = true;
  }

  private applyMovement(deltaTime: number) {
    if (!this.player) return;

    // Calculate movement delta
    const deltaX = (this.player.velocity.x * deltaTime) / 1000;
    const deltaY = (this.player.velocity.y * deltaTime) / 1000;

    // Store proposed new position
    const newPosition = {
      x: this.player.position.x + deltaX,
      y: this.player.position.y + deltaY,
    };

    // Check collision if enabled
    if (
      this.collisionEnabled &&
      this.worldSystem &&
      this.checkCollision(newPosition)
    ) {
      // Try X movement only
      const xOnlyPosition = {
        x: this.player.position.x + deltaX,
        y: this.player.position.y,
      };

      if (!this.checkCollision(xOnlyPosition)) {
        this.player.position.x = xOnlyPosition.x;
      } else {
        // Try Y movement only
        const yOnlyPosition = {
          x: this.player.position.x,
          y: this.player.position.y + deltaY,
        };

        if (!this.checkCollision(yOnlyPosition)) {
          this.player.position.y = yOnlyPosition.y;
        }
        // If both fail, don't move (blocked)
      }
    } else {
      // No collision, move normally
      this.player.position.x = newPosition.x;
      this.player.position.y = newPosition.y;
    }

    // Update player position in world system
    if (this.worldSystem && this.worldSystem.updatePlayer) {
      this.worldSystem.updatePlayer(this.player.id, {
        position: { ...this.player.position },
      });
    }

    // Emit movement event for other systems
    if (
      this.player.isMoving ||
      Math.abs(deltaX) > 0.01 ||
      Math.abs(deltaY) > 0.01
    ) {
      this.emitMovementEvent();
    }
  }

  private checkCollision(position: { x: number; y: number }): boolean {
    if (!this.worldSystem) return false;

    // Check collision with world geometry
    try {
      // Pass world position directly (already in pixels)
      if (this.worldSystem.isBlocked && this.worldSystem.isBlocked(position)) {
        return true;
      }

      // Additional collision checks can be added here
      return false;
    } catch (error) {
      console.warn('IsometricMovementSystem: Collision check failed:', error);
      return false;
    }
  }

  private emitMovementEvent() {
    if (!this.player) return;

    const movementData = {
      playerId: this.player.id,
      position: { ...this.player.position },
      velocity: { ...this.player.velocity },
      isMoving: this.player.isMoving,
      timestamp: Date.now(),
    };

    // Emit custom event for other systems to listen to
    window.dispatchEvent(
      new CustomEvent('playerMovement', { detail: movementData })
    );
  }

  // Public methods for external access
  getPlayerPosition(): { x: number; y: number } {
    return this.player ? { ...this.player.position } : { x: 0, y: 0 };
  }

  getPlayer(): IsometricPlayer | null {
    return this.player;
  }

  isPlayerMoving(): boolean {
    return this.player ? this.player.isMoving : false;
  }

  getPlayerVelocity(): { x: number; y: number } {
    return this.player ? { ...this.player.velocity } : { x: 0, y: 0 };
  }

  getMovementSpeed(): number {
    return this.moveSpeed;
  }

  // Movement configuration
  setMoveSpeed(speed: number) {
    this.moveSpeed = Math.max(50, Math.min(500, speed));
    if (this.player) {
      this.player.speed = this.moveSpeed;
    }
  }

  getMoveSpeed(): number {
    return this.moveSpeed;
  }

  enableCollision(enabled: boolean) {
    this.collisionEnabled = enabled;
  }

  isCollisionEnabled(): boolean {
    return this.collisionEnabled;
  }

  // Teleport player (useful for debugging or special events)
  teleportPlayer(x: number, y: number) {
    if (!this.player) return;

    this.player.position.x = x;
    this.player.position.y = y;
    this.player.velocity.x = 0;
    this.player.velocity.y = 0;
    this.player.isMoving = false;

    this.emitMovementEvent();
  }

  // Reset player movement state
  stop() {
    if (!this.player) return;

    this.player.velocity.x = 0;
    this.player.velocity.y = 0;
    this.player.isMoving = false;
  }

  // Debug method to get movement info
  getDebugInfo() {
    if (!this.player) return null;

    return {
      position: this.player.position,
      velocity: this.player.velocity,
      speed: this.player.speed,
      isMoving: this.player.isMoving,
      collisionEnabled: this.collisionEnabled,
      inputBufferSize: 0,
      lastServerUpdate: null,
    };
  }
}
