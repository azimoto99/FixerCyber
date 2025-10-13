import { Vector2 } from '../utils/Vector2';

/**
 * GridMovementController handles optional tactical grid-based movement
 * Provides discrete grid movement with timing intervals and position management
 */
export class GridMovementController {
  private gridSize: number;
  private currentGridPosition: Vector2;
  private targetGridPosition: Vector2;
  private currentWorldPosition: Vector2;
  private moveTimer: number;
  private moveInterval: number;
  private isMoving: boolean;
  private pendingDirection: Vector2 | null;

  constructor(gridSize: number = 32, moveInterval: number = 200) {
    this.gridSize = gridSize;
    this.moveInterval = moveInterval;
    this.currentGridPosition = new Vector2(0, 0);
    this.targetGridPosition = new Vector2(0, 0);
    this.currentWorldPosition = new Vector2(0, 0);
    this.moveTimer = 0;
    this.isMoving = false;
    this.pendingDirection = null;
  }

  /**
   * Update the grid movement controller
   * Handles movement timing and position interpolation
   */
  update(deltaTime: number): void {
    if (!this.isMoving) {
      return;
    }

    this.moveTimer += deltaTime;

    if (this.moveTimer >= this.moveInterval) {
      // Complete the current move
      this.completeMove();

      // Check if there's a pending direction to continue moving
      if (this.pendingDirection) {
        this.startMove(this.pendingDirection);
        this.pendingDirection = null;
      }
    }
  }

  /**
   * Initiate movement in the specified direction
   * If already moving, queue the direction for the next move
   */
  moveToGrid(direction: Vector2): void {
    // Normalize direction to ensure it's a unit vector in cardinal/diagonal directions
    const normalizedDirection = this.normalizeGridDirection(direction);

    if (normalizedDirection.magnitude === 0) {
      return; // Invalid direction
    }

    if (this.isMoving) {
      // Queue the direction for the next move
      this.pendingDirection = normalizedDirection;
    } else {
      // Start immediate movement
      this.startMove(normalizedDirection);
    }
  }

  /**
   * Start a grid movement in the specified direction
   */
  private startMove(direction: Vector2): void {
    this.targetGridPosition = this.currentGridPosition.add(direction);
    this.moveTimer = 0;
    this.isMoving = true;
  }

  /**
   * Complete the current grid movement
   */
  private completeMove(): void {
    this.currentGridPosition = this.targetGridPosition.clone();
    this.currentWorldPosition = this.gridToWorld(this.currentGridPosition);
    this.isMoving = false;
    this.moveTimer = 0;
  }

  /**
   * Normalize direction vector for grid movement
   * Ensures only cardinal and diagonal directions are allowed
   */
  private normalizeGridDirection(direction: Vector2): Vector2 {
    const x = Math.sign(direction.x);
    const y = Math.sign(direction.y);
    return new Vector2(x, y);
  }

  /**
   * Snap a world position to the nearest grid position
   */
  snapToGrid(position: Vector2): Vector2 {
    const gridPos = this.worldToGrid(position);
    return this.gridToWorld(gridPos);
  }

  /**
   * Convert world coordinates to grid coordinates
   */
  worldToGrid(worldPos: Vector2): Vector2 {
    return new Vector2(
      Math.floor(worldPos.x / this.gridSize),
      Math.floor(worldPos.y / this.gridSize)
    );
  }

  /**
   * Convert grid coordinates to world coordinates
   * Returns the center of the grid cell
   */
  gridToWorld(gridPos: Vector2): Vector2 {
    return new Vector2(
      gridPos.x * this.gridSize + this.gridSize / 2,
      gridPos.y * this.gridSize + this.gridSize / 2
    );
  }

  /**
   * Get the current world position
   * If moving, returns interpolated position between current and target
   */
  getCurrentWorldPosition(): Vector2 {
    if (!this.isMoving) {
      return this.currentWorldPosition.clone();
    }

    // Interpolate between current and target positions
    const progress = Math.min(this.moveTimer / this.moveInterval, 1.0);
    const currentWorld = this.gridToWorld(this.currentGridPosition);
    const targetWorld = this.gridToWorld(this.targetGridPosition);

    return currentWorld.lerp(targetWorld, progress);
  }

  /**
   * Get the current grid position
   */
  getCurrentGridPosition(): Vector2 {
    return this.currentGridPosition.clone();
  }

  /**
   * Get the target grid position (where we're moving to)
   */
  getTargetGridPosition(): Vector2 {
    return this.targetGridPosition.clone();
  }

  /**
   * Set the current position (both grid and world)
   */
  setPosition(worldPos: Vector2): void {
    const snappedPos = this.snapToGrid(worldPos);
    this.currentWorldPosition = snappedPos;
    this.currentGridPosition = this.worldToGrid(snappedPos);
    this.targetGridPosition = this.currentGridPosition.clone();
    this.isMoving = false;
    this.moveTimer = 0;
    this.pendingDirection = null;
  }

  /**
   * Force stop any current movement
   */
  stopMovement(): void {
    if (this.isMoving) {
      this.completeMove();
    }
    this.pendingDirection = null;
  }

  /**
   * Check if currently moving between grid positions
   */
  isCurrentlyMoving(): boolean {
    return this.isMoving;
  }

  /**
   * Check if there's a pending movement direction
   */
  hasPendingMovement(): boolean {
    return this.pendingDirection !== null;
  }

  /**
   * Get the current grid size
   */
  getGridSize(): number {
    return this.gridSize;
  }

  /**
   * Set the grid size
   */
  setGridSize(size: number): void {
    if (size <= 0) {
      throw new Error('Grid size must be positive');
    }

    const oldSize = this.gridSize;
    this.gridSize = size;

    // Adjust current positions to maintain relative positioning
    if (oldSize !== size) {
      const ratio = size / oldSize;
      this.currentGridPosition = new Vector2(
        Math.floor(this.currentGridPosition.x * ratio),
        Math.floor(this.currentGridPosition.y * ratio)
      );
      this.targetGridPosition = this.currentGridPosition.clone();
      this.currentWorldPosition = this.gridToWorld(this.currentGridPosition);
      this.isMoving = false;
      this.moveTimer = 0;
    }
  }

  /**
   * Get the current move interval
   */
  getMoveInterval(): number {
    return this.moveInterval;
  }

  /**
   * Set the move interval (time between grid moves)
   */
  setMoveInterval(interval: number): void {
    if (interval <= 0) {
      throw new Error('Move interval must be positive');
    }
    this.moveInterval = interval;
  }

  /**
   * Get movement progress (0-1) if currently moving
   */
  getMovementProgress(): number {
    if (!this.isMoving) {
      return 0;
    }
    return Math.min(this.moveTimer / this.moveInterval, 1.0);
  }

  /**
   * Calculate the distance between two grid positions
   */
  static gridDistance(gridPos1: Vector2, gridPos2: Vector2): number {
    return gridPos1.distanceTo(gridPos2);
  }

  /**
   * Calculate Manhattan distance between two grid positions
   */
  static manhattanDistance(gridPos1: Vector2, gridPos2: Vector2): number {
    return (
      Math.abs(gridPos1.x - gridPos2.x) + Math.abs(gridPos1.y - gridPos2.y)
    );
  }

  /**
   * Check if two grid positions are adjacent (including diagonally)
   */
  static areAdjacent(gridPos1: Vector2, gridPos2: Vector2): boolean {
    const dx = Math.abs(gridPos1.x - gridPos2.x);
    const dy = Math.abs(gridPos1.y - gridPos2.y);
    return dx <= 1 && dy <= 1 && dx + dy > 0;
  }

  /**
   * Get all adjacent grid positions (8-directional)
   */
  static getAdjacentPositions(gridPos: Vector2): Vector2[] {
    const adjacent: Vector2[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        adjacent.push(new Vector2(gridPos.x + dx, gridPos.y + dy));
      }
    }
    return adjacent;
  }

  /**
   * Get cardinal direction adjacent positions only (4-directional)
   */
  static getCardinalAdjacentPositions(gridPos: Vector2): Vector2[] {
    return [
      new Vector2(gridPos.x, gridPos.y - 1), // Up
      new Vector2(gridPos.x, gridPos.y + 1), // Down
      new Vector2(gridPos.x - 1, gridPos.y), // Left
      new Vector2(gridPos.x + 1, gridPos.y), // Right
    ];
  }

  /**
   * Create a copy of this grid movement controller
   */
  clone(): GridMovementController {
    const clone = new GridMovementController(this.gridSize, this.moveInterval);
    clone.currentGridPosition = this.currentGridPosition.clone();
    clone.targetGridPosition = this.targetGridPosition.clone();
    clone.currentWorldPosition = this.currentWorldPosition.clone();
    clone.moveTimer = this.moveTimer;
    clone.isMoving = this.isMoving;
    clone.pendingDirection = this.pendingDirection
      ? this.pendingDirection.clone()
      : null;
    return clone;
  }

  /**
   * Reset the controller to initial state
   */
  reset(): void {
    this.currentGridPosition = new Vector2(0, 0);
    this.targetGridPosition = new Vector2(0, 0);
    this.currentWorldPosition = new Vector2(0, 0);
    this.moveTimer = 0;
    this.isMoving = false;
    this.pendingDirection = null;
  }

  /**
   * Get debug information about the current state
   */
  getDebugInfo(): any {
    return {
      gridSize: this.gridSize,
      moveInterval: this.moveInterval,
      currentGridPosition: this.currentGridPosition.toJSON(),
      targetGridPosition: this.targetGridPosition.toJSON(),
      currentWorldPosition: this.currentWorldPosition.toJSON(),
      isMoving: this.isMoving,
      moveTimer: this.moveTimer,
      movementProgress: this.getMovementProgress(),
      hasPendingMovement: this.hasPendingMovement(),
    };
  }
}
