import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InputManager } from '../../engine/InputManager';
import { Player } from '../../entities/Player';
import { Vector2 } from '../../utils/Vector2';
import { TacticalMovementSystem } from '../TacticalMovementSystem';

// Mock the dependencies
vi.mock('../TacticalInputProcessor', () => ({
  TacticalInputProcessor: vi.fn().mockImplementation(() => ({
    processMovementInput: vi.fn().mockReturnValue(Vector2.zero()),
    processGridInput: vi.fn().mockReturnValue(Vector2.zero()),
    getLastInputTime: vi.fn().mockReturnValue(0),
    hasMovementInput: vi.fn().mockReturnValue(false),
    reset: vi.fn(),
  })),
}));

vi.mock('../GridMovementController', () => ({
  GridMovementController: vi.fn().mockImplementation(() => ({
    update: vi.fn(),
    moveToGrid: vi.fn(),
    snapToGrid: vi.fn().mockImplementation(pos => pos),
    setPosition: vi.fn(),
    getCurrentWorldPosition: vi.fn().mockReturnValue(Vector2.zero()),
    getCurrentGridPosition: vi.fn().mockReturnValue(Vector2.zero()),
    getTargetGridPosition: vi.fn().mockReturnValue(Vector2.zero()),
    isCurrentlyMoving: vi.fn().mockReturnValue(false),
    stopMovement: vi.fn(),
    setGridSize: vi.fn(),
    getDebugInfo: vi.fn().mockReturnValue({}),
  })),
}));

describe('TacticalMovementSystem', () => {
  let movementSystem: TacticalMovementSystem;
  let mockInputManager: InputManager;
  let mockWorldSystem: any;
  let testPlayer: Player;
  let mockInputProcessor: any;
  let _mockGridController: any;

  beforeEach(() => {
    // Create mock input manager
    mockInputManager = {
      isKeyPressed: vi.fn(),
    } as any;

    // Create mock world system
    mockWorldSystem = {
      isBlocked: vi.fn().mockReturnValue(false),
      updatePlayer: vi.fn(),
    };

    // Create test player
    testPlayer = new Player('test-player', 'TestUser', new Vector2(100, 100));

    // Create movement system
    movementSystem = new TacticalMovementSystem(mockWorldSystem);

    // Get references to the mocked instances
    mockInputProcessor = (movementSystem as any).inputProcessor;
    _mockGridController = (movementSystem as any).gridController;
  });

  describe('Constructor', () => {
    it('should create with default configuration', () => {
      const system = new TacticalMovementSystem();
      expect(system).toBeDefined();
      expect(system.getMovementSpeed()).toBe(200); // Default speed
      expect(system.isGridModeEnabled()).toBe(false); // Default grid mode
    });

    it('should create with custom configuration', () => {
      const system = new TacticalMovementSystem(undefined, {
        baseSpeed: 300,
        gridMode: true,
        gridSize: 48,
      });
      expect(system.getMovementSpeed()).toBe(300);
      expect(system.isGridModeEnabled()).toBe(true);
      expect(system.getGridSize()).toBe(48);
    });
  });

  describe('Player Management', () => {
    it('should set player correctly', () => {
      movementSystem.setPlayer(testPlayer);
      const player = movementSystem.getPlayer();

      expect(player).toBeDefined();
      expect(player!.id).toBe('test-player');
      expect(player!.tacticalSpeed).toBe(200);
      expect(player!.movementMode).toBe('smooth');
      expect(player!.instantMovement).toBe(true);
    });

    it('should initialize player with grid mode when enabled', () => {
      const gridSystem = new TacticalMovementSystem(undefined, {
        gridMode: true,
      });
      gridSystem.setPlayer(testPlayer);
      const player = gridSystem.getPlayer();

      expect(player!.movementMode).toBe('grid');
    });

    it('should return null when no player is set', () => {
      expect(movementSystem.getPlayer()).toBeNull();
      expect(movementSystem.getPlayerPosition()).toEqual(Vector2.zero());
      expect(movementSystem.isPlayerMoving()).toBe(false);
    });
  });

  describe('Smooth Movement', () => {
    beforeEach(() => {
      movementSystem.setPlayer(testPlayer);
    });

    it('should handle instant movement response', () => {
      // Mock input processor to return right movement
      mockInputProcessor.processMovementInput.mockReturnValue(
        new Vector2(1, 0)
      );

      const initialPosition = movementSystem.getPlayerPosition();
      movementSystem.update(16, mockInputManager); // 16ms frame

      const newPosition = movementSystem.getPlayerPosition();
      expect(newPosition.x).toBeGreaterThan(initialPosition.x);
      expect(movementSystem.isPlayerMoving()).toBe(true);
    });

    it('should stop immediately when input is released', () => {
      // First, start moving
      mockInputProcessor.processMovementInput.mockReturnValue(
        new Vector2(1, 0)
      );
      movementSystem.update(16, mockInputManager);
      expect(movementSystem.isPlayerMoving()).toBe(true);

      // Then stop input
      mockInputProcessor.processMovementInput.mockReturnValue(Vector2.zero());
      movementSystem.update(16, mockInputManager);

      expect(movementSystem.isPlayerMoving()).toBe(false);
      const velocity = movementSystem.getPlayerVelocity();
      expect(velocity.x).toBe(0);
      expect(velocity.y).toBe(0);
    });

    it('should handle diagonal movement with normalized speed', () => {
      // Mock input processor to return diagonal movement (normalized)
      const diagonalVector = new Vector2(1, -1).normalize(); // Right + Up (normalized)
      mockInputProcessor.processMovementInput.mockReturnValue(diagonalVector);

      const initialPosition = movementSystem.getPlayerPosition();
      movementSystem.update(16, mockInputManager);

      const newPosition = movementSystem.getPlayerPosition();
      const velocity = movementSystem.getPlayerVelocity();

      // Should move in both directions
      expect(newPosition.x).toBeGreaterThan(initialPosition.x);
      expect(newPosition.y).toBeLessThan(initialPosition.y); // Up is negative Y

      // Velocity should be normalized (not faster than single direction)
      const velocityMagnitude = Math.sqrt(
        velocity.x * velocity.x + velocity.y * velocity.y
      );
      expect(velocityMagnitude).toBeCloseTo(200, 1); // Should be close to base speed
    });
  });

  describe('Grid Movement', () => {
    beforeEach(() => {
      movementSystem.enableGridMode(true);
      movementSystem.setPlayer(testPlayer);
    });

    it('should enable grid mode correctly', () => {
      expect(movementSystem.isGridModeEnabled()).toBe(true);
      const player = movementSystem.getPlayer();
      expect(player!.movementMode).toBe('grid');
    });

    it('should snap to grid when enabling grid mode', () => {
      // Start with non-grid-aligned position
      const nonAlignedPlayer = new Player(
        'test',
        'Test',
        new Vector2(115, 125)
      );
      movementSystem.setPlayer(nonAlignedPlayer);

      // Mock snapToGrid to return a properly snapped position
      const gridController = (movementSystem as any).gridController;
      gridController.snapToGrid.mockReturnValue(new Vector2(112, 128)); // Snapped to grid

      // Enable grid mode - this should trigger snapping
      movementSystem.enableGridMode(true);

      // Position should be snapped to grid
      const position = movementSystem.getPlayerPosition();
      expect(position.x).toBe(112); // Should be snapped position
      expect(position.y).toBe(128);
    });

    it('should handle grid movement input', () => {
      // Mock grid input processor to return right movement
      mockInputProcessor.processGridInput.mockReturnValue(new Vector2(1, 0));

      const _initialPosition = movementSystem.getPlayerPosition();
      movementSystem.update(16, mockInputManager);

      // Grid movement might not move immediately (depends on timing)
      // But the system should register the input
      expect(movementSystem.getPlayer()!.lastMoveTime).toBeGreaterThan(0);
    });
  });

  describe('Collision Detection', () => {
    beforeEach(() => {
      movementSystem.setPlayer(testPlayer);
    });

    it('should handle collision blocking', () => {
      // Mock collision detection to block movement
      mockWorldSystem.isBlocked.mockReturnValue(true);

      // Mock input processor to return right movement
      mockInputProcessor.processMovementInput.mockReturnValue(
        new Vector2(1, 0)
      );

      const initialPosition = movementSystem.getPlayerPosition();
      movementSystem.update(16, mockInputManager);

      // Position should not change due to collision
      const newPosition = movementSystem.getPlayerPosition();
      expect(newPosition.x).toBe(initialPosition.x);
      expect(newPosition.y).toBe(initialPosition.y);
    });

    it('should try sliding movement when blocked', () => {
      // Mock collision to block diagonal but allow X movement
      mockWorldSystem.isBlocked.mockImplementation((pos: any) => {
        // Block diagonal movement but allow X-only movement
        return pos.y !== testPlayer.position.y;
      });

      // Mock input processor to return diagonal movement
      mockInputProcessor.processMovementInput.mockReturnValue(
        new Vector2(1, -1).normalize()
      );

      const initialPosition = movementSystem.getPlayerPosition();
      movementSystem.update(16, mockInputManager);

      const newPosition = movementSystem.getPlayerPosition();
      // Should move in X direction but not Y
      expect(newPosition.x).toBeGreaterThan(initialPosition.x);
      expect(newPosition.y).toBe(initialPosition.y);
    });

    it('should disable collision when configured', () => {
      movementSystem.enableCollision(false);
      mockWorldSystem.isBlocked.mockReturnValue(true);

      // Mock input processor to return right movement
      mockInputProcessor.processMovementInput.mockReturnValue(
        new Vector2(1, 0)
      );

      const initialPosition = movementSystem.getPlayerPosition();
      movementSystem.update(16, mockInputManager);

      // Should move despite collision being blocked
      const newPosition = movementSystem.getPlayerPosition();
      expect(newPosition.x).toBeGreaterThan(initialPosition.x);
    });
  });

  describe('Configuration Methods', () => {
    beforeEach(() => {
      movementSystem.setPlayer(testPlayer);
    });

    it('should set movement speed with validation', () => {
      movementSystem.setMovementSpeed(300);
      expect(movementSystem.getMovementSpeed()).toBe(300);
      expect(movementSystem.getPlayer()!.tacticalSpeed).toBe(300);
    });

    it('should reject invalid movement speeds', () => {
      expect(() => movementSystem.setMovementSpeed(1000)).toThrow();
      expect(() => movementSystem.setMovementSpeed(10)).toThrow();
    });

    it('should set grid size with validation', () => {
      movementSystem.setGridSize(48);
      expect(movementSystem.getGridSize()).toBe(48);
    });

    it('should reject invalid grid sizes', () => {
      expect(() => movementSystem.setGridSize(100)).toThrow();
      expect(() => movementSystem.setGridSize(8)).toThrow();
      expect(() => movementSystem.setGridSize(33)).toThrow(); // Odd number
    });

    it('should toggle grid mode', () => {
      expect(movementSystem.isGridModeEnabled()).toBe(false);

      movementSystem.enableGridMode(true);
      expect(movementSystem.isGridModeEnabled()).toBe(true);
      expect(movementSystem.getPlayer()!.movementMode).toBe('grid');

      movementSystem.enableGridMode(false);
      expect(movementSystem.isGridModeEnabled()).toBe(false);
      expect(movementSystem.getPlayer()!.movementMode).toBe('smooth');
    });
  });

  describe('State Query Methods', () => {
    beforeEach(() => {
      movementSystem.setPlayer(testPlayer);
    });

    it('should return correct player position', () => {
      const position = movementSystem.getPlayerPosition();
      expect(position.x).toBe(100);
      expect(position.y).toBe(100);
    });

    it('should return correct velocity', () => {
      // Mock input processor to return right movement
      mockInputProcessor.processMovementInput.mockReturnValue(
        new Vector2(1, 0)
      );
      movementSystem.update(16, mockInputManager);

      const velocity = movementSystem.getPlayerVelocity();
      expect(velocity.x).toBeGreaterThan(0);
      expect(velocity.y).toBe(0);
    });

    it('should return movement state correctly', () => {
      expect(movementSystem.isPlayerMoving()).toBe(false);

      // Start movement
      mockInputProcessor.processMovementInput.mockReturnValue(
        new Vector2(1, 0)
      );
      movementSystem.update(16, mockInputManager);

      expect(movementSystem.isPlayerMoving()).toBe(true);
    });
  });

  describe('Legacy Compatibility', () => {
    beforeEach(() => {
      movementSystem.setPlayer(testPlayer);
    });

    it('should support legacy getMoveSpeed method', () => {
      expect(movementSystem.getMoveSpeed()).toBe(200);
    });

    it('should support legacy setMoveSpeed method', () => {
      movementSystem.setMoveSpeed(250);
      expect(movementSystem.getMoveSpeed()).toBe(250);
    });

    it('should support collision enable/disable', () => {
      expect(movementSystem.isCollisionEnabled()).toBe(true);

      movementSystem.enableCollision(false);
      expect(movementSystem.isCollisionEnabled()).toBe(false);
    });

    it('should support teleportPlayer method', () => {
      movementSystem.teleportPlayer(200, 300);

      const position = movementSystem.getPlayerPosition();
      expect(position.x).toBe(200);
      expect(position.y).toBe(300);
      expect(movementSystem.isPlayerMoving()).toBe(false);
    });

    it('should support stop method', () => {
      // Start movement
      mockInputProcessor.processMovementInput.mockReturnValue(
        new Vector2(1, 0)
      );
      movementSystem.update(16, mockInputManager);
      expect(movementSystem.isPlayerMoving()).toBe(true);

      // Stop movement
      movementSystem.stop();
      expect(movementSystem.isPlayerMoving()).toBe(false);
      const velocity = movementSystem.getPlayerVelocity();
      expect(velocity.x).toBe(0);
      expect(velocity.y).toBe(0);
    });
  });

  describe('Event Emission', () => {
    beforeEach(() => {
      movementSystem.setPlayer(testPlayer);
      // Mock window.dispatchEvent
      vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true);
    });

    it('should emit movement events when position changes', () => {
      // Mock input processor to return right movement
      mockInputProcessor.processMovementInput.mockReturnValue(
        new Vector2(1, 0)
      );

      movementSystem.update(16, mockInputManager);

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tacticalMovement',
          detail: expect.objectContaining({
            playerId: 'test-player',
            position: expect.any(Vector2),
            direction: expect.any(Vector2),
            speed: 200,
            movementMode: 'smooth',
          }),
        })
      );

      // Should also emit legacy event for compatibility
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'playerMovement',
          detail: expect.objectContaining({
            playerId: 'test-player',
            position: expect.any(Object),
            velocity: expect.any(Object),
            isMoving: true,
          }),
        })
      );
    });

    it('should not emit events when position does not change', () => {
      // No input, no movement - input processor returns zero vector by default
      movementSystem.update(16, mockInputManager);

      expect(window.dispatchEvent).not.toHaveBeenCalled();
    });
  });

  describe('Debug Information', () => {
    beforeEach(() => {
      movementSystem.setPlayer(testPlayer);
    });

    it('should return comprehensive debug info', () => {
      const debugInfo = movementSystem.getDebugInfo();

      expect(debugInfo).toMatchObject({
        position: expect.any(Object),
        velocity: expect.any(Object),
        speed: 200,
        isMoving: false,
        movementMode: 'smooth',
        collisionEnabled: true,
        gridMode: false,
        gridSize: 32,
        instantMovement: true,
      });
    });

    it('should return null debug info when no player', () => {
      const systemWithoutPlayer = new TacticalMovementSystem();
      expect(systemWithoutPlayer.getDebugInfo()).toBeNull();
    });
  });

  describe('World System Integration', () => {
    beforeEach(() => {
      movementSystem.setPlayer(testPlayer);
    });

    it('should update world system when player moves', () => {
      // Mock input processor to return right movement
      mockInputProcessor.processMovementInput.mockReturnValue(
        new Vector2(1, 0)
      );

      movementSystem.update(16, mockInputManager);

      expect(mockWorldSystem.updatePlayer).toHaveBeenCalledWith(
        'test-player',
        expect.objectContaining({
          position: expect.any(Object),
        })
      );
    });

    it('should handle missing world system gracefully', () => {
      const systemWithoutWorld = new TacticalMovementSystem();
      systemWithoutWorld.setPlayer(testPlayer);

      // Mock the input processor for this system to return movement
      const systemInputProcessor = (systemWithoutWorld as any).inputProcessor;
      systemInputProcessor.processMovementInput.mockReturnValue(
        new Vector2(1, 0)
      );

      // Should not throw error
      expect(() => {
        systemWithoutWorld.update(16, mockInputManager);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle update without player gracefully', () => {
      expect(() => {
        movementSystem.update(16, mockInputManager);
      }).not.toThrow();
    });

    it('should handle collision check errors gracefully', () => {
      movementSystem.setPlayer(testPlayer);
      mockWorldSystem.isBlocked.mockImplementation(() => {
        throw new Error('Collision check failed');
      });

      // Mock input processor to return right movement
      mockInputProcessor.processMovementInput.mockReturnValue(
        new Vector2(1, 0)
      );

      // Should not throw error and should continue movement
      expect(() => {
        movementSystem.update(16, mockInputManager);
      }).not.toThrow();
    });
  });
});
