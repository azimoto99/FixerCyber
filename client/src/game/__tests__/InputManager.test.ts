import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { InputManager } from '../engine/InputManager';

// Mock canvas element
const createMockCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  
  // Mock getBoundingClientRect
  canvas.getBoundingClientRect = vi.fn(() => ({
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    toJSON: () => ({})
  }));
  
  return canvas;
};

describe('InputManager', () => {
  let inputManager: InputManager;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = createMockCanvas();
    inputManager = new InputManager(canvas);
  });

  afterEach(() => {
    inputManager.destroy();
  });

  describe('Basic Input Detection', () => {
    test('should detect key presses', () => {
      // Simulate keydown event
      const event = new KeyboardEvent('keydown', { code: 'KeyW' });
      document.dispatchEvent(event);

      expect(inputManager.isKeyPressed('KeyW')).toBe(true);
      expect(inputManager.isKeyPressed('KeyS')).toBe(false);
    });

    test('should detect key releases', () => {
      // Press and release key
      const keydownEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
      const keyupEvent = new KeyboardEvent('keyup', { code: 'KeyW' });
      
      document.dispatchEvent(keydownEvent);
      expect(inputManager.isKeyPressed('KeyW')).toBe(true);
      
      document.dispatchEvent(keyupEvent);
      expect(inputManager.isKeyPressed('KeyW')).toBe(false);
    });

    test('should detect mouse button presses', () => {
      const event = new MouseEvent('mousedown', { button: 0 });
      canvas.dispatchEvent(event);

      expect(inputManager.isMouseButtonPressed(0)).toBe(true);
      expect(inputManager.isMouseButtonPressed(1)).toBe(false);
    });
  });

  describe('Movement Input Processing', () => {
    test('should return zero vector when no keys are pressed', () => {
      inputManager.update(0.016); // 60fps delta
      
      const velocity = inputManager.getMovementVelocity();
      expect(velocity.x).toBe(0);
      expect(velocity.y).toBe(0);
      expect(inputManager.isMoving()).toBe(false);
    });

    test('should handle single direction input (W key)', () => {
      // Press W key
      const event = new KeyboardEvent('keydown', { code: 'KeyW' });
      document.dispatchEvent(event);

      // Update for a few frames to build up velocity
      for (let i = 0; i < 10; i++) {
        inputManager.update(0.016);
      }

      const velocity = inputManager.getMovementVelocity();
      const direction = inputManager.getMovementDirection();
      
      // W should move in isometric space (based on actual transformation)
      expect(velocity.magnitude).toBeGreaterThan(0);
      expect(direction.x).toBeCloseTo(0.707, 2); // W gives positive X
      expect(direction.y).toBeCloseTo(-0.707, 2); // W gives negative Y
      expect(inputManager.isMoving()).toBe(true);
    });

    test('should handle diagonal movement (W+D keys)', () => {
      // Press W and D keys
      const wEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
      const dEvent = new KeyboardEvent('keydown', { code: 'KeyD' });
      document.dispatchEvent(wEvent);
      document.dispatchEvent(dEvent);

      // Update for a few frames
      for (let i = 0; i < 10; i++) {
        inputManager.update(0.016);
      }

      const velocity = inputManager.getMovementVelocity();
      const direction = inputManager.getMovementDirection();
      
      // W+D: W=(0,-1), D=(1,0), combined=(1,-1)
      // Isometric: isoX = (1-(-1))*0.5 = 1, isoY = (1+(-1))*0.5 = 0
      // Normalized: (1,0) -> pure east direction
      expect(velocity.magnitude).toBeGreaterThan(0);
      expect(direction.x).toBeCloseTo(1, 2); // Should be 1 (pure east)
      expect(Math.abs(direction.y)).toBeLessThan(0.1); // Should be close to 0
      expect(inputManager.isMoving()).toBe(true);
    });

    test('should normalize diagonal movement speed', () => {
      // Test single direction vs diagonal movement
      
      // Single direction (W)
      const wEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
      document.dispatchEvent(wEvent);
      
      for (let i = 0; i < 20; i++) {
        inputManager.update(0.016);
      }
      
      const singleDirectionSpeed = inputManager.getMovementVelocity().magnitude;
      
      // Reset
      const wUpEvent = new KeyboardEvent('keyup', { code: 'KeyW' });
      document.dispatchEvent(wUpEvent);
      
      // Wait for deceleration
      for (let i = 0; i < 20; i++) {
        inputManager.update(0.016);
      }
      
      // Diagonal movement (W+D)
      const dEvent = new KeyboardEvent('keydown', { code: 'KeyD' });
      document.dispatchEvent(wEvent);
      document.dispatchEvent(dEvent);
      
      for (let i = 0; i < 20; i++) {
        inputManager.update(0.016);
      }
      
      const diagonalSpeed = inputManager.getMovementVelocity().magnitude;
      
      // Diagonal speed should be approximately equal to single direction speed
      expect(Math.abs(diagonalSpeed - singleDirectionSpeed)).toBeLessThan(5);
    });
  });

  describe('Isometric Coordinate Conversion', () => {
    test('should convert WASD to correct isometric directions', () => {
      const testCases = [
        { key: 'KeyW', expectedX: 0.707, expectedY: -0.707 }, // W: (0,-1) -> (0.707, -0.707)
        { key: 'KeyA', expectedX: -0.707, expectedY: -0.707 }, // A: (-1,0) -> (-0.707, -0.707)
        { key: 'KeyS', expectedX: -0.707, expectedY: 0.707 }, // S: (0,1) -> (-0.707, 0.707)
        { key: 'KeyD', expectedX: 0.707, expectedY: 0.707 }   // D: (1,0) -> (0.707, 0.707)
      ];

      testCases.forEach(({ key, expectedX, expectedY }) => {
        // Reset state
        inputManager.destroy();
        inputManager = new InputManager(canvas);
        
        // Press key
        const event = new KeyboardEvent('keydown', { code: key });
        document.dispatchEvent(event);

        // Update to build velocity
        for (let i = 0; i < 10; i++) {
          inputManager.update(0.016);
        }

        const direction = inputManager.getMovementDirection();
        
        expect(direction.x).toBeCloseTo(expectedX, 2);
        expect(direction.y).toBeCloseTo(expectedY, 2);
      });
    });
  });

  describe('Acceleration and Deceleration', () => {
    test('should accelerate from zero to max speed', () => {
      const wEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
      document.dispatchEvent(wEvent);

      let previousSpeed = 0;
      let accelerationFrames = 0;
      
      // Update until we reach max speed or reasonable frame count
      for (let i = 0; i < 100; i++) {
        inputManager.update(0.016);
        const currentSpeed = inputManager.getMovementVelocity().magnitude;
        
        if (currentSpeed > previousSpeed) {
          accelerationFrames++;
        }
        
        previousSpeed = currentSpeed;
        
        // Break if we've reached max speed
        if (Math.abs(currentSpeed - 200) < 1) {
          break;
        }
      }

      expect(accelerationFrames).toBeGreaterThan(5); // Should take multiple frames to accelerate
      expect(previousSpeed).toBeCloseTo(200, 0); // Should reach max speed
    });

    test('should decelerate to zero when input stops', () => {
      // First accelerate
      const wEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
      document.dispatchEvent(wEvent);
      
      for (let i = 0; i < 20; i++) {
        inputManager.update(0.016);
      }
      
      const speedBeforeDeceleration = inputManager.getMovementVelocity().magnitude;
      expect(speedBeforeDeceleration).toBeGreaterThan(100);
      
      // Release key
      const wUpEvent = new KeyboardEvent('keyup', { code: 'KeyW' });
      document.dispatchEvent(wUpEvent);
      
      // Decelerate
      let decelerationFrames = 0;
      let previousSpeed = speedBeforeDeceleration;
      
      for (let i = 0; i < 100; i++) {
        inputManager.update(0.016);
        const currentSpeed = inputManager.getMovementVelocity().magnitude;
        
        if (currentSpeed < previousSpeed) {
          decelerationFrames++;
        }
        
        previousSpeed = currentSpeed;
        
        if (currentSpeed < 0.1) {
          break;
        }
      }

      expect(decelerationFrames).toBeGreaterThan(3); // Should take multiple frames to decelerate
      expect(inputManager.isMoving()).toBe(false); // Should come to a stop
    });

    test('should respect maximum speed limit', () => {
      const wEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
      document.dispatchEvent(wEvent);

      // Update for many frames to ensure we hit max speed
      for (let i = 0; i < 100; i++) {
        inputManager.update(0.016);
      }

      const velocity = inputManager.getMovementVelocity();
      expect(velocity.magnitude).toBeLessThanOrEqual(200.1); // Allow small floating point error
    });
  });

  describe('Arrow Key Support', () => {
    test('should support arrow keys as alternative to WASD', () => {
      const upEvent = new KeyboardEvent('keydown', { code: 'ArrowUp' });
      document.dispatchEvent(upEvent);

      for (let i = 0; i < 10; i++) {
        inputManager.update(0.016);
      }

      const direction = inputManager.getMovementDirection();
      
      // Arrow up should behave same as W key
      expect(direction.x).toBeCloseTo(0.707, 2);
      expect(direction.y).toBeCloseTo(-0.707, 2);
      expect(inputManager.isMoving()).toBe(true);
    });
  });

  describe('Event System', () => {
    test('should emit keydown events', () => {
      const callback = vi.fn();
      inputManager.on('keydown', callback);

      const event = new KeyboardEvent('keydown', { code: 'KeyW', key: 'w' });
      document.dispatchEvent(event);

      expect(callback).toHaveBeenCalledWith({ code: 'KeyW', key: 'w' });
    });

    test('should emit mouse events', () => {
      const callback = vi.fn();
      inputManager.on('mousedown', callback);

      const event = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 50 });
      canvas.dispatchEvent(event);

      expect(callback).toHaveBeenCalledWith({
        button: 0,
        x: 100,
        y: 50
      });
    });

    test('should remove event listeners', () => {
      const callback = vi.fn();
      inputManager.on('keydown', callback);
      inputManager.off('keydown', callback);

      const event = new KeyboardEvent('keydown', { code: 'KeyW' });
      document.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Mouse Position Tracking', () => {
    test('should track mouse position relative to canvas', () => {
      const event = new MouseEvent('mousemove', { clientX: 150, clientY: 100 });
      canvas.dispatchEvent(event);

      const position = inputManager.getMousePosition();
      expect(position.x).toBe(150);
      expect(position.y).toBe(100);
    });
  });

  describe('Backward Compatibility', () => {
    test('should provide backward compatible movement input', () => {
      const wEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
      document.dispatchEvent(wEvent);

      for (let i = 0; i < 10; i++) {
        inputManager.update(0.016);
      }

      const input = inputManager.getMovementInput();
      expect(typeof input.x).toBe('number');
      expect(typeof input.y).toBe('number');
      expect(Math.abs(input.x) + Math.abs(input.y)).toBeGreaterThan(0);
    });
  });

  describe('Action Controls - Roll/Dodge', () => {
    test('should trigger roll action on Space key press', () => {
      const actionCallback = vi.fn();
      inputManager.on('action', actionCallback);

      const spaceEvent = new KeyboardEvent('keydown', { code: 'Space' });
      document.dispatchEvent(spaceEvent);
      inputManager.update(0.016);

      expect(actionCallback).toHaveBeenCalledWith({
        type: 'roll',
        direction: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number)
        })
      });
      expect(inputManager.isRolling()).toBe(true);
    });

    test('should prevent rolling during cooldown', () => {
      const actionCallback = vi.fn();
      inputManager.on('action', actionCallback);

      // First roll
      const spaceEvent1 = new KeyboardEvent('keydown', { code: 'Space' });
      document.dispatchEvent(spaceEvent1);
      inputManager.update(0.016);
      
      expect(inputManager.isRolling()).toBe(true);
      expect(actionCallback).toHaveBeenCalledTimes(1);

      // Release and press again immediately
      const spaceUpEvent = new KeyboardEvent('keyup', { code: 'Space' });
      document.dispatchEvent(spaceUpEvent);
      inputManager.update(0.016);

      const spaceEvent2 = new KeyboardEvent('keydown', { code: 'Space' });
      document.dispatchEvent(spaceEvent2);
      inputManager.update(0.016);

      // Should not trigger second roll due to cooldown
      expect(actionCallback).toHaveBeenCalledTimes(1);
    });

    test('should disable movement during roll', () => {
      // Start moving
      const wEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
      document.dispatchEvent(wEvent);
      
      for (let i = 0; i < 10; i++) {
        inputManager.update(0.016);
      }
      
      const movementBeforeRoll = inputManager.getMovementInput();
      expect(Math.abs(movementBeforeRoll.x) + Math.abs(movementBeforeRoll.y)).toBeGreaterThan(0);

      // Trigger roll
      const spaceEvent = new KeyboardEvent('keydown', { code: 'Space' });
      document.dispatchEvent(spaceEvent);
      inputManager.update(0.016);

      // Movement should be disabled during roll
      const movementDuringRoll = inputManager.getMovementInput();
      expect(movementDuringRoll.x).toBe(0);
      expect(movementDuringRoll.y).toBe(0);
    });

    test('should end roll after duration', () => {
      const spaceEvent = new KeyboardEvent('keydown', { code: 'Space' });
      document.dispatchEvent(spaceEvent);
      inputManager.update(0.016);

      expect(inputManager.isRolling()).toBe(true);

      // Update for roll duration (0.5 seconds)
      for (let i = 0; i < 35; i++) { // 35 frames at 60fps = ~0.58 seconds
        inputManager.update(0.016);
      }

      expect(inputManager.isRolling()).toBe(false);
    });
  });

  describe('Action Controls - Prone State', () => {
    test('should toggle prone state on C key press', () => {
      const actionCallback = vi.fn();
      inputManager.on('action', actionCallback);

      expect(inputManager.isProne()).toBe(false);

      const cEvent = new KeyboardEvent('keydown', { code: 'KeyC' });
      document.dispatchEvent(cEvent);
      inputManager.update(0.016);

      expect(inputManager.isProne()).toBe(true);
      expect(actionCallback).toHaveBeenCalledWith({
        type: 'prone',
        isProne: true
      });
    });

    test('should reduce movement speed when prone', () => {
      // Start moving
      const wEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
      document.dispatchEvent(wEvent);
      
      for (let i = 0; i < 20; i++) {
        inputManager.update(0.016);
      }
      
      const normalMovement = inputManager.getMovementInput();
      const normalSpeed = Math.sqrt(normalMovement.x * normalMovement.x + normalMovement.y * normalMovement.y);

      // Go prone
      const cEvent = new KeyboardEvent('keydown', { code: 'KeyC' });
      document.dispatchEvent(cEvent);
      inputManager.update(0.016);

      const proneMovement = inputManager.getMovementInput();
      const proneSpeed = Math.sqrt(proneMovement.x * proneMovement.x + proneMovement.y * proneMovement.y);

      // Prone speed should be 30% of normal speed
      expect(proneSpeed).toBeCloseTo(normalSpeed * 0.3, 1);
    });

    test('should toggle prone state off when pressed again', () => {
      // Go prone
      const cEvent1 = new KeyboardEvent('keydown', { code: 'KeyC' });
      document.dispatchEvent(cEvent1);
      inputManager.update(0.016);
      expect(inputManager.isProne()).toBe(true);

      // Release and press again
      const cUpEvent = new KeyboardEvent('keyup', { code: 'KeyC' });
      document.dispatchEvent(cUpEvent);
      inputManager.update(0.016);

      const cEvent2 = new KeyboardEvent('keydown', { code: 'KeyC' });
      document.dispatchEvent(cEvent2);
      inputManager.update(0.016);

      expect(inputManager.isProne()).toBe(false);
    });
  });

  describe('Action Controls - Interactions', () => {
    test('should trigger interaction on E key press', () => {
      const actionCallback = vi.fn();
      inputManager.on('action', actionCallback);

      const eEvent = new KeyboardEvent('keydown', { code: 'KeyE' });
      document.dispatchEvent(eEvent);
      inputManager.update(0.016);

      expect(actionCallback).toHaveBeenCalledWith({
        type: 'interact',
        position: expect.any(Object)
      });
    });
  });

  describe('UI Controls', () => {
    test('should toggle inventory on I key press', () => {
      const uiCallback = vi.fn();
      inputManager.on('ui', uiCallback);

      expect(inputManager.isInventoryOpen()).toBe(false);

      const iEvent = new KeyboardEvent('keydown', { code: 'KeyI' });
      document.dispatchEvent(iEvent);
      inputManager.update(0.016);

      expect(inputManager.isInventoryOpen()).toBe(true);
      expect(uiCallback).toHaveBeenCalledWith({
        type: 'inventory',
        isOpen: true
      });
    });

    test('should toggle pause menu on Escape key press', () => {
      const uiCallback = vi.fn();
      inputManager.on('ui', uiCallback);

      expect(inputManager.isPauseMenuOpen()).toBe(false);

      const escEvent = new KeyboardEvent('keydown', { code: 'Escape' });
      document.dispatchEvent(escEvent);
      inputManager.update(0.016);

      expect(inputManager.isPauseMenuOpen()).toBe(true);
      expect(uiCallback).toHaveBeenCalledWith({
        type: 'pauseMenu',
        isOpen: true
      });
    });

    test('should close inventory when pressed again', () => {
      // Open inventory
      const iEvent1 = new KeyboardEvent('keydown', { code: 'KeyI' });
      document.dispatchEvent(iEvent1);
      inputManager.update(0.016);
      expect(inputManager.isInventoryOpen()).toBe(true);

      // Release and press again
      const iUpEvent = new KeyboardEvent('keyup', { code: 'KeyI' });
      document.dispatchEvent(iUpEvent);
      inputManager.update(0.016);

      const iEvent2 = new KeyboardEvent('keydown', { code: 'KeyI' });
      document.dispatchEvent(iEvent2);
      inputManager.update(0.016);

      expect(inputManager.isInventoryOpen()).toBe(false);
    });
  });

  describe('Mouse-Based Character Facing', () => {
    test('should update facing direction based on mouse position', () => {
      // Move mouse to top-right of canvas
      const mouseEvent = new MouseEvent('mousemove', { 
        clientX: 600, // Right side
        clientY: 100  // Top side
      });
      canvas.dispatchEvent(mouseEvent);
      inputManager.update(0.016);

      const facingDirection = inputManager.getFacingDirection();
      
      // Should face towards top-right (positive X, negative Y)
      expect(facingDirection.x).toBeGreaterThan(0);
      expect(facingDirection.y).toBeLessThan(0);
      expect(facingDirection.magnitude).toBeCloseTo(1, 2); // Should be normalized
    });

    test('should use facing direction for roll action', () => {
      const actionCallback = vi.fn();
      inputManager.on('action', actionCallback);

      // Set mouse position to create specific facing direction
      const mouseEvent = new MouseEvent('mousemove', { 
        clientX: 500, // Right of center
        clientY: 300  // Center Y
      });
      canvas.dispatchEvent(mouseEvent);
      inputManager.update(0.016);

      // Trigger roll
      const spaceEvent = new KeyboardEvent('keydown', { code: 'Space' });
      document.dispatchEvent(spaceEvent);
      inputManager.update(0.016);

      const rollCall = actionCallback.mock.calls.find(call => call[0].type === 'roll');
      expect(rollCall).toBeDefined();
      expect(rollCall[0].direction.x).toBeGreaterThan(0); // Should face right
    });
  });

  describe('Just-Pressed Key Detection', () => {
    test('should detect keys that were just pressed this frame', () => {
      // Key should not be just-pressed initially
      expect(inputManager.wasKeyJustPressed('KeyE')).toBe(false);

      // Press key
      const eEvent = new KeyboardEvent('keydown', { code: 'KeyE' });
      document.dispatchEvent(eEvent);

      // Should be just-pressed before update
      expect(inputManager.wasKeyJustPressed('KeyE')).toBe(true);

      // Update should clear just-pressed state
      inputManager.update(0.016);
      expect(inputManager.wasKeyJustPressed('KeyE')).toBe(false);

      // Should remain false on subsequent updates while held
      inputManager.update(0.016);
      expect(inputManager.wasKeyJustPressed('KeyE')).toBe(false);
    });

    test('should not trigger action multiple times while key is held', () => {
      const actionCallback = vi.fn();
      inputManager.on('action', actionCallback);

      // Press and hold E key
      const eEvent = new KeyboardEvent('keydown', { code: 'KeyE' });
      document.dispatchEvent(eEvent);

      // Multiple updates while key is held
      for (let i = 0; i < 5; i++) {
        inputManager.update(0.016);
      }

      // Should only trigger once
      expect(actionCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Roll Cooldown System', () => {
    test('should track roll cooldown correctly', () => {
      // Initially no cooldown
      expect(inputManager.getRollCooldown()).toBe(0);

      // Trigger roll
      const spaceEvent = new KeyboardEvent('keydown', { code: 'Space' });
      document.dispatchEvent(spaceEvent);
      inputManager.update(0.016);

      // Should have cooldown after roll
      expect(inputManager.getRollCooldown()).toBeGreaterThan(0);
      expect(inputManager.getRollCooldown()).toBeLessThanOrEqual(1.0);

      // Cooldown should decrease over time
      const initialCooldown = inputManager.getRollCooldown();
      inputManager.update(0.1); // Update with larger delta
      expect(inputManager.getRollCooldown()).toBeLessThan(initialCooldown);
    });

    test('should allow rolling again after cooldown expires', () => {
      const actionCallback = vi.fn();
      inputManager.on('action', actionCallback);

      // First roll
      const spaceEvent1 = new KeyboardEvent('keydown', { code: 'Space' });
      document.dispatchEvent(spaceEvent1);
      inputManager.update(0.016);
      expect(actionCallback).toHaveBeenCalledTimes(1);

      // Release key
      const spaceUpEvent = new KeyboardEvent('keyup', { code: 'Space' });
      document.dispatchEvent(spaceUpEvent);

      // Wait for cooldown to expire (1 second)
      for (let i = 0; i < 65; i++) { // 65 frames at 60fps = ~1.08 seconds
        inputManager.update(0.016);
      }

      expect(inputManager.getRollCooldown()).toBeLessThanOrEqual(0);

      // Second roll should work
      const spaceEvent2 = new KeyboardEvent('keydown', { code: 'Space' });
      document.dispatchEvent(spaceEvent2);
      inputManager.update(0.016);

      expect(actionCallback).toHaveBeenCalledTimes(2);
    });
  });
});