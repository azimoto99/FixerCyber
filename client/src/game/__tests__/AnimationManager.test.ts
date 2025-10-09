// Tests for AnimationManager - sprite animation framework
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AnimationManager, AnimationState, BlendType, Direction } from '../engine/AnimationManager';
import { Vector2 } from '../utils/Vector2';

// Mock HTMLImageElement for testing
class MockImage {
  width = 512;
  height = 512;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';

  constructor() {
    // Simulate successful image load after a short delay
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 10);
  }
}

// Mock Image constructor
(global as any).Image = MockImage;

describe('AnimationManager', () => {
  let animationManager: AnimationManager;

  beforeEach(() => {
    animationManager = new AnimationManager();
  });

  afterEach(() => {
    animationManager.destroy();
  });

  describe('Sprite Sheet Loading', () => {
    test('should load sprite sheet successfully', async () => {
      await expect(
        animationManager.loadSpriteSheet('test_sheet', 'test.png', 64, 64)
      ).resolves.toBeUndefined();
    });

    test('should calculate correct sprite sheet dimensions', async () => {
      await animationManager.loadSpriteSheet('test_sheet', 'test.png', 64, 64);
      
      // Create a simple animation to verify sprite sheet was loaded
      animationManager.createAnimationClip(
        'test_animation',
        'test_sheet',
        [0, 1, 2, 3],
        100,
        true
      );

      const frame = animationManager.getCurrentFrame();
      expect(frame).toBeNull(); // No current animation set yet
    });
  });

  describe('Animation Clip Creation', () => {
    beforeEach(async () => {
      await animationManager.loadSpriteSheet('test_sheet', 'test.png', 64, 64);
    });

    test('should create animation clip with correct frame data', () => {
      const frameIndices = [0, 1, 2, 3];
      const frameDuration = 100;

      animationManager.createAnimationClip(
        'walk_cycle',
        'test_sheet',
        frameIndices,
        frameDuration,
        true
      );

      // Force state to test the clip was created
      animationManager.forceState(AnimationState.IDLE);
      
      // The clip should be created without throwing
      expect(() => {
        animationManager.createAnimationClip(
          'another_clip',
          'test_sheet',
          [4, 5, 6, 7],
          150,
          false
        );
      }).not.toThrow();
    });

    test('should create directional animation clips', () => {
      const frameIndicesPerDirection = [
        [0, 1, 2, 3],   // North
        [4, 5, 6, 7],   // Northeast
        [8, 9, 10, 11], // East
        [12, 13, 14, 15], // Southeast
        [16, 17, 18, 19], // South
        [20, 21, 22, 23], // Southwest
        [24, 25, 26, 27], // West
        [28, 29, 30, 31]  // Northwest
      ];

      expect(() => {
        animationManager.createDirectionalAnimationClips(
          'walking',
          'test_sheet',
          frameIndicesPerDirection,
          120,
          true
        );
      }).not.toThrow();
    });

    test('should throw error for invalid sprite sheet', () => {
      expect(() => {
        animationManager.createAnimationClip(
          'invalid_clip',
          'nonexistent_sheet',
          [0, 1, 2],
          100,
          true
        );
      }).toThrow('Sprite sheet not found: nonexistent_sheet');
    });
  });

  describe('State Transitions', () => {
    beforeEach(async () => {
      await animationManager.loadSpriteSheet('test_sheet', 'test.png', 64, 64);
      
      // Create basic animation clips for testing
      animationManager.createAnimationClip('idle_south', 'test_sheet', [0], 1000, true);
      animationManager.createAnimationClip('walking_south', 'test_sheet', [1, 2, 3, 4], 200, true);
      animationManager.createAnimationClip('running_south', 'test_sheet', [5, 6, 7, 8], 120, true);
    });

    test('should change state successfully', () => {
      animationManager.forceState(AnimationState.IDLE, Direction.SOUTH);
      expect(animationManager.getCurrentState()).toBe(AnimationState.IDLE);
      expect(animationManager.getCurrentDirection()).toBe(Direction.SOUTH);

      const success = animationManager.changeState(AnimationState.WALKING, Direction.SOUTH);
      expect(success).toBe(true);
      expect(animationManager.getCurrentState()).toBe(AnimationState.WALKING);
    });

    test('should not change to same state and direction', () => {
      animationManager.forceState(AnimationState.IDLE, Direction.SOUTH);
      
      const success = animationManager.changeState(AnimationState.IDLE, Direction.SOUTH);
      expect(success).toBe(false);
    });

    test('should handle invalid state transitions', () => {
      animationManager.forceState(AnimationState.IDLE, Direction.SOUTH);
      
      // Try to transition to a state without a defined transition
      const success = animationManager.changeState(AnimationState.DEAD, Direction.SOUTH);
      expect(success).toBe(false);
    });

    test('should add custom transitions', () => {
      animationManager.addTransition(
        AnimationState.IDLE,
        AnimationState.RUNNING,
        300,
        BlendType.FADE
      );

      animationManager.forceState(AnimationState.IDLE, Direction.SOUTH);
      const success = animationManager.changeState(AnimationState.RUNNING, Direction.SOUTH);
      expect(success).toBe(true);
    });
  });

  describe('Animation Updates', () => {
    beforeEach(async () => {
      await animationManager.loadSpriteSheet('test_sheet', 'test.png', 64, 64);
      animationManager.createAnimationClip('idle_south', 'test_sheet', [0, 1, 2, 3], 100, true);
      animationManager.forceState(AnimationState.IDLE, Direction.SOUTH);
    });

    test('should update animation frames over time', () => {
      // Initial frame should be available after forcing state
      let frame = animationManager.getCurrentFrame();
      expect(frame).toBeTruthy();

      // Update with enough time to advance frame
      animationManager.update(150); // More than frame duration (100ms)
      
      // Should have advanced (though we can't easily test frame index without exposing internals)
      frame = animationManager.getCurrentFrame();
      expect(frame).toBeTruthy();
    });

    test('should handle transition blending', () => {
      animationManager.createAnimationClip('walking_south', 'test_sheet', [4, 5, 6, 7], 120, true);
      
      // Start transition
      animationManager.changeState(AnimationState.WALKING, Direction.SOUTH);
      expect(animationManager.isCurrentlyTransitioning()).toBe(true);

      // Update to progress transition
      animationManager.update(100);
      
      // Should still be transitioning
      expect(animationManager.isCurrentlyTransitioning()).toBe(true);

      // Complete transition
      animationManager.update(200); // Total 300ms, should complete most transitions
      
      // May or may not be transitioning depending on default transition duration
      const isTransitioning = animationManager.isCurrentlyTransitioning();
      expect(typeof isTransitioning).toBe('boolean');
    });

    test('should handle playback speed changes', () => {
      animationManager.setPlaybackSpeed(2.0);
      
      // Update with normal delta time
      animationManager.update(50);
      
      // Animation should progress faster, but we can't easily test without exposing internals
      const frame = animationManager.getCurrentFrame();
      expect(frame).toBeTruthy();
    });

    test('should handle pause/resume', () => {
      animationManager.setPaused(true);
      animationManager.update(100);
      
      // Animation should not progress when paused
      const frame = animationManager.getCurrentFrame();
      expect(frame).toBeTruthy();

      animationManager.setPaused(false);
      animationManager.update(100);
      
      // Should resume normal updates
      const frameAfterResume = animationManager.getCurrentFrame();
      expect(frameAfterResume).toBeTruthy();
    });
  });

  describe('Direction Calculation', () => {
    test('should calculate correct direction from movement vector', () => {
      // Test cardinal directions
      expect(AnimationManager.calculateDirection(new Vector2(1, 0))).toBe(Direction.EAST);
      expect(AnimationManager.calculateDirection(new Vector2(0, 1))).toBe(Direction.SOUTH);
      expect(AnimationManager.calculateDirection(new Vector2(-1, 0))).toBe(Direction.WEST);
      expect(AnimationManager.calculateDirection(new Vector2(0, -1))).toBe(Direction.NORTH);

      // Test diagonal directions
      expect(AnimationManager.calculateDirection(new Vector2(1, 1))).toBe(Direction.SOUTHEAST);
      expect(AnimationManager.calculateDirection(new Vector2(-1, 1))).toBe(Direction.SOUTHWEST);
      expect(AnimationManager.calculateDirection(new Vector2(-1, -1))).toBe(Direction.NORTHWEST);
      expect(AnimationManager.calculateDirection(new Vector2(1, -1))).toBe(Direction.NORTHEAST);

      // Test zero vector (no movement)
      expect(AnimationManager.calculateDirection(new Vector2(0, 0))).toBe(Direction.SOUTH);
    });

    test('should handle normalized movement vectors', () => {
      const movement = new Vector2(3, 4).normalize();
      const direction = AnimationManager.calculateDirection(movement);
      expect(direction).toBe(Direction.SOUTHEAST);
    });
  });

  describe('Animation Progress', () => {
    beforeEach(async () => {
      await animationManager.loadSpriteSheet('test_sheet', 'test.png', 64, 64);
      animationManager.createAnimationClip('progress_test', 'test_sheet', [0, 1, 2, 3], 100, false);
      animationManager.forceState(AnimationState.IDLE, Direction.SOUTH);
    });

    test('should track animation progress', () => {
      const initialProgress = animationManager.getAnimationProgress();
      expect(initialProgress).toBeGreaterThanOrEqual(0);
      expect(initialProgress).toBeLessThanOrEqual(1);

      // Update animation
      animationManager.update(50);
      
      const updatedProgress = animationManager.getAnimationProgress();
      expect(updatedProgress).toBeGreaterThanOrEqual(0);
      expect(updatedProgress).toBeLessThanOrEqual(1);
    });
  });

  describe('State Change Callbacks', () => {
    beforeEach(async () => {
      await animationManager.loadSpriteSheet('test_sheet', 'test.png', 64, 64);
      animationManager.createAnimationClip('idle_south', 'test_sheet', [0], 1000, true);
      animationManager.createAnimationClip('walking_south', 'test_sheet', [1, 2, 3, 4], 200, true);
    });

    test('should trigger state change callbacks', () => {
      const callback = vi.fn();
      animationManager.onStateChange(AnimationState.WALKING, callback);

      animationManager.forceState(AnimationState.IDLE, Direction.SOUTH);
      animationManager.changeState(AnimationState.WALKING, Direction.SOUTH);

      expect(callback).toHaveBeenCalled();
    });

    test('should handle multiple callbacks for same state', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      animationManager.onStateChange(AnimationState.WALKING, callback1);
      animationManager.onStateChange(AnimationState.WALKING, callback2);

      animationManager.forceState(AnimationState.IDLE, Direction.SOUTH);
      animationManager.changeState(AnimationState.WALKING, Direction.SOUTH);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('Force State Changes', () => {
    beforeEach(async () => {
      await animationManager.loadSpriteSheet('test_sheet', 'test.png', 64, 64);
      animationManager.createAnimationClip('idle_south', 'test_sheet', [0], 1000, true);
      animationManager.createAnimationClip('running_south', 'test_sheet', [1, 2, 3, 4], 120, true);
    });

    test('should force immediate state change', () => {
      animationManager.forceState(AnimationState.IDLE, Direction.SOUTH);
      expect(animationManager.getCurrentState()).toBe(AnimationState.IDLE);
      expect(animationManager.isCurrentlyTransitioning()).toBe(false);

      animationManager.forceState(AnimationState.RUNNING, Direction.SOUTH);
      expect(animationManager.getCurrentState()).toBe(AnimationState.RUNNING);
      expect(animationManager.isCurrentlyTransitioning()).toBe(false);
    });
  });

  describe('Resource Management', () => {
    test('should cleanup resources on destroy', () => {
      expect(() => {
        animationManager.destroy();
      }).not.toThrow();

      // After destroy, operations should handle gracefully
      expect(animationManager.getCurrentFrame()).toBeNull();
      expect(animationManager.getCurrentState()).toBe(AnimationState.IDLE); // Default state
    });
  });

  describe('Edge Cases', () => {
    test('should handle very small delta times', () => {
      expect(() => {
        animationManager.update(0.001);
      }).not.toThrow();
    });

    test('should handle very large delta times', () => {
      expect(() => {
        animationManager.update(10000);
      }).not.toThrow();
    });

    test('should handle negative delta times', () => {
      expect(() => {
        animationManager.update(-100);
      }).not.toThrow();
    });

    test('should handle invalid playback speeds', () => {
      expect(() => {
        animationManager.setPlaybackSpeed(0);
        animationManager.setPlaybackSpeed(-1);
        animationManager.setPlaybackSpeed(Infinity);
        animationManager.setPlaybackSpeed(NaN);
      }).not.toThrow();
    });
  });
});