import { beforeEach, describe, expect, test } from 'vitest';
import { Vector2 } from '../../utils/Vector2';
import { GridMovementController } from '../GridMovementController';

describe('GridMovementController', () => {
  let controller: GridMovementController;
  const DEFAULT_GRID_SIZE = 32;
  const DEFAULT_MOVE_INTERVAL = 200;

  beforeEach(() => {
    controller = new GridMovementController(
      DEFAULT_GRID_SIZE,
      DEFAULT_MOVE_INTERVAL
    );
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default values', () => {
      const defaultController = new GridMovementController();
      expect(defaultController.getGridSize()).toBe(32);
      expect(defaultController.getMoveInterval()).toBe(200);
      expect(defaultController.getCurrentGridPosition()).toEqual(
        new Vector2(0, 0)
      );
      expect(defaultController.isCurrentlyMoving()).toBe(false);
    });

    test('should initialize with custom values', () => {
      const customController = new GridMovementController(64, 150);
      expect(customController.getGridSize()).toBe(64);
      expect(customController.getMoveInterval()).toBe(150);
    });
  });

  describe('World to Grid Conversion', () => {
    test('should convert world coordinates to grid coordinates correctly', () => {
      // Test center of grid cells
      expect(controller.worldToGrid(new Vector2(16, 16))).toEqual(
        new Vector2(0, 0)
      );
      expect(controller.worldToGrid(new Vector2(48, 48))).toEqual(
        new Vector2(1, 1)
      );
      expect(controller.worldToGrid(new Vector2(80, 112))).toEqual(
        new Vector2(2, 3)
      );

      // Test edge cases
      expect(controller.worldToGrid(new Vector2(0, 0))).toEqual(
        new Vector2(0, 0)
      );
      expect(controller.worldToGrid(new Vector2(31, 31))).toEqual(
        new Vector2(0, 0)
      );
      expect(controller.worldToGrid(new Vector2(32, 32))).toEqual(
        new Vector2(1, 1)
      );
    });

    test('should handle negative coordinates', () => {
      expect(controller.worldToGrid(new Vector2(-16, -16))).toEqual(
        new Vector2(-1, -1)
      );
      expect(controller.worldToGrid(new Vector2(-48, -48))).toEqual(
        new Vector2(-2, -2)
      );
    });
  });

  describe('Grid to World Conversion', () => {
    test('should convert grid coordinates to world coordinates correctly', () => {
      // Should return center of grid cells
      expect(controller.gridToWorld(new Vector2(0, 0))).toEqual(
        new Vector2(16, 16)
      );
      expect(controller.gridToWorld(new Vector2(1, 1))).toEqual(
        new Vector2(48, 48)
      );
      expect(controller.gridToWorld(new Vector2(2, 3))).toEqual(
        new Vector2(80, 112)
      );
    });

    test('should handle negative grid coordinates', () => {
      expect(controller.gridToWorld(new Vector2(-1, -1))).toEqual(
        new Vector2(-16, -16)
      );
      expect(controller.gridToWorld(new Vector2(-2, -2))).toEqual(
        new Vector2(-48, -48)
      );
    });
  });

  describe('Snap to Grid', () => {
    test('should snap world positions to nearest grid center', () => {
      expect(controller.snapToGrid(new Vector2(10, 10))).toEqual(
        new Vector2(16, 16)
      );
      expect(controller.snapToGrid(new Vector2(25, 25))).toEqual(
        new Vector2(16, 16)
      );
      expect(controller.snapToGrid(new Vector2(40, 40))).toEqual(
        new Vector2(48, 48)
      );
    });

    test('should handle positions already on grid', () => {
      expect(controller.snapToGrid(new Vector2(16, 16))).toEqual(
        new Vector2(16, 16)
      );
      expect(controller.snapToGrid(new Vector2(48, 48))).toEqual(
        new Vector2(48, 48)
      );
    });
  });

  describe('Grid Movement', () => {
    test('should initiate movement in cardinal directions', () => {
      controller.moveToGrid(new Vector2(1, 0)); // Right

      expect(controller.isCurrentlyMoving()).toBe(true);
      expect(controller.getTargetGridPosition()).toEqual(new Vector2(1, 0));
      expect(controller.getMovementProgress()).toBe(0);
    });

    test('should complete movement after interval', () => {
      controller.moveToGrid(new Vector2(1, 0));

      // Update with full interval time
      controller.update(DEFAULT_MOVE_INTERVAL);

      expect(controller.isCurrentlyMoving()).toBe(false);
      expect(controller.getCurrentGridPosition()).toEqual(new Vector2(1, 0));
      expect(controller.getMovementProgress()).toBe(0);
    });

    test('should normalize movement direction', () => {
      controller.moveToGrid(new Vector2(5, 3)); // Should normalize to (1, 1)

      expect(controller.getTargetGridPosition()).toEqual(new Vector2(1, 1));
    });

    test('should ignore zero movement', () => {
      controller.moveToGrid(new Vector2(0, 0));

      expect(controller.isCurrentlyMoving()).toBe(false);
    });
  });

  describe('Static Utility Methods', () => {
    test('should calculate grid distance correctly', () => {
      const pos1 = new Vector2(0, 0);
      const pos2 = new Vector2(3, 4);

      expect(GridMovementController.gridDistance(pos1, pos2)).toBe(5); // 3-4-5 triangle
    });

    test('should calculate Manhattan distance correctly', () => {
      const pos1 = new Vector2(0, 0);
      const pos2 = new Vector2(3, 4);

      expect(GridMovementController.manhattanDistance(pos1, pos2)).toBe(7);
    });

    test('should check adjacency correctly', () => {
      const center = new Vector2(1, 1);

      // Adjacent positions
      expect(
        GridMovementController.areAdjacent(center, new Vector2(0, 0))
      ).toBe(true);
      expect(
        GridMovementController.areAdjacent(center, new Vector2(1, 0))
      ).toBe(true);
      expect(
        GridMovementController.areAdjacent(center, new Vector2(2, 2))
      ).toBe(true);

      // Non-adjacent positions
      expect(
        GridMovementController.areAdjacent(center, new Vector2(3, 3))
      ).toBe(false);
      expect(
        GridMovementController.areAdjacent(center, new Vector2(1, 1))
      ).toBe(false); // Same position
    });
  });

  describe('Configuration Changes', () => {
    test('should update grid size', () => {
      controller.setGridSize(64);
      expect(controller.getGridSize()).toBe(64);

      // Test conversion with new grid size
      expect(controller.gridToWorld(new Vector2(1, 1))).toEqual(
        new Vector2(96, 96)
      );
    });

    test('should throw error for invalid grid size', () => {
      expect(() => controller.setGridSize(0)).toThrow(
        'Grid size must be positive'
      );
      expect(() => controller.setGridSize(-10)).toThrow(
        'Grid size must be positive'
      );
    });

    test('should update move interval', () => {
      controller.setMoveInterval(300);
      expect(controller.getMoveInterval()).toBe(300);
    });

    test('should throw error for invalid move interval', () => {
      expect(() => controller.setMoveInterval(0)).toThrow(
        'Move interval must be positive'
      );
      expect(() => controller.setMoveInterval(-100)).toThrow(
        'Move interval must be positive'
      );
    });
  });
});
