import { beforeEach, describe, expect, test } from 'vitest';
import { Vector2 } from '../../utils/Vector2';
import { TacticalInputProcessor } from '../TacticalInputProcessor';

// Mock InputManager for testing
class MockInputManager {
  private pressedKeys: Set<string> = new Set();

  isKeyPressed(key: string): boolean {
    return this.pressedKeys.has(key);
  }

  pressKey(key: string): void {
    this.pressedKeys.add(key);
  }

  releaseKey(key: string): void {
    this.pressedKeys.delete(key);
  }

  releaseAllKeys(): void {
    this.pressedKeys.clear();
  }
}

describe('TacticalInputProcessor', () => {
  let processor: TacticalInputProcessor;
  let mockInputManager: MockInputManager;

  beforeEach(() => {
    processor = new TacticalInputProcessor();
    mockInputManager = new MockInputManager();
  });

  describe('processMovementInput', () => {
    test('should return zero vector when no keys are pressed', () => {
      const result = processor.processMovementInput(mockInputManager as any);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.magnitude).toBe(0);
    });

    test('should return immediate normalized vector for single key press', () => {
      mockInputManager.pressKey('KeyW');

      const result = processor.processMovementInput(mockInputManager as any);

      // W key should produce northwest movement in isometric space
      expect(result.magnitude).toBeCloseTo(1, 5);
      expect(result.x).toBeCloseTo(0.707, 2); // Normalized isometric X
      expect(result.y).toBeCloseTo(-0.707, 2); // Normalized isometric Y
    });

    test('should handle all cardinal directions correctly', () => {
      const testCases = [
        { key: 'KeyW', expectedX: 0.707, expectedY: -0.707 }, // Northwest
        { key: 'KeyS', expectedX: -0.707, expectedY: 0.707 }, // Southeast
        { key: 'KeyA', expectedX: -0.707, expectedY: -0.707 }, // Southwest
        { key: 'KeyD', expectedX: 0.707, expectedY: 0.707 }, // Northeast
      ];

      testCases.forEach(({ key, expectedX, expectedY }) => {
        mockInputManager.releaseAllKeys();
        mockInputManager.pressKey(key);

        const result = processor.processMovementInput(mockInputManager as any);

        expect(result.magnitude).toBeCloseTo(1, 5);
        expect(result.x).toBeCloseTo(expectedX, 2);
        expect(result.y).toBeCloseTo(expectedY, 2);
      });
    });

    test('should handle arrow keys same as WASD keys', () => {
      const keyPairs = [
        ['KeyW', 'ArrowUp'],
        ['KeyS', 'ArrowDown'],
        ['KeyA', 'ArrowLeft'],
        ['KeyD', 'ArrowRight'],
      ];

      keyPairs.forEach(([wasdKey, arrowKey]) => {
        // Test WASD key
        mockInputManager.releaseAllKeys();
        mockInputManager.pressKey(wasdKey);
        const wasdResult = processor.processMovementInput(
          mockInputManager as any
        );

        // Test Arrow key
        mockInputManager.releaseAllKeys();
        mockInputManager.pressKey(arrowKey);
        const arrowResult = processor.processMovementInput(
          mockInputManager as any
        );

        // Results should be identical
        expect(arrowResult.x).toBeCloseTo(wasdResult.x, 5);
        expect(arrowResult.y).toBeCloseTo(wasdResult.y, 5);
      });
    });

    test('should normalize diagonal movement to prevent speed advantage', () => {
      // Test W+D diagonal movement
      mockInputManager.pressKey('KeyW');
      mockInputManager.pressKey('KeyD');

      const diagonalResult = processor.processMovementInput(
        mockInputManager as any
      );

      // Diagonal movement should still have magnitude of 1
      expect(diagonalResult.magnitude).toBeCloseTo(1, 5);

      // Test single direction for comparison
      mockInputManager.releaseAllKeys();
      mockInputManager.pressKey('KeyW');

      const singleResult = processor.processMovementInput(
        mockInputManager as any
      );

      // Both should have same magnitude (no speed advantage for diagonal)
      expect(diagonalResult.magnitude).toBeCloseTo(singleResult.magnitude, 5);
    });

    test('should handle all diagonal combinations correctly', () => {
      const diagonalCombinations = [
        ['KeyW', 'KeyD'], // North + East = Northeast
        ['KeyW', 'KeyA'], // North + West = Northwest
        ['KeyS', 'KeyD'], // South + East = Southeast
        ['KeyS', 'KeyA'], // South + West = Southwest
      ];

      diagonalCombinations.forEach(([key1, key2]) => {
        mockInputManager.releaseAllKeys();
        mockInputManager.pressKey(key1);
        mockInputManager.pressKey(key2);

        const result = processor.processMovementInput(mockInputManager as any);

        // All diagonal movements should be normalized to magnitude 1
        expect(result.magnitude).toBeCloseTo(1, 5);
      });
    });

    test('should update last input time when processing input', () => {
      const initialTime = processor.getLastInputTime();

      mockInputManager.pressKey('KeyW');
      processor.processMovementInput(mockInputManager as any);

      const updatedTime = processor.getLastInputTime();
      expect(updatedTime).toBeGreaterThan(initialTime);
    });
  });

  describe('normalizeMovementVector', () => {
    test('should return zero vector for zero input', () => {
      const result = processor.normalizeMovementVector(Vector2.zero());

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.magnitude).toBe(0);
    });

    test('should normalize non-zero vectors to unit length', () => {
      const testVectors = [
        new Vector2(3, 4), // Magnitude 5
        new Vector2(1, 1), // Magnitude √2
        new Vector2(10, 0), // Magnitude 10
        new Vector2(0, -5), // Magnitude 5
      ];

      testVectors.forEach(vector => {
        const result = processor.normalizeMovementVector(vector);
        expect(result.magnitude).toBeCloseTo(1, 5);
      });
    });

    test('should preserve direction while normalizing magnitude', () => {
      const input = new Vector2(3, 4);
      const result = processor.normalizeMovementVector(input);

      // Direction should be preserved (same angle)
      const inputAngle = Math.atan2(input.y, input.x);
      const resultAngle = Math.atan2(result.y, result.x);

      expect(resultAngle).toBeCloseTo(inputAngle, 5);
      expect(result.magnitude).toBeCloseTo(1, 5);
    });
  });

  describe('processGridInput', () => {
    test('should return same result as processMovementInput for immediate response', () => {
      mockInputManager.pressKey('KeyW');

      const movementResult = processor.processMovementInput(
        mockInputManager as any
      );
      const gridResult = processor.processGridInput(mockInputManager as any);

      expect(gridResult.x).toBeCloseTo(movementResult.x, 5);
      expect(gridResult.y).toBeCloseTo(movementResult.y, 5);
    });

    test('should handle diagonal grid input correctly', () => {
      mockInputManager.pressKey('KeyW');
      mockInputManager.pressKey('KeyD');

      const result = processor.processGridInput(mockInputManager as any);

      expect(result.magnitude).toBeCloseTo(1, 5);
    });
  });

  describe('hasMovementInput', () => {
    test('should return false when no movement keys are pressed', () => {
      const result = processor.hasMovementInput(mockInputManager as any);
      expect(result).toBe(false);
    });

    test('should return true when any WASD key is pressed', () => {
      const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];

      movementKeys.forEach(key => {
        mockInputManager.releaseAllKeys();
        mockInputManager.pressKey(key);

        const result = processor.hasMovementInput(mockInputManager as any);
        expect(result).toBe(true);
      });
    });

    test('should return true when any arrow key is pressed', () => {
      const arrowKeys = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];

      arrowKeys.forEach(key => {
        mockInputManager.releaseAllKeys();
        mockInputManager.pressKey(key);

        const result = processor.hasMovementInput(mockInputManager as any);
        expect(result).toBe(true);
      });
    });

    test('should return true when multiple movement keys are pressed', () => {
      mockInputManager.pressKey('KeyW');
      mockInputManager.pressKey('KeyD');

      const result = processor.hasMovementInput(mockInputManager as any);
      expect(result).toBe(true);
    });
  });

  describe('input buffer management', () => {
    test('should update input buffer when processing movement input', () => {
      mockInputManager.pressKey('KeyW');
      mockInputManager.pressKey('KeyD');

      processor.processMovementInput(mockInputManager as any);

      const buffer = processor.getInputBuffer();
      expect(buffer.get('KeyW')).toBe(true);
      expect(buffer.get('KeyD')).toBe(true);
      expect(buffer.get('KeyA')).toBe(false);
      expect(buffer.get('KeyS')).toBe(false);
    });

    test('should clear input buffer on reset', () => {
      mockInputManager.pressKey('KeyW');
      processor.processMovementInput(mockInputManager as any);

      // Verify buffer has data
      let buffer = processor.getInputBuffer();
      expect(buffer.size).toBeGreaterThan(0);

      // Reset and verify buffer is cleared
      processor.reset();
      buffer = processor.getInputBuffer();
      expect(buffer.size).toBe(0);
    });

    test('should reset last input time on reset', () => {
      mockInputManager.pressKey('KeyW');
      processor.processMovementInput(mockInputManager as any);

      const timeBeforeReset = processor.getLastInputTime();
      expect(timeBeforeReset).toBeGreaterThan(0);

      processor.reset();
      const timeAfterReset = processor.getLastInputTime();
      expect(timeAfterReset).toBe(0);
    });
  });

  describe('isometric transformation consistency', () => {
    test('should maintain consistent isometric transformation', () => {
      // Test that the isometric transformation matches the expected behavior
      // from the original InputManager

      // W key: should produce northwest movement
      mockInputManager.releaseAllKeys();
      mockInputManager.pressKey('KeyW');
      const wResult = processor.processMovementInput(mockInputManager as any);
      expect(wResult.x).toBeCloseTo(0.707, 2);
      expect(wResult.y).toBeCloseTo(-0.707, 2);

      // D key: should produce northeast movement
      mockInputManager.releaseAllKeys();
      mockInputManager.pressKey('KeyD');
      const dResult = processor.processMovementInput(mockInputManager as any);
      expect(dResult.x).toBeCloseTo(0.707, 2);
      expect(dResult.y).toBeCloseTo(0.707, 2);

      // W+D combination: should produce pure east movement
      mockInputManager.releaseAllKeys();
      mockInputManager.pressKey('KeyW');
      mockInputManager.pressKey('KeyD');
      const wdResult = processor.processMovementInput(mockInputManager as any);
      expect(wdResult.x).toBeCloseTo(1, 2);
      expect(Math.abs(wdResult.y)).toBeLessThan(0.1);
    });
  });

  describe('performance and immediate response', () => {
    test('should provide immediate response without delay', () => {
      // Test that there's no artificial delay in input processing
      const startTime = performance.now();

      mockInputManager.pressKey('KeyW');
      const result = processor.processMovementInput(mockInputManager as any);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Processing should be very fast (less than 1ms for immediate response)
      expect(processingTime).toBeLessThan(1);
      expect(result.magnitude).toBeCloseTo(1, 5);
    });

    test('should handle rapid input changes without lag', () => {
      // Simulate rapid key press changes
      const directions = ['KeyW', 'KeyD', 'KeyS', 'KeyA'];
      const results: Vector2[] = [];

      directions.forEach(key => {
        mockInputManager.releaseAllKeys();
        mockInputManager.pressKey(key);
        results.push(processor.processMovementInput(mockInputManager as any));
      });

      // All results should be immediate and normalized
      results.forEach(result => {
        expect(result.magnitude).toBeCloseTo(1, 5);
      });
    });
  });
});
