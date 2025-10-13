import { Vector2 } from '../utils/Vector2';

/**
 * Player state flags enum for character state management
 */
export enum PlayerStateFlags {
  ALIVE = 'alive',
  DEAD = 'dead',
  PRONE = 'prone',
  ROLLING = 'rolling',
  INTERACTING = 'interacting',
  IN_COMBAT = 'in_combat',
  OWNS_SAFEHOUSE = 'owns_safehouse',
}

/**
 * Base player interface with core properties required for all player entities
 */
export interface BasePlayer {
  // Identity
  readonly id: string;
  readonly userId: string;
  username: string;

  // Transform
  position: Vector2;
  velocity: Vector2;
  facing: number;

  // Core stats
  health: number;
  maxHealth: number;
  credits: number;

  // State flags
  isAlive: boolean;
  isProne: boolean;
  isRolling: boolean;
  isInteracting: boolean;

  // Safehouse status
  ownsSafehouse: boolean;
  safehouseId: string | null;

  // Core methods
  takeDamage(amount: number, source?: any): void;
  heal(amount: number): void;
  die(): void;
  respawn(spawnPoint?: Vector2): void;

  // State validation
  validateState(): ValidationResult;
  canMove(): boolean;
  canInteract(): boolean;
}

/**
 * Validation result for player state validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Basic player state validation methods
 */
export class PlayerStateValidator {
  /**
   * Validates core player properties
   */
  static validatePlayerState(player: BasePlayer): ValidationResult {
    const errors: string[] = [];

    // Validate ID
    if (
      !player.id ||
      typeof player.id !== 'string' ||
      player.id.trim() === ''
    ) {
      errors.push('Player ID must be a non-empty string');
    }

    // Validate userId
    if (
      !player.userId ||
      typeof player.userId !== 'string' ||
      player.userId.trim() === ''
    ) {
      errors.push('User ID must be a non-empty string');
    }

    // Validate username
    if (
      !player.username ||
      typeof player.username !== 'string' ||
      player.username.trim() === ''
    ) {
      errors.push('Username must be a non-empty string');
    }

    // Validate position
    if (
      !player.position ||
      typeof player.position.x !== 'number' ||
      typeof player.position.y !== 'number'
    ) {
      errors.push(
        'Position must be a valid Vector2 with numeric x and y coordinates'
      );
    }

    // Validate velocity
    if (
      !player.velocity ||
      typeof player.velocity.x !== 'number' ||
      typeof player.velocity.y !== 'number'
    ) {
      errors.push(
        'Velocity must be a valid Vector2 with numeric x and y coordinates'
      );
    }

    // Validate facing
    if (typeof player.facing !== 'number' || isNaN(player.facing)) {
      errors.push('Facing must be a valid number');
    }

    // Validate health
    if (
      typeof player.health !== 'number' ||
      isNaN(player.health) ||
      player.health < 0
    ) {
      errors.push('Health must be a non-negative number');
    }

    // Validate maxHealth
    if (
      typeof player.maxHealth !== 'number' ||
      isNaN(player.maxHealth) ||
      player.maxHealth <= 0
    ) {
      errors.push('Max health must be a positive number');
    }

    // Validate health vs maxHealth
    if (player.health > player.maxHealth) {
      errors.push('Health cannot exceed max health');
    }

    // Validate credits
    if (
      typeof player.credits !== 'number' ||
      isNaN(player.credits) ||
      player.credits < 0
    ) {
      errors.push('Credits must be a non-negative number');
    }

    // Validate boolean flags
    if (typeof player.isAlive !== 'boolean') {
      errors.push('isAlive must be a boolean');
    }

    if (typeof player.isProne !== 'boolean') {
      errors.push('isProne must be a boolean');
    }

    if (typeof player.isRolling !== 'boolean') {
      errors.push('isRolling must be a boolean');
    }

    if (typeof player.isInteracting !== 'boolean') {
      errors.push('isInteracting must be a boolean');
    }

    if (typeof player.ownsSafehouse !== 'boolean') {
      errors.push('ownsSafehouse must be a boolean');
    }

    // Validate safehouse consistency
    if (
      player.ownsSafehouse &&
      (!player.safehouseId || typeof player.safehouseId !== 'string')
    ) {
      errors.push('Player who owns safehouse must have a valid safehouse ID');
    }

    if (!player.ownsSafehouse && player.safehouseId !== null) {
      errors.push(
        'Player who does not own safehouse should have null safehouse ID'
      );
    }

    // Validate state consistency
    if (!player.isAlive && player.health > 0) {
      errors.push('Dead player cannot have health greater than 0');
    }

    if (player.isAlive && player.health <= 0) {
      errors.push('Alive player must have health greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates movement state
   */
  static validateMovement(
    player: BasePlayer,
    newPosition: Vector2,
    deltaTime: number
  ): ValidationResult {
    const errors: string[] = [];

    // Check if player can move
    if (!player.canMove()) {
      errors.push('Player cannot move in current state');
    }

    // Validate position change is reasonable
    if (deltaTime > 0) {
      const distance = player.position.distanceTo(newPosition);
      const maxDistance = 1000 * deltaTime; // Max 1000 pixels per second

      if (distance > maxDistance) {
        errors.push(
          `Movement distance ${distance.toFixed(2)} exceeds maximum allowed ${maxDistance.toFixed(2)} for deltaTime ${deltaTime}`
        );
      }
    }

    // Validate new position is valid
    if (
      typeof newPosition.x !== 'number' ||
      typeof newPosition.y !== 'number' ||
      isNaN(newPosition.x) ||
      isNaN(newPosition.y)
    ) {
      errors.push('New position must have valid numeric coordinates');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates health change
   */
  static validateHealthChange(
    player: BasePlayer,
    newHealth: number
  ): ValidationResult {
    const errors: string[] = [];

    if (typeof newHealth !== 'number' || isNaN(newHealth)) {
      errors.push('New health must be a valid number');
    }

    if (newHealth < 0) {
      errors.push('Health cannot be negative');
    }

    if (newHealth > player.maxHealth) {
      errors.push(
        `Health ${newHealth} cannot exceed max health ${player.maxHealth}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
