// Tests for BasePlayer interface and PlayerStateValidator
import { beforeEach, describe, expect, it } from 'vitest';
import { Vector2 } from '../../utils/Vector2';
import {
  BasePlayer,
  PlayerStateFlags,
  PlayerStateValidator,
  ValidationResult,
} from '../BasePlayer';

// Mock implementation of BasePlayer for testing
class MockPlayer implements BasePlayer {
  readonly id: string;
  readonly userId: string;
  username: string;
  position: Vector2;
  velocity: Vector2;
  facing: number;
  health: number;
  maxHealth: number;
  credits: number;
  isAlive: boolean;
  isProne: boolean;
  isRolling: boolean;
  isInteracting: boolean;
  ownsSafehouse: boolean;
  safehouseId: string | null;

  constructor(id: string, userId: string, username: string, position: Vector2) {
    this.id = id;
    this.userId = userId;
    this.username = username;
    this.position = position;
    this.velocity = new Vector2(0, 0);
    this.facing = 0;
    this.health = 100;
    this.maxHealth = 100;
    this.credits = 0;
    this.isAlive = true;
    this.isProne = false;
    this.isRolling = false;
    this.isInteracting = false;
    this.ownsSafehouse = false;
    this.safehouseId = null;
  }

  takeDamage(amount: number, _source?: any): void {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.die();
    }
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  die(): void {
    this.isAlive = false;
    this.health = 0;
  }

  respawn(spawnPoint?: Vector2): void {
    this.isAlive = true;
    this.health = this.maxHealth;
    if (spawnPoint) {
      this.position = spawnPoint;
    }
  }

  validateState(): ValidationResult {
    return PlayerStateValidator.validatePlayerState(this);
  }

  canMove(): boolean {
    return this.isAlive && !this.isRolling;
  }

  canInteract(): boolean {
    return this.isAlive && !this.isRolling && !this.isInteracting;
  }
}

describe('BasePlayer Interface', () => {
  let player: MockPlayer;
  const testPosition = new Vector2(100, 200);

  beforeEach(() => {
    player = new MockPlayer('test-id', 'user-123', 'TestPlayer', testPosition);
  });

  describe('Core Properties', () => {
    it('should have required identity properties', () => {
      expect(player.id).toBe('test-id');
      expect(player.userId).toBe('user-123');
      expect(player.username).toBe('TestPlayer');
    });

    it('should have required transform properties', () => {
      expect(player.position).toEqual(testPosition);
      expect(player.velocity).toEqual(new Vector2(0, 0));
      expect(player.facing).toBe(0);
    });

    it('should have required core stats', () => {
      expect(player.health).toBe(100);
      expect(player.maxHealth).toBe(100);
      expect(player.credits).toBe(0);
    });

    it('should have required state flags', () => {
      expect(player.isAlive).toBe(true);
      expect(player.isProne).toBe(false);
      expect(player.isRolling).toBe(false);
      expect(player.isInteracting).toBe(false);
    });

    it('should have required safehouse properties', () => {
      expect(player.ownsSafehouse).toBe(false);
      expect(player.safehouseId).toBeNull();
    });
  });

  describe('Core Methods', () => {
    it('should implement takeDamage method', () => {
      player.takeDamage(30);
      expect(player.health).toBe(70);
      expect(player.isAlive).toBe(true);
    });

    it('should implement heal method', () => {
      player.takeDamage(50);
      player.heal(20);
      expect(player.health).toBe(70);
    });

    it('should implement die method', () => {
      player.die();
      expect(player.isAlive).toBe(false);
      expect(player.health).toBe(0);
    });

    it('should implement respawn method', () => {
      player.die();
      const spawnPoint = new Vector2(300, 400);
      player.respawn(spawnPoint);

      expect(player.isAlive).toBe(true);
      expect(player.health).toBe(player.maxHealth);
      expect(player.position).toEqual(spawnPoint);
    });

    it('should implement state validation', () => {
      const result = player.validateState();
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should implement canMove method', () => {
      expect(player.canMove()).toBe(true);

      player.die();
      expect(player.canMove()).toBe(false);

      player.respawn();
      player.isRolling = true;
      expect(player.canMove()).toBe(false);
    });

    it('should implement canInteract method', () => {
      expect(player.canInteract()).toBe(true);

      player.die();
      expect(player.canInteract()).toBe(false);

      player.respawn();
      player.isRolling = true;
      expect(player.canInteract()).toBe(false);

      player.isRolling = false;
      player.isInteracting = true;
      expect(player.canInteract()).toBe(false);
    });
  });

  describe('Health and Damage Requirements (5.1)', () => {
    it('should decrease health when taking damage', () => {
      const initialHealth = player.health;
      player.takeDamage(25);

      expect(player.health).toBe(initialHealth - 25);
      expect(player.isAlive).toBe(true);
    });

    it('should trigger death when health reaches zero', () => {
      player.takeDamage(100);

      expect(player.health).toBe(0);
      expect(player.isAlive).toBe(false);
    });

    it('should increase health when healing up to maximum', () => {
      player.takeDamage(40);
      player.heal(20);

      expect(player.health).toBe(80);

      player.heal(50); // Should cap at maxHealth
      expect(player.health).toBe(player.maxHealth);
    });

    it('should not allow health to go below zero', () => {
      player.takeDamage(150);
      expect(player.health).toBe(0);
    });

    it('should not allow health to exceed maxHealth', () => {
      player.heal(50);
      expect(player.health).toBe(player.maxHealth);
    });
  });
});

describe('PlayerStateFlags Enum', () => {
  it('should have all required state flags', () => {
    expect(PlayerStateFlags.ALIVE).toBe('alive');
    expect(PlayerStateFlags.DEAD).toBe('dead');
    expect(PlayerStateFlags.PRONE).toBe('prone');
    expect(PlayerStateFlags.ROLLING).toBe('rolling');
    expect(PlayerStateFlags.INTERACTING).toBe('interacting');
    expect(PlayerStateFlags.IN_COMBAT).toBe('in_combat');
    expect(PlayerStateFlags.OWNS_SAFEHOUSE).toBe('owns_safehouse');
  });
});

describe('PlayerStateValidator', () => {
  let player: MockPlayer;

  beforeEach(() => {
    player = new MockPlayer(
      'test-id',
      'user-123',
      'TestPlayer',
      new Vector2(100, 200)
    );
  });

  describe('validatePlayerState', () => {
    it('should validate a correct player state', () => {
      const result = PlayerStateValidator.validatePlayerState(player);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid player ID', () => {
      (player as any).id = '';
      const result = PlayerStateValidator.validatePlayerState(player);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Player ID must be a non-empty string');
    });

    it('should reject invalid user ID', () => {
      (player as any).userId = null;
      const result = PlayerStateValidator.validatePlayerState(player);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User ID must be a non-empty string');
    });

    it('should reject invalid username', () => {
      player.username = '   ';
      const result = PlayerStateValidator.validatePlayerState(player);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Username must be a non-empty string');
    });

    it('should reject invalid position', () => {
      (player.position as any) = { x: 'invalid', y: 100 };
      const result = PlayerStateValidator.validatePlayerState(player);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Position must be a valid Vector2 with numeric x and y coordinates'
      );
    });

    it('should reject invalid velocity', () => {
      (player.velocity as any) = null;
      const result = PlayerStateValidator.validatePlayerState(player);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Velocity must be a valid Vector2 with numeric x and y coordinates'
      );
    });

    it('should reject invalid facing', () => {
      player.facing = NaN;
      const result = PlayerStateValidator.validatePlayerState(player);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Facing must be a valid number');
    });

    it('should reject negative health', () => {
      player.health = -10;
      const result = PlayerStateValidator.validatePlayerState(player);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Health must be a non-negative number');
    });

    it('should reject invalid maxHealth', () => {
      player.maxHealth = 0;
      const result = PlayerStateValidator.validatePlayerState(player);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Max health must be a positive number');
    });

    it('should reject health exceeding maxHealth', () => {
      player.health = 150;
      player.maxHealth = 100;
      const result = PlayerStateValidator.validatePlayerState(player);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Health cannot exceed max health');
    });

    it('should reject negative credits', () => {
      player.credits = -100;
      const result = PlayerStateValidator.validatePlayerState(player);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Credits must be a non-negative number');
    });

    it('should reject invalid boolean flags', () => {
      (player as any).isAlive = 'true';
      const result = PlayerStateValidator.validatePlayerState(player);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('isAlive must be a boolean');
    });

    it('should reject inconsistent safehouse state', () => {
      player.ownsSafehouse = true;
      player.safehouseId = null;
      const result = PlayerStateValidator.validatePlayerState(player);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Player who owns safehouse must have a valid safehouse ID'
      );
    });

    it('should reject inconsistent alive/health state', () => {
      player.isAlive = false;
      player.health = 50;
      const result = PlayerStateValidator.validatePlayerState(player);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Dead player cannot have health greater than 0'
      );
    });
  });

  describe('validateMovement', () => {
    it('should validate normal movement', () => {
      const newPosition = new Vector2(110, 210);
      const result = PlayerStateValidator.validateMovement(
        player,
        newPosition,
        0.016
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject movement when player cannot move', () => {
      player.die();
      const newPosition = new Vector2(110, 210);
      const result = PlayerStateValidator.validateMovement(
        player,
        newPosition,
        0.016
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Player cannot move in current state');
    });

    it('should reject impossible movement distance', () => {
      const impossiblePosition = new Vector2(2000, 2000);
      const result = PlayerStateValidator.validateMovement(
        player,
        impossiblePosition,
        0.016
      );

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(error => error.includes('Movement distance'))
      ).toBe(true);
    });

    it('should reject invalid position coordinates', () => {
      const invalidPosition = new Vector2(NaN, 100);
      const result = PlayerStateValidator.validateMovement(
        player,
        invalidPosition,
        0.016
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'New position must have valid numeric coordinates'
      );
    });
  });

  describe('validateHealthChange', () => {
    it('should validate normal health change', () => {
      const result = PlayerStateValidator.validateHealthChange(player, 75);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid health value', () => {
      const result = PlayerStateValidator.validateHealthChange(player, NaN);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('New health must be a valid number');
    });

    it('should reject negative health', () => {
      const result = PlayerStateValidator.validateHealthChange(player, -10);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Health cannot be negative');
    });

    it('should reject health exceeding maxHealth', () => {
      const result = PlayerStateValidator.validateHealthChange(player, 150);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Health 150 cannot exceed max health 100'
      );
    });
  });
});
