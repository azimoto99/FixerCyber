import { InputManager } from '../engine/InputManager';
import { Vector2 } from '../utils/Vector2';

/**
 * TacticalInputProcessor handles immediate input response for tactical movement.
 * This processor eliminates acceleration/deceleration and provides instant movement
 * response with normalized diagonal speeds for tactical gameplay.
 */
export class TacticalInputProcessor {
  private inputBuffer: Map<string, boolean> = new Map();
  private lastInputTime: number = 0;

  /**
   * Process movement input for tactical movement with immediate response.
   * Returns a normalized direction vector for instant movement.
   *
   * @param inputManager - The input manager to read input from
   * @returns Normalized direction vector for immediate movement
   */
  processMovementInput(inputManager: InputManager): Vector2 {
    this.lastInputTime = performance.now();

    // Get raw input from keyboard
    const rawInput = this.getRawMovementInput(inputManager);

    // Update input buffer for tracking
    this.updateInputBuffer(inputManager);

    // Convert to isometric coordinates and normalize
    return this.convertToIsometricMovement(rawInput);
  }

  /**
   * Normalize movement vector to ensure consistent diagonal speeds.
   * Diagonal movement is normalized to prevent speed advantages.
   *
   * @param input - Raw input vector to normalize
   * @returns Normalized movement vector
   */
  normalizeMovementVector(input: Vector2): Vector2 {
    if (input.magnitude === 0) {
      return Vector2.zero();
    }

    // Normalize to unit vector for consistent speed in all directions
    return input.normalize();
  }

  /**
   * Process grid input for discrete grid-based movement.
   * This method handles input timing for grid movement intervals.
   *
   * @param inputManager - The input manager to read input from
   * @returns Direction vector for grid movement
   */
  processGridInput(inputManager: InputManager): Vector2 {
    // For grid movement, we still want immediate response but may need
    // to handle timing differently for discrete steps
    const rawInput = this.getRawMovementInput(inputManager);
    return this.convertToIsometricMovement(rawInput);
  }

  /**
   * Get raw movement input from keyboard without any processing.
   *
   * @param inputManager - The input manager to read input from
   * @returns Raw input vector from WASD/Arrow keys
   */
  private getRawMovementInput(inputManager: InputManager): Vector2 {
    let x = 0;
    let y = 0;

    // Check movement keys (WASD and Arrow keys)
    if (
      inputManager.isKeyPressed('KeyW') ||
      inputManager.isKeyPressed('ArrowUp')
    ) {
      y -= 1;
    }
    if (
      inputManager.isKeyPressed('KeyS') ||
      inputManager.isKeyPressed('ArrowDown')
    ) {
      y += 1;
    }
    if (
      inputManager.isKeyPressed('KeyA') ||
      inputManager.isKeyPressed('ArrowLeft')
    ) {
      x -= 1;
    }
    if (
      inputManager.isKeyPressed('KeyD') ||
      inputManager.isKeyPressed('ArrowRight')
    ) {
      x += 1;
    }

    return new Vector2(x, y);
  }

  /**
   * Convert WASD input to isometric movement directions.
   * Maps screen-relative directions to world coordinates for isometric view.
   *
   * @param input - Raw input vector
   * @returns Isometric movement vector
   */
  private convertToIsometricMovement(input: Vector2): Vector2 {
    if (input.magnitude === 0) {
      return Vector2.zero();
    }

    // For screen-aligned movement, we need to map WASD to screen directions:
    // W should move UP on screen (north)
    // S should move DOWN on screen (south)
    // A should move LEFT on screen (west)
    // D should move RIGHT on screen (east)

    // To achieve this with the isometric renderer, we need to work backwards
    // from the desired screen movement to find the correct world coordinates.
    //
    // The renderer uses: isoX = (worldX - worldY) * (tileSize / 2)
    //                   isoY = (worldX + worldY) * (tileSize / 4)
    //
    // For screen movement:
    // - Moving UP on screen means decreasing isoY
    // - Moving DOWN on screen means increasing isoY
    // - Moving LEFT on screen means decreasing isoX
    // - Moving RIGHT on screen means increasing isoX

    // Let's use the inverse isometric transformation to get correct screen movement
    // If isoX = (worldX - worldY) * (tileSize / 2) and isoY = (worldX + worldY) * (tileSize / 4)
    // Then to move in screen directions, we need:
    //
    // W (up on screen): decrease screen Y -> decrease isoY -> decrease (worldX + worldY)
    // S (down on screen): increase screen Y -> increase isoY -> increase (worldX + worldY)
    // A (left on screen): decrease screen X -> decrease isoX -> decrease (worldX - worldY)
    // D (right on screen): increase screen X -> increase isoX -> increase (worldX - worldY)

    // Fix the Y-axis inversion: S should move down (positive Y) and W should move up (negative Y)
    // Since S is currently moving up and W is moving down, we need to flip the Y component:
    const worldX = input.y + input.x; // S should increase worldX, W should decrease worldX
    const worldY = input.y - input.x; // S should increase worldY, W should decrease worldY

    const isometricVector = new Vector2(worldX, worldY);

    // Normalize diagonal movement to prevent faster diagonal speed
    return this.normalizeMovementVector(isometricVector);
  }

  /**
   * Update input buffer for tracking key states.
   * This can be used for advanced input processing or debugging.
   *
   * @param inputManager - The input manager to read input from
   */
  private updateInputBuffer(inputManager: InputManager): void {
    const movementKeys = [
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'ArrowUp',
      'ArrowLeft',
      'ArrowDown',
      'ArrowRight',
    ];

    for (const key of movementKeys) {
      this.inputBuffer.set(key, inputManager.isKeyPressed(key));
    }
  }

  /**
   * Get the last input processing time.
   * Useful for debugging or timing-based features.
   *
   * @returns Last input processing timestamp
   */
  getLastInputTime(): number {
    return this.lastInputTime;
  }

  /**
   * Check if any movement input is currently active.
   *
   * @param inputManager - The input manager to check
   * @returns True if any movement key is pressed
   */
  hasMovementInput(inputManager: InputManager): boolean {
    return (
      inputManager.isKeyPressed('KeyW') ||
      inputManager.isKeyPressed('KeyA') ||
      inputManager.isKeyPressed('KeyS') ||
      inputManager.isKeyPressed('KeyD') ||
      inputManager.isKeyPressed('ArrowUp') ||
      inputManager.isKeyPressed('ArrowLeft') ||
      inputManager.isKeyPressed('ArrowDown') ||
      inputManager.isKeyPressed('ArrowRight')
    );
  }

  /**
   * Get current input buffer state for debugging.
   *
   * @returns Copy of current input buffer
   */
  getInputBuffer(): Map<string, boolean> {
    return new Map(this.inputBuffer);
  }

  /**
   * Clear input buffer and reset state.
   * Useful for cleanup or state reset.
   */
  reset(): void {
    this.inputBuffer.clear();
    this.lastInputTime = 0;
  }
}
