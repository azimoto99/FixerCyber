import { Vector2 } from '../utils/Vector2';

/**
 * Error types for movement validation
 */
export enum MovementErrorType {
  INVALID_POSITION = 'invalid_position',
  COLLISION_DETECTED = 'collision_detected',
  BOUNDARY_VIOLATION = 'boundary_violation',
  WORLD_SYSTEM_ERROR = 'world_system_error',
  INVALID_MOVEMENT_DELTA = 'invalid_movement_delta',
}

/**
 * Movement validation error details
 */
export interface MovementError {
  type: MovementErrorType;
  message: string;
  position: Vector2;
  attemptedPosition?: Vector2;
  timestamp: number;
}

/**
 * Validation result for movement operations
 */
export interface ValidationResult {
  isValid: boolean;
  finalPosition: Vector2;
  error?: MovementError;
  alternativePosition?: Vector2;
  slideDirection?: Vector2;
}

/**
 * Configuration for movement validation
 */
export interface MovementValidationConfig {
  enableCollisionDetection: boolean;
  enableBoundaryChecking: boolean;
  enableSliding: boolean;
  worldBounds?: {
    min: Vector2;
    max: Vector2;
  };
  playerRadius: number;
  maxMovementDistance: number;
}

/**
 * MovementValidator handles position validation and collision integration
 * for the tactical movement system. Provides collision detection, boundary
 * validation, and error recovery mechanisms.
 */
export class MovementValidator {
  private worldSystem: any;
  private config: MovementValidationConfig;
  private lastValidPosition: Vector2 = Vector2.zero();
  private errorHistory: MovementError[] = [];
  private readonly MAX_ERROR_HISTORY = 10;

  constructor(worldSystem?: any, config?: Partial<MovementValidationConfig>) {
    this.worldSystem = worldSystem;
    this.config = {
      enableCollisionDetection: true,
      enableBoundaryChecking: true,
      enableSliding: true,
      playerRadius: 16,
      maxMovementDistance: 1000,
      ...config,
    };
  }

  /**
   * Validate a movement from current position to target position
   */
  validateMovement(
    currentPosition: Vector2,
    targetPosition: Vector2
  ): ValidationResult {
    try {
      // Store last valid position for recovery
      this.lastValidPosition = currentPosition.clone();

      // Basic validation checks
      const basicValidation = this.performBasicValidation(
        currentPosition,
        targetPosition
      );
      if (!basicValidation.isValid) {
        return basicValidation;
      }

      // Collision detection
      if (this.config.enableCollisionDetection) {
        const collisionResult = this.checkCollision(
          currentPosition,
          targetPosition
        );
        if (!collisionResult.isValid) {
          return collisionResult;
        }
      }

      // Boundary validation
      if (this.config.enableBoundaryChecking) {
        const boundaryResult = this.checkBoundaries(targetPosition);
        if (!boundaryResult.isValid) {
          return boundaryResult;
        }
      }

      // Movement is valid
      return {
        isValid: true,
        finalPosition: targetPosition.clone(),
      };
    } catch (error) {
      return this.createErrorResult(
        MovementErrorType.WORLD_SYSTEM_ERROR,
        `Movement validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        currentPosition,
        targetPosition
      );
    }
  }

  /**
   * Validate a position without movement context
   */
  validatePosition(position: Vector2): ValidationResult {
    try {
      // Check if position is blocked
      if (
        this.config.enableCollisionDetection &&
        this.isPositionBlocked(position)
      ) {
        return this.createErrorResult(
          MovementErrorType.COLLISION_DETECTED,
          'Position is blocked by collision',
          position
        );
      }

      // Check boundaries
      if (
        this.config.enableBoundaryChecking &&
        !this.isWithinBounds(position)
      ) {
        return this.createErrorResult(
          MovementErrorType.BOUNDARY_VIOLATION,
          'Position is outside world boundaries',
          position
        );
      }

      return {
        isValid: true,
        finalPosition: position.clone(),
      };
    } catch (error) {
      return this.createErrorResult(
        MovementErrorType.WORLD_SYSTEM_ERROR,
        `Position validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        position
      );
    }
  }

  /**
   * Attempt to find a valid alternative position near the target
   */
  findAlternativePosition(
    _currentPosition: Vector2,
    blockedPosition: Vector2,
    searchRadius: number = 32
  ): Vector2 | null {
    const searchSteps = 8;
    const angleStep = (Math.PI * 2) / searchSteps;

    // Try positions in a circle around the blocked position
    for (let radius = 8; radius <= searchRadius; radius += 8) {
      for (let i = 0; i < searchSteps; i++) {
        const angle = i * angleStep;
        const testPosition = new Vector2(
          blockedPosition.x + Math.cos(angle) * radius,
          blockedPosition.y + Math.sin(angle) * radius
        );

        const validation = this.validatePosition(testPosition);
        if (validation.isValid) {
          return testPosition;
        }
      }
    }

    return null;
  }

  /**
   * Calculate sliding movement when blocked
   */
  calculateSlideMovement(
    currentPosition: Vector2,
    targetPosition: Vector2
  ): ValidationResult {
    if (!this.config.enableSliding) {
      return this.createErrorResult(
        MovementErrorType.COLLISION_DETECTED,
        'Movement blocked and sliding disabled',
        currentPosition,
        targetPosition
      );
    }

    // Try X-axis movement only
    const xOnlyPosition = new Vector2(targetPosition.x, currentPosition.y);
    const xValidation = this.validatePosition(xOnlyPosition);
    if (xValidation.isValid) {
      return {
        isValid: true,
        finalPosition: xOnlyPosition,
        slideDirection: new Vector2(1, 0),
      };
    }

    // Try Y-axis movement only
    const yOnlyPosition = new Vector2(currentPosition.x, targetPosition.y);
    const yValidation = this.validatePosition(yOnlyPosition);
    if (yValidation.isValid) {
      return {
        isValid: true,
        finalPosition: yOnlyPosition,
        slideDirection: new Vector2(0, 1),
      };
    }

    // No sliding possible
    return this.createErrorResult(
      MovementErrorType.COLLISION_DETECTED,
      'Movement blocked and no sliding possible',
      currentPosition,
      targetPosition
    );
  }

  /**
   * Perform basic validation checks
   */
  private performBasicValidation(
    currentPosition: Vector2,
    targetPosition: Vector2
  ): ValidationResult {
    // Check for invalid positions (NaN, Infinity)
    if (
      !this.isValidVector(currentPosition) ||
      !this.isValidVector(targetPosition)
    ) {
      return this.createErrorResult(
        MovementErrorType.INVALID_POSITION,
        'Invalid position coordinates detected',
        currentPosition,
        targetPosition
      );
    }

    // Check movement distance
    const movementDistance = currentPosition.distanceTo(targetPosition);
    if (movementDistance > this.config.maxMovementDistance) {
      return this.createErrorResult(
        MovementErrorType.INVALID_MOVEMENT_DELTA,
        `Movement distance ${movementDistance} exceeds maximum ${this.config.maxMovementDistance}`,
        currentPosition,
        targetPosition
      );
    }

    return {
      isValid: true,
      finalPosition: targetPosition.clone(),
    };
  }

  /**
   * Check collision detection
   */
  private checkCollision(
    currentPosition: Vector2,
    targetPosition: Vector2
  ): ValidationResult {
    // Check if target position is blocked
    if (this.isPositionBlocked(targetPosition)) {
      // Try sliding movement
      return this.calculateSlideMovement(currentPosition, targetPosition);
    }

    // Check if movement path is blocked (for fast movement)
    if (this.isMovementPathBlocked(currentPosition, targetPosition)) {
      return this.createErrorResult(
        MovementErrorType.COLLISION_DETECTED,
        'Movement path is blocked',
        currentPosition,
        targetPosition
      );
    }

    return {
      isValid: true,
      finalPosition: targetPosition.clone(),
    };
  }

  /**
   * Check if position is blocked by collision
   */
  private isPositionBlocked(position: Vector2): boolean {
    if (!this.worldSystem) return false;

    try {
      // Use world system's collision detection
      if (this.worldSystem.isBlocked) {
        return this.worldSystem.isBlocked(position);
      }

      // Fallback to building collision check
      if (this.worldSystem.isCollidingWithBuildings) {
        return this.worldSystem.isCollidingWithBuildings(position);
      }

      return false;
    } catch (error) {
      // Log error but don't block movement
      this.logError(
        MovementErrorType.WORLD_SYSTEM_ERROR,
        `Collision check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        position
      );
      return false;
    }
  }

  /**
   * Check if movement path is blocked
   */
  private isMovementPathBlocked(from: Vector2, to: Vector2): boolean {
    if (!this.worldSystem) return false;

    try {
      // Use world system's movement blocking check if available
      if (this.worldSystem.isMovementBlocked) {
        return this.worldSystem.isMovementBlocked(from, to);
      }

      // Fallback: sample points along the path
      const distance = from.distanceTo(to);
      const steps = Math.ceil(distance / 16); // Check every 16 pixels

      if (steps <= 1) return false;

      const stepVector = to.subtract(from).divide(steps);

      for (let i = 1; i < steps; i++) {
        const checkPoint = from.add(stepVector.multiply(i));
        if (this.isPositionBlocked(checkPoint)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      // Log error but don't block movement
      this.logError(
        MovementErrorType.WORLD_SYSTEM_ERROR,
        `Path collision check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        from
      );
      return false;
    }
  }

  /**
   * Check boundary validation
   */
  private checkBoundaries(position: Vector2): ValidationResult {
    if (!this.isWithinBounds(position)) {
      // Clamp to boundaries
      const clampedPosition = this.clampToBounds(position);
      return {
        isValid: true,
        finalPosition: clampedPosition,
        alternativePosition: clampedPosition,
      };
    }

    return {
      isValid: true,
      finalPosition: position.clone(),
    };
  }

  /**
   * Check if position is within world bounds
   */
  private isWithinBounds(position: Vector2): boolean {
    if (!this.config.worldBounds) return true;

    const { min, max } = this.config.worldBounds;
    return (
      position.x >= min.x &&
      position.x <= max.x &&
      position.y >= min.y &&
      position.y <= max.y
    );
  }

  /**
   * Clamp position to world bounds
   */
  private clampToBounds(position: Vector2): Vector2 {
    if (!this.config.worldBounds) return position.clone();

    const { min, max } = this.config.worldBounds;
    return new Vector2(
      Math.max(min.x, Math.min(max.x, position.x)),
      Math.max(min.y, Math.min(max.y, position.y))
    );
  }

  /**
   * Check if vector has valid coordinates
   */
  private isValidVector(vector: Vector2): boolean {
    return (
      !isNaN(vector.x) &&
      !isNaN(vector.y) &&
      isFinite(vector.x) &&
      isFinite(vector.y)
    );
  }

  /**
   * Create error result
   */
  private createErrorResult(
    type: MovementErrorType,
    message: string,
    position: Vector2,
    attemptedPosition?: Vector2
  ): ValidationResult {
    const error: MovementError = {
      type,
      message,
      position: position.clone(),
      attemptedPosition: attemptedPosition?.clone(),
      timestamp: Date.now(),
    };

    this.logError(type, message, position);

    return {
      isValid: false,
      finalPosition: this.lastValidPosition.clone(),
      error,
    };
  }

  /**
   * Log movement error
   */
  private logError(
    type: MovementErrorType,
    message: string,
    position: Vector2
  ): void {
    const error: MovementError = {
      type,
      message,
      position: position.clone(),
      timestamp: Date.now(),
    };

    // Add to error history
    this.errorHistory.push(error);
    if (this.errorHistory.length > this.MAX_ERROR_HISTORY) {
      this.errorHistory.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn(`MovementValidator [${type}]: ${message}`, {
        position: position.toJSON(),
        timestamp: error.timestamp,
      });
    }
  }

  // Configuration methods

  /**
   * Update validation configuration
   */
  setConfig(config: Partial<MovementValidationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set world system reference
   */
  setWorldSystem(worldSystem: any): void {
    this.worldSystem = worldSystem;
  }

  /**
   * Enable or disable collision detection
   */
  setCollisionDetection(enabled: boolean): void {
    this.config.enableCollisionDetection = enabled;
  }

  /**
   * Enable or disable boundary checking
   */
  setBoundaryChecking(enabled: boolean): void {
    this.config.enableBoundaryChecking = enabled;
  }

  /**
   * Set world boundaries
   */
  setWorldBounds(min: Vector2, max: Vector2): void {
    this.config.worldBounds = { min: min.clone(), max: max.clone() };
  }

  /**
   * Set player collision radius
   */
  setPlayerRadius(radius: number): void {
    this.config.playerRadius = Math.max(1, radius);
  }

  // Query methods

  /**
   * Get current configuration
   */
  getConfig(): Readonly<MovementValidationConfig> {
    return { ...this.config };
  }

  /**
   * Get recent error history
   */
  getErrorHistory(): ReadonlyArray<MovementError> {
    return [...this.errorHistory];
  }

  /**
   * Get last valid position
   */
  getLastValidPosition(): Vector2 {
    return this.lastValidPosition.clone();
  }

  /**
   * Check if collision detection is enabled
   */
  isCollisionEnabled(): boolean {
    return this.config.enableCollisionDetection;
  }

  /**
   * Check if boundary checking is enabled
   */
  isBoundaryCheckingEnabled(): boolean {
    return this.config.enableBoundaryChecking;
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Get debug information
   */
  getDebugInfo(): any {
    return {
      config: this.config,
      lastValidPosition: this.lastValidPosition.toJSON(),
      errorCount: this.errorHistory.length,
      recentErrors: this.errorHistory.slice(-3).map(error => ({
        type: error.type,
        message: error.message,
        timestamp: error.timestamp,
      })),
      hasWorldSystem: !!this.worldSystem,
      worldSystemMethods: this.worldSystem ? Object.keys(this.worldSystem) : [],
    };
  }
}
