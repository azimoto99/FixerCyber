import { beforeEach, describe, expect, it } from 'vitest';
import {
  MovementConfiguration,
  TacticalMovementConfig,
} from '../TacticalMovementConfig';

describe('MovementConfiguration', () => {
  let config: MovementConfiguration;

  beforeEach(() => {
    config = new MovementConfiguration();
  });

  describe('Default Configuration', () => {
    it('should create with default values', () => {
      const defaultConfig = config.getConfig();

      expect(defaultConfig.baseSpeed).toBe(MovementConfiguration.DEFAULT_SPEED);
      expect(defaultConfig.instantResponse).toBe(true);
      expect(defaultConfig.gridMode).toBe(false);
      expect(defaultConfig.gridSize).toBe(
        MovementConfiguration.DEFAULT_GRID_SIZE
      );
      expect(defaultConfig.normalizeDiagonal).toBe(true);
      expect(defaultConfig.gridMoveInterval).toBe(
        MovementConfiguration.DEFAULT_GRID_INTERVAL
      );
      expect(defaultConfig.collisionEnabled).toBe(true);
    });

    it('should have correct default constants', () => {
      expect(MovementConfiguration.MIN_SPEED).toBe(50);
      expect(MovementConfiguration.MAX_SPEED).toBe(500);
      expect(MovementConfiguration.DEFAULT_SPEED).toBe(200);
      expect(MovementConfiguration.MIN_GRID_SIZE).toBe(16);
      expect(MovementConfiguration.MAX_GRID_SIZE).toBe(64);
      expect(MovementConfiguration.DEFAULT_GRID_SIZE).toBe(32);
      expect(MovementConfiguration.MIN_GRID_INTERVAL).toBe(100);
      expect(MovementConfiguration.MAX_GRID_INTERVAL).toBe(1000);
      expect(MovementConfiguration.DEFAULT_GRID_INTERVAL).toBe(200);
    });
  });

  describe('Speed Validation', () => {
    it('should validate valid speeds', () => {
      expect(MovementConfiguration.validateSpeed(100)).toBe(true);
      expect(MovementConfiguration.validateSpeed(200)).toBe(true);
      expect(
        MovementConfiguration.validateSpeed(MovementConfiguration.MIN_SPEED)
      ).toBe(true);
      expect(
        MovementConfiguration.validateSpeed(MovementConfiguration.MAX_SPEED)
      ).toBe(true);
    });

    it('should reject invalid speeds', () => {
      expect(MovementConfiguration.validateSpeed(49)).toBe(false);
      expect(MovementConfiguration.validateSpeed(501)).toBe(false);
      expect(MovementConfiguration.validateSpeed(NaN)).toBe(false);
      expect(MovementConfiguration.validateSpeed(-100)).toBe(false);
    });

    it('should clamp speeds to valid range', () => {
      expect(MovementConfiguration.clampSpeed(25)).toBe(
        MovementConfiguration.MIN_SPEED
      );
      expect(MovementConfiguration.clampSpeed(600)).toBe(
        MovementConfiguration.MAX_SPEED
      );
      expect(MovementConfiguration.clampSpeed(200)).toBe(200);
    });

    it('should set valid speeds', () => {
      config.setBaseSpeed(150);
      expect(config.getBaseSpeed()).toBe(150);
    });

    it('should throw error for invalid speeds', () => {
      expect(() => config.setBaseSpeed(25)).toThrow('Invalid speed');
      expect(() => config.setBaseSpeed(600)).toThrow('Invalid speed');
    });
  });

  describe('Grid Size Validation', () => {
    it('should validate valid grid sizes', () => {
      expect(MovementConfiguration.validateGridSize(16)).toBe(true);
      expect(MovementConfiguration.validateGridSize(32)).toBe(true);
      expect(MovementConfiguration.validateGridSize(64)).toBe(true);
    });

    it('should reject invalid grid sizes', () => {
      expect(MovementConfiguration.validateGridSize(15)).toBe(false); // Too small
      expect(MovementConfiguration.validateGridSize(65)).toBe(false); // Too large
      expect(MovementConfiguration.validateGridSize(17)).toBe(false); // Odd number
      expect(MovementConfiguration.validateGridSize(NaN)).toBe(false);
    });

    it('should clamp grid sizes to valid range and ensure even numbers', () => {
      expect(MovementConfiguration.clampGridSize(10)).toBe(16);
      expect(MovementConfiguration.clampGridSize(70)).toBe(64);
      expect(MovementConfiguration.clampGridSize(17)).toBe(16);
      expect(MovementConfiguration.clampGridSize(33)).toBe(32);
    });

    it('should set valid grid sizes', () => {
      config.setGridSize(48);
      expect(config.getGridSize()).toBe(48);
    });

    it('should throw error for invalid grid sizes', () => {
      expect(() => config.setGridSize(15)).toThrow('Invalid grid size');
      expect(() => config.setGridSize(17)).toThrow('Invalid grid size');
      expect(() => config.setGridSize(70)).toThrow('Invalid grid size');
    });
  });

  describe('Grid Interval Validation', () => {
    it('should validate valid grid intervals', () => {
      expect(MovementConfiguration.validateGridInterval(100)).toBe(true);
      expect(MovementConfiguration.validateGridInterval(500)).toBe(true);
      expect(MovementConfiguration.validateGridInterval(1000)).toBe(true);
    });

    it('should reject invalid grid intervals', () => {
      expect(MovementConfiguration.validateGridInterval(99)).toBe(false);
      expect(MovementConfiguration.validateGridInterval(1001)).toBe(false);
      expect(MovementConfiguration.validateGridInterval(NaN)).toBe(false);
    });

    it('should clamp grid intervals to valid range', () => {
      expect(MovementConfiguration.clampGridInterval(50)).toBe(100);
      expect(MovementConfiguration.clampGridInterval(1500)).toBe(1000);
      expect(MovementConfiguration.clampGridInterval(300)).toBe(300);
    });

    it('should set valid grid intervals', () => {
      config.setGridMoveInterval(300);
      expect(config.getGridMoveInterval()).toBe(300);
    });

    it('should throw error for invalid grid intervals', () => {
      expect(() => config.setGridMoveInterval(50)).toThrow(
        'Invalid grid interval'
      );
      expect(() => config.setGridMoveInterval(1500)).toThrow(
        'Invalid grid interval'
      );
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration with valid values', () => {
      const updates: Partial<TacticalMovementConfig> = {
        baseSpeed: 150,
        gridMode: true,
        gridSize: 48,
        instantResponse: false,
      };

      config.updateConfig(updates);
      const updatedConfig = config.getConfig();

      expect(updatedConfig.baseSpeed).toBe(150);
      expect(updatedConfig.gridMode).toBe(true);
      expect(updatedConfig.gridSize).toBe(48);
      expect(updatedConfig.instantResponse).toBe(false);
    });

    it('should throw error for invalid configuration updates', () => {
      const invalidUpdates: Partial<TacticalMovementConfig> = {
        baseSpeed: 25, // Invalid speed
      };

      expect(() => config.updateConfig(invalidUpdates)).toThrow(
        'Invalid configuration'
      );
    });

    it('should preserve existing values when updating partial config', () => {
      config.updateConfig({ baseSpeed: 150 });

      const updatedConfig = config.getConfig();
      expect(updatedConfig.baseSpeed).toBe(150);
      expect(updatedConfig.gridMode).toBe(false); // Should remain default
      expect(updatedConfig.instantResponse).toBe(true); // Should remain default
    });
  });

  describe('Boolean Configuration Methods', () => {
    it('should set and get instant response', () => {
      config.setInstantResponse(false);
      expect(config.isInstantResponse()).toBe(false);

      config.setInstantResponse(true);
      expect(config.isInstantResponse()).toBe(true);
    });

    it('should set and get grid mode', () => {
      config.setGridMode(true);
      expect(config.isGridMode()).toBe(true);

      config.setGridMode(false);
      expect(config.isGridMode()).toBe(false);
    });

    it('should set and get normalize diagonal', () => {
      config.setNormalizeDiagonal(false);
      expect(config.isNormalizeDiagonal()).toBe(false);

      config.setNormalizeDiagonal(true);
      expect(config.isNormalizeDiagonal()).toBe(true);
    });

    it('should set and get collision enabled', () => {
      config.setCollisionEnabled(false);
      expect(config.isCollisionEnabled()).toBe(false);

      config.setCollisionEnabled(true);
      expect(config.isCollisionEnabled()).toBe(true);
    });
  });

  describe('Utility Methods', () => {
    it('should reset to default configuration', () => {
      config.setBaseSpeed(150);
      config.setGridMode(true);
      config.setInstantResponse(false);

      config.reset();

      const resetConfig = config.getConfig();
      expect(resetConfig.baseSpeed).toBe(MovementConfiguration.DEFAULT_SPEED);
      expect(resetConfig.gridMode).toBe(false);
      expect(resetConfig.instantResponse).toBe(true);
    });

    it('should clone configuration', () => {
      config.setBaseSpeed(150);
      config.setGridMode(true);

      const cloned = config.clone();
      const clonedConfig = cloned.getConfig();

      expect(clonedConfig.baseSpeed).toBe(150);
      expect(clonedConfig.gridMode).toBe(true);

      // Verify independence
      config.setBaseSpeed(200);
      expect(cloned.getBaseSpeed()).toBe(150);
    });

    it('should serialize to JSON', () => {
      config.setBaseSpeed(150);
      config.setGridMode(true);

      const json = config.toJSON();

      expect(json.baseSpeed).toBe(150);
      expect(json.gridMode).toBe(true);
      expect(typeof json).toBe('object');
    });

    it('should create from JSON', () => {
      const jsonData = {
        baseSpeed: 150,
        instantResponse: false,
        gridMode: true,
        gridSize: 48,
        normalizeDiagonal: false,
        gridMoveInterval: 300,
        collisionEnabled: false,
      };

      const fromJson = MovementConfiguration.fromJSON(jsonData);
      const jsonConfig = fromJson.getConfig();

      expect(jsonConfig.baseSpeed).toBe(150);
      expect(jsonConfig.instantResponse).toBe(false);
      expect(jsonConfig.gridMode).toBe(true);
      expect(jsonConfig.gridSize).toBe(48);
      expect(jsonConfig.normalizeDiagonal).toBe(false);
      expect(jsonConfig.gridMoveInterval).toBe(300);
      expect(jsonConfig.collisionEnabled).toBe(false);
    });

    it('should get bounds information', () => {
      const bounds = MovementConfiguration.getBounds();

      expect(bounds.speed.min).toBe(MovementConfiguration.MIN_SPEED);
      expect(bounds.speed.max).toBe(MovementConfiguration.MAX_SPEED);
      expect(bounds.speed.default).toBe(MovementConfiguration.DEFAULT_SPEED);

      expect(bounds.gridSize.min).toBe(MovementConfiguration.MIN_GRID_SIZE);
      expect(bounds.gridSize.max).toBe(MovementConfiguration.MAX_GRID_SIZE);
      expect(bounds.gridSize.default).toBe(
        MovementConfiguration.DEFAULT_GRID_SIZE
      );

      expect(bounds.gridInterval.min).toBe(
        MovementConfiguration.MIN_GRID_INTERVAL
      );
      expect(bounds.gridInterval.max).toBe(
        MovementConfiguration.MAX_GRID_INTERVAL
      );
      expect(bounds.gridInterval.default).toBe(
        MovementConfiguration.DEFAULT_GRID_INTERVAL
      );
    });
  });

  describe('Constructor with Initial Config', () => {
    it('should create with custom initial configuration', () => {
      const initialConfig: Partial<TacticalMovementConfig> = {
        baseSpeed: 150,
        gridMode: true,
        instantResponse: false,
      };

      const customConfig = new MovementConfiguration(initialConfig);
      const config = customConfig.getConfig();

      expect(config.baseSpeed).toBe(150);
      expect(config.gridMode).toBe(true);
      expect(config.instantResponse).toBe(false);
      // Should use defaults for unspecified values
      expect(config.gridSize).toBe(MovementConfiguration.DEFAULT_GRID_SIZE);
      expect(config.normalizeDiagonal).toBe(true);
    });

    it('should throw error for invalid initial configuration', () => {
      const invalidConfig: Partial<TacticalMovementConfig> = {
        baseSpeed: 25, // Invalid
      };

      expect(() => new MovementConfiguration(invalidConfig)).toThrow(
        'Invalid configuration'
      );
    });
  });

  describe('Immutability', () => {
    it('should return readonly configuration', () => {
      const configData = config.getConfig();

      // TypeScript should prevent modification, but we can test runtime behavior
      expect(() => {
        (configData as any).baseSpeed = 999;
      }).not.toThrow();

      // Original config should not be affected
      expect(config.getBaseSpeed()).toBe(MovementConfiguration.DEFAULT_SPEED);
    });
  });
});
