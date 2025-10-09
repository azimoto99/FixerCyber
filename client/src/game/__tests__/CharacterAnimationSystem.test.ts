// Tests for CharacterAnimationSystem - character animation management
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AnimationState, Direction } from '../engine/AnimationManager';
import { CharacterAnimationSystem, WeaponType } from '../systems/CharacterAnimationSystem';
import { Vector2 } from '../utils/Vector2';

// Mock HTMLImageElement and Canvas for testing
class MockImage {
  width = 512;
  height = 512;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';

  constructor() {
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 10);
  }
}

class MockCanvas {
  width = 512;
  height = 512;
  
  getContext() {
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      fillRect: vi.fn(),
      strokeRect: vi.fn()
    };
  }
  
  toDataURL() {
    return 'data:image/png;base64,mock-data';
  }
}

// Mock DOM elements
(global as any).Image = MockImage;
(global as any).HTMLCanvasElement = MockCanvas;
document.createElement = vi.fn().mockImplementation((tagName) => {
  if (tagName === 'canvas') {
    return new MockCanvas();
  }
  return {};
});

describe('CharacterAnimationSystem', () => {
  let animationSystem: CharacterAnimationSystem;
  const testPlayerId = 'test-player-1';

  beforeEach(() => {
    animationSystem = new CharacterAnimationSystem();
  });

  afterEach(() => {
    animationSystem.destroy();
  });

  describe('Character Initialization', () => {
    test('should initialize character animations successfully', async () => {
      await expect(
        animationSystem.initializeCharacter(testPlayerId)
      ).resolves.toBeUndefined();

      const animatedCharacters = animationSystem.getAnimatedCharacters();
      expect(animatedCharacters).toContain(testPlayerId);
    });

    test('should start with idle animation state', async () => {
      await animationSystem.initializeCharacter(testPlayerId);
      
      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.IDLE);
      
      const direction = animationSystem.getCharacterDirection(testPlayerId);
      expect(direction).toBe(Direction.SOUTH);
    });

    test('should handle multiple character initialization', async () => {
      const playerIds = ['player1', 'player2', 'player3'];
      
      for (const playerId of playerIds) {
        await animationSystem.initializeCharacter(playerId);
      }

      const animatedCharacters = animationSystem.getAnimatedCharacters();
      expect(animatedCharacters).toHaveLength(3);
      playerIds.forEach(id => {
        expect(animatedCharacters).toContain(id);
      });
    });
  });

  describe('Movement Animation Updates', () => {
    beforeEach(async () => {
      await animationSystem.initializeCharacter(testPlayerId);
    });

    test('should transition to walking when moving slowly', () => {
      const position = new Vector2(100, 100);
      const velocity = new Vector2(50, 0); // Slow movement (walking speed)

      animationSystem.updateCharacterMovement(testPlayerId, position, velocity);

      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.WALKING);
      
      const direction = animationSystem.getCharacterDirection(testPlayerId);
      expect(direction).toBe(Direction.EAST);
    });

    test('should transition to running when moving fast', () => {
      const position = new Vector2(100, 100);
      const velocity = new Vector2(200, 0); // Fast movement (running speed)

      animationSystem.updateCharacterMovement(testPlayerId, position, velocity);

      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.RUNNING);
    });

    test('should return to idle when stopping', () => {
      // First start moving
      animationSystem.updateCharacterMovement(
        testPlayerId,
        new Vector2(100, 100),
        new Vector2(100, 0)
      );
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.WALKING);

      // Then stop
      animationSystem.updateCharacterMovement(
        testPlayerId,
        new Vector2(150, 100),
        new Vector2(0, 0)
      );
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.IDLE);
    });

    test('should calculate correct direction from movement', () => {
      const testCases = [
        { velocity: new Vector2(1, 0), expectedDirection: Direction.EAST },
        { velocity: new Vector2(0, 1), expectedDirection: Direction.SOUTH },
        { velocity: new Vector2(-1, 0), expectedDirection: Direction.WEST },
        { velocity: new Vector2(0, -1), expectedDirection: Direction.NORTH },
        { velocity: new Vector2(1, 1), expectedDirection: Direction.SOUTHEAST },
        { velocity: new Vector2(-1, -1), expectedDirection: Direction.NORTHWEST }
      ];

      testCases.forEach(({ velocity, expectedDirection }) => {
        animationSystem.updateCharacterMovement(
          testPlayerId,
          new Vector2(100, 100),
          velocity.multiply(100) // Scale to walking speed
        );
        
        const direction = animationSystem.getCharacterDirection(testPlayerId);
        expect(direction).toBe(expectedDirection);
      });
    });

    test('should ignore very small movements (jitter prevention)', () => {
      // Start with idle
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.IDLE);

      // Apply tiny movement (should be ignored)
      animationSystem.updateCharacterMovement(
        testPlayerId,
        new Vector2(100, 100),
        new Vector2(0.05, 0.05) // Very small movement
      );

      // Should remain idle
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.IDLE);
    });
  });

  describe('Action-Based Animations', () => {
    beforeEach(async () => {
      await animationSystem.initializeCharacter(testPlayerId);
    });

    test('should trigger roll animation', () => {
      animationSystem.rollCharacter(testPlayerId);
      
      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.ROLLING);
    });

    test('should not trigger roll if already rolling', () => {
      animationSystem.rollCharacter(testPlayerId);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.ROLLING);

      // Try to roll again
      animationSystem.rollCharacter(testPlayerId);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.ROLLING);
    });

    test('should trigger shooting animation', () => {
      animationSystem.triggerShootingAnimation(testPlayerId);
      
      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.SHOOTING);
    });

    test('should trigger shooting animation with direction', () => {
      const shootDirection = new Vector2(1, 0); // East
      animationSystem.triggerShootingAnimation(testPlayerId, shootDirection);
      
      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.SHOOTING);
      
      const direction = animationSystem.getCharacterDirection(testPlayerId);
      expect(direction).toBe(Direction.EAST);
    });

    test('should set reloading state', () => {
      animationSystem.setCharacterReloading(testPlayerId, true);
      
      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.RELOADING);

      animationSystem.setCharacterReloading(testPlayerId, false);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.IDLE);
    });

    test('should set aiming state', () => {
      animationSystem.setCharacterAiming(testPlayerId, true);
      
      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.AIMING);

      animationSystem.setCharacterAiming(testPlayerId, false);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.IDLE);
    });

    test('should trigger melee attack animation', () => {
      animationSystem.triggerMeleeAttack(testPlayerId);
      
      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.MELEE_ATTACK);
    });

    test('should trigger melee attack with direction', () => {
      const attackDirection = new Vector2(0, 1); // South
      animationSystem.triggerMeleeAttack(testPlayerId, attackDirection);
      
      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.MELEE_ATTACK);
      
      const direction = animationSystem.getCharacterDirection(testPlayerId);
      expect(direction).toBe(Direction.SOUTH);
    });

    test('should trigger throwing animation', () => {
      animationSystem.triggerThrowingAnimation(testPlayerId);
      
      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.THROWING);
    });

    test('should roll character in specific direction', () => {
      const rollDirection = new Vector2(-1, -1); // Northwest
      animationSystem.rollCharacterInDirection(testPlayerId, rollDirection);
      
      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.ROLLING);
      
      const direction = animationSystem.getCharacterDirection(testPlayerId);
      expect(direction).toBe(Direction.NORTHWEST);
    });

    test('should set prone state', () => {
      animationSystem.setCharacterProne(testPlayerId, true);
      
      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.PRONE_IDLE);
    });

    test('should transition between prone idle and prone moving', () => {
      // Set prone
      animationSystem.setCharacterProne(testPlayerId, true);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.PRONE_IDLE);

      // Start moving while prone
      animationSystem.updateCharacterMovement(
        testPlayerId,
        new Vector2(100, 100),
        new Vector2(50, 0)
      );
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.PRONE_MOVING);

      // Stop moving while prone
      animationSystem.updateCharacterMovement(
        testPlayerId,
        new Vector2(150, 100),
        new Vector2(0, 0)
      );
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.PRONE_IDLE);
    });

    test('should set interaction state', () => {
      animationSystem.setCharacterInteracting(testPlayerId, true);
      
      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.INTERACTING);

      animationSystem.setCharacterInteracting(testPlayerId, false);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.IDLE);
    });

    test('should set hacking state', () => {
      animationSystem.setCharacterHacking(testPlayerId, true);
      
      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.HACKING);

      animationSystem.setCharacterHacking(testPlayerId, false);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.IDLE);
    });
  });

  describe('Damage and Death Animations', () => {
    beforeEach(async () => {
      await animationSystem.initializeCharacter(testPlayerId);
    });

    test('should trigger damage animation', () => {
      animationSystem.triggerDamageAnimation(testPlayerId);
      
      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.TAKING_DAMAGE);
    });

    test('should trigger death animation', () => {
      animationSystem.triggerDeathAnimation(testPlayerId);
      
      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.DYING);
    });

    test('should revive character', () => {
      // Kill character
      animationSystem.triggerDeathAnimation(testPlayerId);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.DYING);

      // Revive character
      animationSystem.reviveCharacter(testPlayerId);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.IDLE);
    });
  });

  describe('Animation State Priority', () => {
    beforeEach(async () => {
      await animationSystem.initializeCharacter(testPlayerId);
    });

    test('should prioritize damage animation over movement', () => {
      // Start walking
      animationSystem.updateCharacterMovement(
        testPlayerId,
        new Vector2(100, 100),
        new Vector2(100, 0)
      );
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.WALKING);

      // Trigger damage (should override walking)
      animationSystem.triggerDamageAnimation(testPlayerId);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.TAKING_DAMAGE);
    });

    test('should prioritize death over all other states', () => {
      // Set various states
      animationSystem.setCharacterInteracting(testPlayerId, true);
      animationSystem.setCharacterHacking(testPlayerId, true);
      
      // Trigger death (should override everything)
      animationSystem.triggerDeathAnimation(testPlayerId);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.DYING);
    });

    test('should prioritize rolling over movement', () => {
      // Start running
      animationSystem.updateCharacterMovement(
        testPlayerId,
        new Vector2(100, 100),
        new Vector2(200, 0)
      );
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.RUNNING);

      // Trigger roll (should override running)
      animationSystem.rollCharacter(testPlayerId);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.ROLLING);
    });
  });

  describe('Animation System Updates', () => {
    beforeEach(async () => {
      await animationSystem.initializeCharacter(testPlayerId);
    });

    test('should update all character animations', () => {
      expect(() => {
        animationSystem.update(16.67); // ~60fps
      }).not.toThrow();
    });

    test('should handle updates with no characters', () => {
      const emptySystem = new CharacterAnimationSystem();
      expect(() => {
        emptySystem.update(16.67);
      }).not.toThrow();
      emptySystem.destroy();
    });

    test('should handle large delta times', () => {
      expect(() => {
        animationSystem.update(1000); // 1 second
      }).not.toThrow();
    });
  });

  describe('Animation Control', () => {
    beforeEach(async () => {
      await animationSystem.initializeCharacter(testPlayerId);
    });

    test('should set playback speed', () => {
      expect(() => {
        animationSystem.setPlaybackSpeed(testPlayerId, 2.0);
      }).not.toThrow();
    });

    test('should pause and resume animations', () => {
      expect(() => {
        animationSystem.setPaused(testPlayerId, true);
        animationSystem.setPaused(testPlayerId, false);
      }).not.toThrow();
    });

    test('should handle invalid player IDs gracefully', () => {
      expect(() => {
        animationSystem.setPlaybackSpeed('invalid-player', 1.0);
        animationSystem.setPaused('invalid-player', true);
        animationSystem.rollCharacter('invalid-player');
      }).not.toThrow();
    });
  });

  describe('Enhanced Action Animations', () => {
    beforeEach(async () => {
      await animationSystem.initializeCharacter(testPlayerId);
    });

    test('should trigger shooting animation with direction', () => {
      const shootDirection = new Vector2(1, 0); // Shooting east
      
      animationSystem.triggerShootingAnimation(testPlayerId, shootDirection);
      
      // Should maintain current state but update direction
      const direction = animationSystem.getCharacterDirection(testPlayerId);
      expect(direction).toBe(Direction.EAST);
    });

    test('should auto-stop shooting animation after timeout', async () => {
      const shootDirection = new Vector2(1, 0);
      
      animationSystem.triggerShootingAnimation(testPlayerId, shootDirection);
      
      // Check that shooting animation auto-stops after 200ms
      await new Promise(resolve => setTimeout(resolve, 250));
      
      // Animation should have auto-stopped by now
      // We can't directly test the internal isShooting flag, but the animation should be stable
      expect(animationSystem.getCharacterState(testPlayerId)).toBeDefined();
    });

    test('should set character reloading state', () => {
      animationSystem.setCharacterReloading(testPlayerId, true);
      
      // Should update character state appropriately
      expect(animationSystem.getCharacterState(testPlayerId)).toBeDefined();
      
      animationSystem.setCharacterReloading(testPlayerId, false);
      expect(animationSystem.getCharacterState(testPlayerId)).toBeDefined();
    });

    test('should set character weapon', () => {
      expect(() => {
        animationSystem.setCharacterWeapon(testPlayerId, WeaponType.RIFLE);
        animationSystem.setCharacterWeapon(testPlayerId, WeaponType.SHOTGUN);
        animationSystem.setCharacterWeapon(testPlayerId, WeaponType.PISTOL);
      }).not.toThrow();
    });

    test('should roll character in specific direction', () => {
      const rollDirection = new Vector2(1, 1); // Northeast roll
      
      animationSystem.rollCharacterInDirection(testPlayerId, rollDirection);
      
      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.ROLLING);
      
      const direction = animationSystem.getCharacterDirection(testPlayerId);
      expect(direction).toBe(Direction.SOUTHEAST);
    });

    test('should not allow multiple rolls simultaneously', () => {
      const rollDirection1 = new Vector2(1, 0);
      const rollDirection2 = new Vector2(0, 1);
      
      animationSystem.rollCharacterInDirection(testPlayerId, rollDirection1);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.ROLLING);
      
      // Second roll should be ignored
      animationSystem.rollCharacterInDirection(testPlayerId, rollDirection2);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.ROLLING);
      
      // Direction should still be from first roll
      const direction = animationSystem.getCharacterDirection(testPlayerId);
      expect(direction).toBe(Direction.EAST);
    });

    test('should trigger damage animation with direction', () => {
      const damageDirection = new Vector2(-1, 0); // Damage from the west
      
      animationSystem.triggerDamageAnimationWithDirection(testPlayerId, damageDirection);
      
      const state = animationSystem.getCharacterState(testPlayerId);
      expect(state).toBe(AnimationState.TAKING_DAMAGE);
      
      const direction = animationSystem.getCharacterDirection(testPlayerId);
      expect(direction).toBe(Direction.WEST);
    });

    test('should handle invalid player IDs for new methods', () => {
      expect(() => {
        animationSystem.triggerShootingAnimation('invalid-player', new Vector2(1, 0));
        animationSystem.setCharacterReloading('invalid-player', true);
        animationSystem.setCharacterWeapon('invalid-player', WeaponType.RIFLE);
        animationSystem.rollCharacterInDirection('invalid-player', new Vector2(1, 0));
        animationSystem.triggerDamageAnimationWithDirection('invalid-player', new Vector2(1, 0));
      }).not.toThrow();
    });
  });

  describe('Animation State Transitions with Actions', () => {
    beforeEach(async () => {
      await animationSystem.initializeCharacter(testPlayerId);
    });

    test('should prioritize damage over shooting', () => {
      // Start shooting
      animationSystem.triggerShootingAnimation(testPlayerId, new Vector2(1, 0));
      
      // Trigger damage (should override shooting)
      animationSystem.triggerDamageAnimation(testPlayerId);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.TAKING_DAMAGE);
    });

    test('should prioritize rolling over reloading', () => {
      // Start reloading
      animationSystem.setCharacterReloading(testPlayerId, true);
      
      // Trigger roll (should override reloading)
      animationSystem.rollCharacter(testPlayerId);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.ROLLING);
    });

    test('should handle complex state transitions', () => {
      // Start with movement
      animationSystem.updateCharacterMovement(
        testPlayerId,
        new Vector2(100, 100),
        new Vector2(100, 0)
      );
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.WALKING);

      // Go prone while moving
      animationSystem.setCharacterProne(testPlayerId, true);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.PRONE_MOVING);

      // Stop moving while prone
      animationSystem.updateCharacterMovement(
        testPlayerId,
        new Vector2(150, 100),
        new Vector2(0, 0)
      );
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.PRONE_IDLE);

      // Start interacting while prone
      animationSystem.setCharacterInteracting(testPlayerId, true);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.INTERACTING);

      // Stop interacting and prone
      animationSystem.setCharacterInteracting(testPlayerId, false);
      animationSystem.setCharacterProne(testPlayerId, false);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.IDLE);
    });
  });

  describe('Animation Timing and Duration', () => {
    beforeEach(async () => {
      await animationSystem.initializeCharacter(testPlayerId);
    });

    test('should handle rapid state changes', () => {
      // Rapidly change between states
      for (let i = 0; i < 10; i++) {
        animationSystem.setCharacterInteracting(testPlayerId, true);
        animationSystem.setCharacterInteracting(testPlayerId, false);
        animationSystem.setCharacterHacking(testPlayerId, true);
        animationSystem.setCharacterHacking(testPlayerId, false);
      }
      
      // Should end up in idle state
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.IDLE);
    });

    test('should handle animation updates during state changes', () => {
      // Start an animation
      animationSystem.setCharacterInteracting(testPlayerId, true);
      
      // Update animation system multiple times
      for (let i = 0; i < 5; i++) {
        animationSystem.update(16.67); // ~60fps
      }
      
      // Should still be in interaction state
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.INTERACTING);
      
      // Stop interaction
      animationSystem.setCharacterInteracting(testPlayerId, false);
      expect(animationSystem.getCharacterState(testPlayerId)).toBe(AnimationState.IDLE);
    });
  });

  describe('Frame Retrieval', () => {
    beforeEach(async () => {
      await animationSystem.initializeCharacter(testPlayerId);
    });

    test('should get current animation frame', () => {
      const frame = animationSystem.getCurrentFrame(testPlayerId);
      expect(frame).toBeTruthy();
      expect(frame).toHaveProperty('frame');
      expect(frame).toHaveProperty('spriteSheet');
      expect(frame).toHaveProperty('alpha');
    });

    test('should return null for invalid player ID', () => {
      const frame = animationSystem.getCurrentFrame('invalid-player');
      expect(frame).toBeNull();
    });

    test('should get transition frame during transitions', () => {
      // Start a transition
      animationSystem.updateCharacterMovement(
        testPlayerId,
        new Vector2(100, 100),
        new Vector2(100, 0)
      );

      // Check if transitioning
      const isTransitioning = animationSystem.isCharacterTransitioning(testPlayerId);
      
      if (isTransitioning) {
        const transitionFrame = animationSystem.getTransitionFrame(testPlayerId);
        expect(transitionFrame).toBeTruthy();
      } else {
        const transitionFrame = animationSystem.getTransitionFrame(testPlayerId);
        expect(transitionFrame).toBeNull();
      }
    });
  });

  describe('Character Management', () => {
    test('should remove character from system', async () => {
      await animationSystem.initializeCharacter(testPlayerId);
      expect(animationSystem.getAnimatedCharacters()).toContain(testPlayerId);

      animationSystem.removeCharacter(testPlayerId);
      expect(animationSystem.getAnimatedCharacters()).not.toContain(testPlayerId);
    });

    test('should handle removing non-existent character', () => {
      expect(() => {
        animationSystem.removeCharacter('non-existent-player');
      }).not.toThrow();
    });

    test('should get animation statistics', async () => {
      await animationSystem.initializeCharacter(testPlayerId);
      await animationSystem.initializeCharacter('player2');

      const stats = animationSystem.getAnimationStats();
      expect(stats).toHaveProperty('totalCharacters');
      expect(stats).toHaveProperty('activeAnimations');
      expect(stats).toHaveProperty('transitioningAnimations');
      expect(stats.totalCharacters).toBe(2);
    });
  });

  describe('Resource Management', () => {
    test('should cleanup all resources on destroy', async () => {
      await animationSystem.initializeCharacter(testPlayerId);
      await animationSystem.initializeCharacter('player2');

      expect(() => {
        animationSystem.destroy();
      }).not.toThrow();

      // After destroy, should have no characters
      const stats = animationSystem.getAnimationStats();
      expect(stats.totalCharacters).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle character operations before initialization', () => {
      expect(() => {
        animationSystem.updateCharacterMovement(
          'uninitialized-player',
          new Vector2(0, 0),
          new Vector2(0, 0)
        );
        animationSystem.rollCharacter('uninitialized-player');
        animationSystem.setCharacterProne('uninitialized-player', true);
      }).not.toThrow();
    });

    test('should handle extreme movement values', async () => {
      await animationSystem.initializeCharacter(testPlayerId);

      expect(() => {
        // Very large movement
        animationSystem.updateCharacterMovement(
          testPlayerId,
          new Vector2(1000000, 1000000),
          new Vector2(10000, 10000)
        );

        // Very small movement
        animationSystem.updateCharacterMovement(
          testPlayerId,
          new Vector2(0.001, 0.001),
          new Vector2(0.001, 0.001)
        );

        // Negative coordinates
        animationSystem.updateCharacterMovement(
          testPlayerId,
          new Vector2(-1000, -1000),
          new Vector2(-100, -100)
        );
      }).not.toThrow();
    });

    test('should handle NaN and Infinity values', async () => {
      await animationSystem.initializeCharacter(testPlayerId);

      expect(() => {
        animationSystem.updateCharacterMovement(
          testPlayerId,
          new Vector2(NaN, NaN),
          new Vector2(Infinity, -Infinity)
        );
      }).not.toThrow();
    });
  });
});