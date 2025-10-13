import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Vector2 } from '../../utils/Vector2';
import {
  MovementErrorType,
  MovementValidationConfig,
  MovementValidator,
} from '../MovementValidator';

describe('MovementValidator', () => {
  let validator: MovementValidator;
  let mockWorldSystem: any;

  beforeEach(() => {
    mockWorldSystem = {
      isBlocked: vi.fn().mockReturnValue(false),
      isMovementBlocked: vi.fn().mockReturnValue(false),
      isCollidingWithBuildings: vi.fn().mockReturnValue(false),
    };

    validator = new MovementValidator(mockWorldSystem);
  });

  describe('Constructor and Configuration', () => {
    it('should create validator with default configuration', () => {
      const defaultValidator = new MovementValidator();
      const config = defaultValidator.getConfig();

      expect(config.enableCollisionDetection).toBe(true);
      expect(config.enableBoundaryChecking).toBe(true);
      expect(config.enableSliding).toBe(true);
      expect(config.playerRadius).toBe(16);
      expect(config.maxMovementDistance).toBe(1000);
    });

    it('should create validator with custom configuration', () => {
      const customConfig: Partial<MovementValidationConfig> = {
        enableCollisionDetection: false,
        playerRadius: 32,
        maxMovementDistance: 500,
      };

      const customValidator = new MovementValidator(
        mockWorldSystem,
        customConfig
      );
      const config = customValidator.getConfig();

      expect(config.enableCollisionDetection).toBe(false);
      expect(config.playerRadius).toBe(32);
      expect(config.maxMovementDistance).toBe(500);
      expect(config.enableBoundaryChecking).toBe(true); // Should keep default
    });

    it('should update configuration', () => {
      validator.setConfig({
        enableCollisionDetection: false,
        playerRadius: 24,
      });
      const config = validator.getConfig();

      expect(config.enableCollisionDetection).toBe(false);
      expect(config.playerRadius).toBe(24);
    });
  });

  describe('Basic Movement Validation', () => {
    it('should validate normal movement', () => {
      const from = new Vector2(100, 100);
      const to = new Vector2(150, 150);

      const result = validator.validateMovement(from, to);

      expect(result.isValid).toBe(true);
      expect(result.finalPosition.equals(to)).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid coordinates', () => {
      const from = new Vector2(100, 100);
      const to = new Vector2(NaN, 150);

      const result = validator.validateMovement(from, to);

      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(MovementErrorType.INVALID_POSITION);
      expect(result.error?.message).toContain('Invalid position coordinates');
    });

    it('should reject infinite coordinates', () => {
      const from = new Vector2(100, 100);
      const to = new Vector2(Infinity, 150);

      const result = validator.validateMovement(from, to);

      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(MovementErrorType.INVALID_POSITION);
    });

    it('should reject excessive movement distance', () => {
      const from = new Vector2(0, 0);
      const to = new Vector2(2000, 0); // Exceeds default max of 1000

      const result = validator.validateMovement(from, to);

      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(MovementErrorType.INVALID_MOVEMENT_DELTA);
      expect(result.error?.message).toContain('exceeds maximum');
    });
  });

  describe('Position Validation', () => {
    it('should validate unblocked position', () => {
      const position = new Vector2(100, 100);
      mockWorldSystem.isBlocked.mockReturnValue(false);

      const result = validator.validatePosition(position);

      expect(result.isValid).toBe(true);
      expect(result.finalPosition.equals(position)).toBe(true);
    });

    it('should reject blocked position', () => {
      const position = new Vector2(100, 100);
      mockWorldSystem.isBlocked.mockReturnValue(true);

      const result = validator.validatePosition(position);

      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(MovementErrorType.COLLISION_DETECTED);
    });

    it('should handle world system errors gracefully', () => {
      const position = new Vector2(100, 100);
      mockWorldSystem.isBlocked.mockImplementation(() => {
        throw new Error('World system error');
      });

      const result = validator.validatePosition(position);

      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(MovementErrorType.WORLD_SYSTEM_ERROR);
    });
  });

  describe('Collision Detection', () => {
    it('should allow movement when no collision', () => {
      const from = new Vector2(100, 100);
      const to = new Vector2(150, 150);
      mockWorldSystem.isBlocked.mockReturnValue(false);

      const result = validator.validateMovement(from, to);

      expect(result.isValid).toBe(true);
      expect(mockWorldSystem.isBlocked).toHaveBeenCalledWith(to);
    });

    it('should detect collision at target position', () => {
      const from = new Vector2(100, 100);
      const to = new Vector2(150, 150);
      mockWorldSystem.isBlocked.mockReturnValue(true);

      const result = validator.validateMovement(from, to);

      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(MovementErrorType.COLLISION_DETECTED);
    });

    it('should work without world system', () => {
      const noWorldValidator = new MovementValidator();
      const from = new Vector2(100, 100);
      const to = new Vector2(150, 150);

      const result = noWorldValidator.validateMovement(from, to);

      expect(result.isValid).toBe(true);
    });

    it('should disable collision detection when configured', () => {
      validator.setCollisionDetection(false);
      const from = new Vector2(100, 100);
      const to = new Vector2(150, 150);
      mockWorldSystem.isBlocked.mockReturnValue(true);

      const result = validator.validateMovement(from, to);

      expect(result.isValid).toBe(true);
      expect(mockWorldSystem.isBlocked).not.toHaveBeenCalled();
    });
  });

  describe('Sliding Movement', () => {
    beforeEach(() => {
      // Mock collision detection for sliding tests
      mockWorldSystem.isBlocked.mockImplementation((pos: Vector2) => {
        // Block diagonal movement but allow X-only movement
        return pos.x === 150 && pos.y === 150;
      });
    });

    it('should calculate X-axis sliding when diagonal blocked', () => {
      const from = new Vector2(100, 100);
      const to = new Vector2(150, 150);

      const result = validator.validateMovement(from, to);

      expect(result.isValid).toBe(true);
      expect(result.finalPosition.x).toBe(150);
      expect(result.finalPosition.y).toBe(100); // Y should stay same
      expect(result.slideDirection?.equals(new Vector2(1, 0))).toBe(true);
    });

    it('should calculate Y-axis sliding when X blocked', () => {
      mockWorldSystem.isBlocked.mockImplementation((pos: Vector2) => {
        // Block X movement but allow Y movement
        return pos.x === 150;
      });

      const from = new Vector2(100, 100);
      const to = new Vector2(150, 150);

      const result = validator.validateMovement(from, to);

      expect(result.isValid).toBe(true);
      expect(result.finalPosition.x).toBe(100); // X should stay same
      expect(result.finalPosition.y).toBe(150);
      expect(result.slideDirection?.equals(new Vector2(0, 1))).toBe(true);
    });

    it('should fail when both axes blocked', () => {
      mockWorldSystem.isBlocked.mockReturnValue(true);

      const from = new Vector2(100, 100);
      const to = new Vector2(150, 150);

      const result = validator.validateMovement(from, to);

      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(MovementErrorType.COLLISION_DETECTED);
      expect(result.error?.message).toContain('no sliding possible');
    });

    it('should respect sliding disabled configuration', () => {
      validator.setConfig({ enableSliding: false });
      const from = new Vector2(100, 100);
      const to = new Vector2(150, 150);

      const result = validator.validateMovement(from, to);

      expect(result.isValid).toBe(false);
      expect(result.error?.message).toContain('sliding disabled');
    });
  });

  describe('Boundary Validation', () => {
    beforeEach(() => {
      validator.setWorldBounds(new Vector2(0, 0), new Vector2(1000, 1000));
    });

    it('should allow movement within bounds', () => {
      const from = new Vector2(100, 100);
      const to = new Vector2(200, 200);

      const result = validator.validateMovement(from, to);

      expect(result.isValid).toBe(true);
      expect(result.finalPosition.equals(to)).toBe(true);
    });

    it('should clamp position to bounds', () => {
      const position = new Vector2(1500, -100);

      const result = validator.validatePosition(position);

      expect(result.isValid).toBe(true);
      expect(result.finalPosition.x).toBe(1000); // Clamped to max
      expect(result.finalPosition.y).toBe(0); // Clamped to min
      expect(result.alternativePosition).toBeDefined();
    });

    it('should work without bounds configured', () => {
      const unboundedValidator = new MovementValidator(mockWorldSystem);
      const position = new Vector2(10000, -5000);

      const result = unboundedValidator.validatePosition(position);

      expect(result.isValid).toBe(true);
      expect(result.finalPosition.equals(position)).toBe(true);
    });

    it('should disable boundary checking when configured', () => {
      validator.setBoundaryChecking(false);
      const position = new Vector2(2000, 2000); // Outside bounds

      const result = validator.validatePosition(position);

      expect(result.isValid).toBe(true);
      expect(result.finalPosition.equals(position)).toBe(true);
    });
  });

  describe('Alternative Position Finding', () => {
    it('should find alternative position near blocked position', () => {
      const current = new Vector2(100, 100);
      const blocked = new Vector2(150, 150);

      // Mock to block the exact position but allow nearby positions
      mockWorldSystem.isBlocked.mockImplementation((pos: Vector2) => {
        return pos.equals(blocked);
      });

      const alternative = validator.findAlternativePosition(
        current,
        blocked,
        32
      );

      expect(alternative).not.toBeNull();
      expect(alternative!.distanceTo(blocked)).toBeGreaterThan(0);
      expect(alternative!.distanceTo(blocked)).toBeLessThanOrEqual(32);
    });

    it('should return null when no alternative found', () => {
      const current = new Vector2(100, 100);
      const blocked = new Vector2(150, 150);

      // Mock to block all positions
      mockWorldSystem.isBlocked.mockReturnValue(true);

      const alternative = validator.findAlternativePosition(
        current,
        blocked,
        32
      );

      expect(alternative).toBeNull();
    });
  });

  describe('Path Collision Detection', () => {
    it('should detect path collision when available', () => {
      const from = new Vector2(100, 100);
      const to = new Vector2(200, 200);

      mockWorldSystem.isBlocked.mockReturnValue(false);
      mockWorldSystem.isMovementBlocked.mockReturnValue(true);

      const result = validator.validateMovement(from, to);

      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(MovementErrorType.COLLISION_DETECTED);
      expect(result.error?.message).toContain('path is blocked');
    });

    it('should use fallback path checking when world system method unavailable', () => {
      delete mockWorldSystem.isMovementBlocked;

      const from = new Vector2(100, 100);
      const to = new Vector2(200, 200);

      // Block a point along the path
      mockWorldSystem.isBlocked.mockImplementation((pos: Vector2) => {
        return Math.abs(pos.x - 150) < 5 && Math.abs(pos.y - 150) < 5;
      });

      const result = validator.validateMovement(from, to);

      expect(result.isValid).toBe(false);
    });
  });

  describe('Error Handling and Logging', () => {
    it('should track error history', () => {
      const position = new Vector2(100, 100);
      mockWorldSystem.isBlocked.mockReturnValue(true);

      // Generate some errors
      validator.validatePosition(position);
      validator.validatePosition(position);

      const history = validator.getErrorHistory();
      expect(history.length).toBe(2);
      expect(history[0].type).toBe(MovementErrorType.COLLISION_DETECTED);
    });

    it('should limit error history size', () => {
      const position = new Vector2(100, 100);
      mockWorldSystem.isBlocked.mockReturnValue(true);

      // Generate more than MAX_ERROR_HISTORY errors
      for (let i = 0; i < 15; i++) {
        validator.validatePosition(position);
      }

      const history = validator.getErrorHistory();
      expect(history.length).toBe(10); // Should be limited to MAX_ERROR_HISTORY
    });

    it('should clear error history', () => {
      const position = new Vector2(100, 100);
      mockWorldSystem.isBlocked.mockReturnValue(true);

      validator.validatePosition(position);
      expect(validator.getErrorHistory().length).toBe(1);

      validator.clearErrorHistory();
      expect(validator.getErrorHistory().length).toBe(0);
    });

    it('should track last valid position', () => {
      const validPos = new Vector2(100, 100);
      const invalidPos = new Vector2(200, 200);

      mockWorldSystem.isBlocked.mockImplementation((pos: Vector2) => {
        return pos.equals(invalidPos);
      });

      validator.validateMovement(validPos, invalidPos);

      const lastValid = validator.getLastValidPosition();
      expect(lastValid.equals(validPos)).toBe(true);
    });
  });

  describe('Configuration Methods', () => {
    it('should update world system reference', () => {
      const newWorldSystem = { isBlocked: vi.fn().mockReturnValue(false) };
      validator.setWorldSystem(newWorldSystem);

      const position = new Vector2(100, 100);
      validator.validatePosition(position);

      expect(newWorldSystem.isBlocked).toHaveBeenCalledWith(position);
    });

    it('should update player radius', () => {
      validator.setPlayerRadius(32);
      expect(validator.getConfig().playerRadius).toBe(32);

      // Should not allow radius less than 1
      validator.setPlayerRadius(0);
      expect(validator.getConfig().playerRadius).toBe(1);
    });

    it('should update world bounds', () => {
      const min = new Vector2(-500, -500);
      const max = new Vector2(500, 500);

      validator.setWorldBounds(min, max);

      const config = validator.getConfig();
      expect(config.worldBounds?.min.equals(min)).toBe(true);
      expect(config.worldBounds?.max.equals(max)).toBe(true);
    });
  });

  describe('Query Methods', () => {
    it('should report collision detection status', () => {
      expect(validator.isCollisionEnabled()).toBe(true);

      validator.setCollisionDetection(false);
      expect(validator.isCollisionEnabled()).toBe(false);
    });

    it('should report boundary checking status', () => {
      expect(validator.isBoundaryCheckingEnabled()).toBe(true);

      validator.setBoundaryChecking(false);
      expect(validator.isBoundaryCheckingEnabled()).toBe(false);
    });

    it('should provide debug information', () => {
      const debugInfo = validator.getDebugInfo();

      expect(debugInfo.config).toBeDefined();
      expect(debugInfo.hasWorldSystem).toBe(true);
      expect(debugInfo.worldSystemMethods).toContain('isBlocked');
      expect(debugInfo.errorCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero movement distance', () => {
      const position = new Vector2(100, 100);

      const result = validator.validateMovement(position, position);

      expect(result.isValid).toBe(true);
      expect(result.finalPosition.equals(position)).toBe(true);
    });

    it('should handle very small movements', () => {
      const from = new Vector2(100, 100);
      const to = new Vector2(100.1, 100.1);

      const result = validator.validateMovement(from, to);

      expect(result.isValid).toBe(true);
    });

    it('should handle missing world system methods gracefully', () => {
      const incompleteWorldSystem = {}; // No methods
      validator.setWorldSystem(incompleteWorldSystem);

      const from = new Vector2(100, 100);
      const to = new Vector2(150, 150);

      const result = validator.validateMovement(from, to);

      expect(result.isValid).toBe(true); // Should not crash
    });
  });
});
