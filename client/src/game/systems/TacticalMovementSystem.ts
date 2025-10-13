import { InputManager } from '../engine/InputManager';
import { Player } from '../entities/Player';
import { Vector2 } from '../utils/Vector2';
import { GridMovementController } from './GridMovementController';
import { TacticalInputProcessor } from './TacticalInputProcessor';
import {
  MovementConfiguration,
  TacticalMovementConfig,
} from './TacticalMovementConfig';

/**
 * Enhanced Player type for tactical movement
 */
export type TacticalPlayer = Player & {
  tacticalSpeed: number;
  gridPosition: Vector2;
  isGridAligned: boolean;
  lastMoveTime: number;
  movementMode: 'smooth' | 'grid';
  instantMovement: boolean;
  isMoving: boolean;
};

/**
 * Movement event data for system communication
 */
export interface TacticalMovementEvent {
  playerId: string;
  position: Vector2;
  gridPosition?: Vector2;
  direction: Vector2;
  speed: number;
  movementMode: 'smooth' | 'grid';
  timestamp: number;
}

/**
 * TacticalMovementSystem provides immediate movement response for tactical gameplay.
 * Replaces IsometricMovementSystem with instant movement, optional grid mode,
 * and enhanced tactical controls.
 */
export class TacticalMovementSystem {
  private player: TacticalPlayer | null = null;
  private worldSystem: any; // Reference for collision detection
  private config: MovementConfiguration;
  private inputProcessor: TacticalInputProcessor;
  private gridController: GridMovementController;
  private lastPosition: Vector2 = Vector2.zero();
  private currentDirection: Vector2 = Vector2.zero();

  constructor(worldSystem?: any, config?: Partial<TacticalMovementConfig>) {
    this.worldSystem = worldSystem;
    this.config = new MovementConfiguration(config);
    this.inputProcessor = new TacticalInputProcessor();
    this.gridController = new GridMovementController(
      this.config.getGridSize(),
      this.config.getGridMoveInterval()
    );
  }

  /**
   * Set the player for this movement system
   */
  setPlayer(player: Player): void {
    // Cast player to TacticalPlayer and add tactical properties
    this.player = player as TacticalPlayer;
    this.player.tacticalSpeed = this.config.getBaseSpeed();
    this.player.gridPosition = Vector2.zero();
    this.player.isGridAligned = false;
    this.player.lastMoveTime = 0;
    this.player.movementMode = this.config.isGridMode() ? 'grid' : 'smooth';
    this.player.instantMovement = this.config.isInstantResponse();
    this.player.isMoving = false;

    // Initialize grid controller with player position
    this.gridController.setPosition(
      new Vector2(player.position.x, player.position.y)
    );
    this.lastPosition = new Vector2(player.position.x, player.position.y);
  }

  /**
   * Main update method with instant movement response
   */
  update(deltaTime: number, inputManager: InputManager): void {
    if (!this.player) return;

    // Store last position for collision rollback
    this.lastPosition = new Vector2(
      this.player.position.x,
      this.player.position.y
    );

    if (this.config.isGridMode()) {
      this.updateGridMovement(deltaTime, inputManager);
    } else {
      this.updateSmoothMovement(deltaTime, inputManager);
    }

    // Update grid controller
    this.gridController.update(deltaTime);

    // Emit movement event if position changed
    this.emitMovementEventIfNeeded();
  }

  /**
   * Update smooth tactical movement with instant response
   */
  private updateSmoothMovement(
    deltaTime: number,
    inputManager: InputManager
  ): void {
    if (!this.player) return;

    // Get movement input with instant response
    const movementInput =
      this.inputProcessor.processMovementInput(inputManager);
    this.currentDirection = movementInput || Vector2.zero();

    if (this.currentDirection.magnitude > 0) {
      // Calculate movement with instant response (no acceleration)
      const moveSpeed = this.player.tacticalSpeed;
      const deltaSeconds = deltaTime / 1000;

      // Calculate movement delta with normalized speed
      const movementDelta = this.currentDirection.multiply(
        moveSpeed * deltaSeconds
      );

      // Calculate new position
      const newPosition = new Vector2(
        this.player.position.x + movementDelta.x,
        this.player.position.y + movementDelta.y
      );

      // Apply movement with collision checking
      this.applyMovementWithCollision(newPosition);

      // Update player state
      this.player.velocity = {
        x: this.currentDirection.x * moveSpeed,
        y: this.currentDirection.y * moveSpeed,
      };
      this.player.isMoving = true;
      this.player.lastMoveTime = performance.now();
    } else {
      // Stop immediately (no deceleration)
      this.player.velocity = { x: 0, y: 0 };
      this.player.isMoving = false;
    }
  }

  /**
   * Update grid-based tactical movement
   */
  private updateGridMovement(
    _deltaTime: number,
    inputManager: InputManager
  ): void {
    if (!this.player) return;

    // Get grid movement input
    const gridInput = this.inputProcessor.processGridInput(inputManager);
    this.currentDirection = gridInput || Vector2.zero();

    if (this.currentDirection.magnitude > 0) {
      // Send movement command to grid controller
      this.gridController.moveToGrid(this.currentDirection);
      this.player.lastMoveTime = performance.now();
    }

    // Get current position from grid controller
    const gridWorldPosition = this.gridController.getCurrentWorldPosition();

    // Apply position with collision checking
    this.applyMovementWithCollision(gridWorldPosition);

    // Update player state based on grid movement
    this.player.isMoving = this.gridController.isCurrentlyMoving();
    this.player.gridPosition = this.gridController.getCurrentGridPosition();
    this.player.isGridAligned = !this.gridController.isCurrentlyMoving();

    // Calculate velocity for other systems
    if (this.player.isMoving) {
      const direction = this.gridController
        .getTargetGridPosition()
        .subtract(this.gridController.getCurrentGridPosition())
        .normalize();
      this.player.velocity = {
        x: direction.x * this.player.tacticalSpeed,
        y: direction.y * this.player.tacticalSpeed,
      };
    } else {
      this.player.velocity = { x: 0, y: 0 };
    }
  }

  /**
   * Apply movement with collision detection
   */
  private applyMovementWithCollision(newPosition: Vector2): void {
    if (!this.player) return;

    const positionObj = { x: newPosition.x, y: newPosition.y };

    // Check collision if enabled
    if (
      this.config.isCollisionEnabled() &&
      this.worldSystem &&
      this.checkCollision(positionObj)
    ) {
      // Try X movement only
      const xOnlyPosition = {
        x: newPosition.x,
        y: this.player.position.y,
      };

      if (!this.checkCollision(xOnlyPosition)) {
        this.player.position.x = xOnlyPosition.x;
        // Update grid controller position if in grid mode
        if (this.config.isGridMode()) {
          this.gridController.setPosition(
            new Vector2(xOnlyPosition.x, xOnlyPosition.y)
          );
        }
      } else {
        // Try Y movement only
        const yOnlyPosition = {
          x: this.player.position.x,
          y: newPosition.y,
        };

        if (!this.checkCollision(yOnlyPosition)) {
          this.player.position.y = yOnlyPosition.y;
          // Update grid controller position if in grid mode
          if (this.config.isGridMode()) {
            this.gridController.setPosition(
              new Vector2(yOnlyPosition.x, yOnlyPosition.y)
            );
          }
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
  }

  /**
   * Check collision at given position
   */
  private checkCollision(position: { x: number; y: number }): boolean {
    if (!this.worldSystem) return false;

    try {
      if (this.worldSystem.isBlocked && this.worldSystem.isBlocked(position)) {
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Emit movement event if position has changed
   */
  private emitMovementEventIfNeeded(): void {
    if (!this.player) return;

    const currentPos = new Vector2(
      this.player.position.x,
      this.player.position.y
    );
    const hasPositionChanged = !currentPos.equals(this.lastPosition);

    if (hasPositionChanged || this.player.isMoving) {
      this.emitMovementEvent();
    }
  }

  /**
   * Emit movement event for other systems
   */
  private emitMovementEvent(): void {
    if (!this.player) return;

    const movementData: TacticalMovementEvent = {
      playerId: this.player.id,
      position: new Vector2(this.player.position.x, this.player.position.y),
      gridPosition: this.config.isGridMode()
        ? this.player.gridPosition
        : undefined,
      direction: this.currentDirection,
      speed: this.player.tacticalSpeed,
      movementMode: this.player.movementMode,
      timestamp: Date.now(),
    };

    // Emit custom event for other systems to listen to
    window.dispatchEvent(
      new CustomEvent('tacticalMovement', { detail: movementData })
    );

    // Also emit legacy playerMovement event for compatibility
    const legacyMovementData = {
      playerId: this.player.id,
      position: { ...this.player.position },
      velocity: { ...this.player.velocity },
      isMoving: this.player.isMoving,
      timestamp: Date.now(),
    };

    window.dispatchEvent(
      new CustomEvent('playerMovement', { detail: legacyMovementData })
    );
  }

  // Configuration methods

  /**
   * Set movement speed with validation
   */
  setMovementSpeed(speed: number): void {
    this.config.setBaseSpeed(speed);
    if (this.player) {
      this.player.tacticalSpeed = speed;
      this.player.speed = speed; // Update legacy speed property
    }
  }

  /**
   * Enable or disable grid mode
   */
  enableGridMode(enabled: boolean): void {
    this.config.setGridMode(enabled);
    if (this.player) {
      this.player.movementMode = enabled ? 'grid' : 'smooth';

      if (enabled) {
        // Snap to grid when enabling grid mode
        const currentPos = new Vector2(
          this.player.position.x,
          this.player.position.y
        );
        const snappedPos = this.gridController.snapToGrid(currentPos);
        this.player.position.x = snappedPos.x;
        this.player.position.y = snappedPos.y;
        this.gridController.setPosition(snappedPos);
      }
    }
  }

  /**
   * Set grid size
   */
  setGridSize(size: number): void {
    this.config.setGridSize(size);
    this.gridController.setGridSize(size);
  }

  // State query methods

  /**
   * Get player position
   */
  getPlayerPosition(): Vector2 {
    return this.player
      ? new Vector2(this.player.position.x, this.player.position.y)
      : Vector2.zero();
  }

  /**
   * Get player reference
   */
  getPlayer(): TacticalPlayer | null {
    return this.player;
  }

  /**
   * Check if player is moving
   */
  isPlayerMoving(): boolean {
    return this.player ? this.player.isMoving : false;
  }

  /**
   * Get player velocity
   */
  getPlayerVelocity(): Vector2 {
    return this.player
      ? new Vector2(this.player.velocity.x, this.player.velocity.y)
      : Vector2.zero();
  }

  /**
   * Get movement speed
   */
  getMovementSpeed(): number {
    return this.config.getBaseSpeed();
  }

  /**
   * Check if grid mode is enabled
   */
  isGridModeEnabled(): boolean {
    return this.config.isGridMode();
  }

  /**
   * Get grid size
   */
  getGridSize(): number {
    return this.config.getGridSize();
  }

  /**
   * Get current movement configuration
   */
  getConfig(): Readonly<TacticalMovementConfig> {
    return this.config.getConfig();
  }

  // Legacy compatibility methods

  /**
   * Get move speed (legacy compatibility)
   */
  getMoveSpeed(): number {
    return this.getMovementSpeed();
  }

  /**
   * Set move speed (legacy compatibility)
   */
  setMoveSpeed(speed: number): void {
    this.setMovementSpeed(speed);
  }

  /**
   * Enable collision detection
   */
  enableCollision(enabled: boolean): void {
    this.config.setCollisionEnabled(enabled);
  }

  /**
   * Check if collision is enabled
   */
  isCollisionEnabled(): boolean {
    return this.config.isCollisionEnabled();
  }

  /**
   * Teleport player to position
   */
  teleportPlayer(x: number, y: number): void {
    if (!this.player) return;

    this.player.position.x = x;
    this.player.position.y = y;
    this.player.velocity.x = 0;
    this.player.velocity.y = 0;
    this.player.isMoving = false;

    // Update grid controller position
    this.gridController.setPosition(new Vector2(x, y));
    this.lastPosition = new Vector2(x, y);

    this.emitMovementEvent();
  }

  /**
   * Stop player movement
   */
  stop(): void {
    if (!this.player) return;

    this.player.velocity.x = 0;
    this.player.velocity.y = 0;
    this.player.isMoving = false;
    this.gridController.stopMovement();
    this.currentDirection = Vector2.zero();
  }

  /**
   * Get debug information
   */
  getDebugInfo(): any {
    if (!this.player) return null;

    return {
      position: this.player.position,
      velocity: this.player.velocity,
      speed: this.player.tacticalSpeed,
      isMoving: this.player.isMoving,
      movementMode: this.player.movementMode,
      gridPosition: this.player.gridPosition?.toJSON(),
      isGridAligned: this.player.isGridAligned,
      collisionEnabled: this.config.isCollisionEnabled(),
      gridMode: this.config.isGridMode(),
      gridSize: this.config.getGridSize(),
      instantMovement: this.player.instantMovement,
      lastMoveTime: this.player.lastMoveTime,
      currentDirection: this.currentDirection.toJSON(),
      gridControllerInfo: this.gridController.getDebugInfo(),
      inputProcessorLastTime: this.inputProcessor.getLastInputTime(),
    };
  }
}
