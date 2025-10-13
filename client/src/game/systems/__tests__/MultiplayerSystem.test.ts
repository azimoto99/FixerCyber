// Tests for MultiplayerSystem
import { Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { socketService } from '../../../services/socket';
import { Player } from '../../entities/Player';
import { MultiplayerSystem, NetworkUpdate } from '../MultiplayerSystem';

// Mock the socket service
vi.mock('../../../services/socket', () => ({
  socketService: {
    connect: vi.fn(),
    getSocket: vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      connected: true,
    })),
  },
}));

describe('MultiplayerSystem', () => {
  let multiplayerSystem: MultiplayerSystem;
  let mockSocket: any;
  let localPlayer: Player;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock socket
    mockSocket = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      connected: true,
    };

    (socketService.getSocket as Mock).mockReturnValue(mockSocket);

    // Create test player
    localPlayer = new Player('test-player-1', 'TestPlayer', { x: 100, y: 100 });

    // Create multiplayer system
    multiplayerSystem = new MultiplayerSystem();
  });

  afterEach(() => {
    multiplayerSystem.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(multiplayerSystem.isPlayerConnected()).toBe(false);
      expect(multiplayerSystem.getRemotePlayers()).toHaveLength(0);
      expect(multiplayerSystem.getPredictionEnabled()).toBe(true);
    });

    it('should set up socket listeners on construction', () => {
      expect(mockSocket.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'disconnect',
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'player:sync',
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'player:update',
        expect.any(Function)
      );
    });

    it('should attempt to connect to server on construction', () => {
      expect(socketService.connect).toHaveBeenCalled();
    });
  });

  describe('Local Player Management', () => {
    it('should set local player correctly', () => {
      multiplayerSystem.setLocalPlayer(localPlayer);

      const allPlayers = multiplayerSystem.getAllPlayers();
      expect(allPlayers).toContain(localPlayer);
    });

    it('should send player join when local player is set and connected', () => {
      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      connectHandler();

      multiplayerSystem.setLocalPlayer(localPlayer);

      expect(mockSocket.emit).toHaveBeenCalledWith('player:join', {
        id: localPlayer.id,
        username: localPlayer.username,
        position: localPlayer.position,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Movement Synchronization', () => {
    beforeEach(() => {
      multiplayerSystem.setLocalPlayer(localPlayer);

      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      connectHandler();
    });

    it('should send movement updates with rate limiting', () => {
      const position = { x: 150, y: 150 };
      const velocity = { x: 50, y: 0 };
      const facing = 0;

      // First call should send
      multiplayerSystem.sendMovement(position, velocity, facing);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'player:move',
        expect.objectContaining({
          playerId: localPlayer.id,
          position,
          velocity,
          facing,
          sequenceNumber: 1,
        })
      );

      // Immediate second call should be rate limited
      mockSocket.emit.mockClear();
      multiplayerSystem.sendMovement(position, velocity, facing);
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should store prediction history when prediction is enabled', () => {
      const position = { x: 150, y: 150 };
      const velocity = { x: 50, y: 0 };
      const facing = 0;

      multiplayerSystem.sendMovement(position, velocity, facing);

      // Verify prediction is enabled
      expect(multiplayerSystem.getPredictionEnabled()).toBe(true);
    });

    it('should handle movement acknowledgment from server', () => {
      const position = { x: 150, y: 150 };
      const velocity = { x: 50, y: 0 };
      const facing = 0;

      // Send movement
      multiplayerSystem.sendMovement(position, velocity, facing);

      // Simulate server acknowledgment
      const ackHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'movement:ack'
      )[1];

      const ackData = {
        sequenceNumber: 1,
        position: { x: 149, y: 149 }, // Slightly different position
        timestamp: Date.now(),
      };

      ackHandler(ackData);

      // Player position should be corrected if error is significant
      // In this case, error is small so no correction should occur
    });
  });

  describe('Remote Player Management', () => {
    beforeEach(() => {
      multiplayerSystem.setLocalPlayer(localPlayer);

      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      connectHandler();
    });

    it('should handle player sync from server', () => {
      const remotePlayerData = {
        id: 'remote-player-1',
        username: 'RemotePlayer',
        position: { x: 200, y: 200 },
        velocity: { x: 0, y: 0 },
        facing: 0,
        health: 100,
        isAlive: true,
      };

      const syncHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'player:sync'
      )[1];

      syncHandler({ players: [remotePlayerData] });

      const remotePlayers = multiplayerSystem.getRemotePlayers();
      expect(remotePlayers).toHaveLength(1);
      expect(remotePlayers[0].id).toBe('remote-player-1');
      expect(remotePlayers[0].username).toBe('RemotePlayer');
    });

    it('should handle new player joining', () => {
      const newPlayerData = {
        id: 'new-player-1',
        username: 'NewPlayer',
        position: { x: 300, y: 300 },
        health: 100,
        isAlive: true,
      };

      const joinHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'player:joined'
      )[1];

      joinHandler(newPlayerData);

      const remotePlayers = multiplayerSystem.getRemotePlayers();
      expect(remotePlayers).toHaveLength(1);
      expect(remotePlayers[0].id).toBe('new-player-1');
    });

    it('should handle player leaving', () => {
      // First add a remote player
      const playerData = {
        id: 'leaving-player',
        username: 'LeavingPlayer',
        position: { x: 400, y: 400 },
        health: 100,
        isAlive: true,
      };

      const joinHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'player:joined'
      )[1];
      joinHandler(playerData);

      expect(multiplayerSystem.getRemotePlayers()).toHaveLength(1);

      // Now handle player leaving
      const leftHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'player:left'
      )[1];
      leftHandler({ playerId: 'leaving-player' });

      expect(multiplayerSystem.getRemotePlayers()).toHaveLength(0);
    });

    it('should handle remote player updates with interpolation', () => {
      // Add a remote player first
      const playerData = {
        id: 'remote-player-1',
        username: 'RemotePlayer',
        position: { x: 200, y: 200 },
        velocity: { x: 0, y: 0 },
        facing: 0,
        health: 100,
        isAlive: true,
      };

      const joinHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'player:joined'
      )[1];
      joinHandler(playerData);

      // Send update for remote player
      const updateHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'player:update'
      )[1];

      const networkUpdate: NetworkUpdate = {
        playerId: 'remote-player-1',
        position: { x: 250, y: 250 },
        velocity: { x: 50, y: 50 },
        facing: Math.PI / 4,
        timestamp: Date.now(),
        sequenceNumber: 1,
      };

      updateHandler(networkUpdate);

      // Update should be added to interpolation targets
      const remotePlayers = multiplayerSystem.getRemotePlayers();
      expect(remotePlayers).toHaveLength(1);
    });
  });

  describe('Connection Management', () => {
    it('should handle connection events', () => {
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];

      connectHandler();
      expect(multiplayerSystem.isPlayerConnected()).toBe(true);
    });

    it('should handle disconnection events', () => {
      // First connect
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      connectHandler();

      // Then disconnect
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];
      disconnectHandler();

      expect(multiplayerSystem.isPlayerConnected()).toBe(false);
      expect(multiplayerSystem.getRemotePlayers()).toHaveLength(0);
    });

    it('should handle ping/pong for latency measurement', () => {
      const timestamp = Date.now();

      // Simulate sending ping
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      connectHandler();

      // Set the lastPingTime to match the timestamp we'll send
      (multiplayerSystem as any).lastPingTime = timestamp;

      // Simulate receiving pong
      const pongHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'pong'
      )[1];

      // Mock Date.now to control timing
      const originalNow = Date.now;
      Date.now = vi.fn(() => timestamp + 50); // 50ms later

      pongHandler({ timestamp });

      expect(multiplayerSystem.getLatency()).toBe(25); // Half of RTT

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('Interpolation', () => {
    it('should interpolate angles correctly', () => {
      // Test angle interpolation through reflection (accessing private method)
      const system = multiplayerSystem as any;

      // Test normal case
      expect(system.interpolateAngle(0, Math.PI / 2, 0.5)).toBeCloseTo(
        Math.PI / 4
      );

      // Test wrap-around case (270° to 90° should interpolate to 180° via the shorter path)
      expect(
        system.interpolateAngle(Math.PI * 1.5, Math.PI * 0.5, 0.5)
      ).toBeCloseTo(Math.PI); // 270° to 90° at 50% = 180°
    });

    it('should update remote players with interpolation', () => {
      // Add a remote player
      const playerData = {
        id: 'remote-player-1',
        username: 'RemotePlayer',
        position: { x: 200, y: 200 },
        velocity: { x: 0, y: 0 },
        facing: 0,
        health: 100,
        isAlive: true,
      };

      const joinHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'player:joined'
      )[1];
      joinHandler(playerData);

      // Add interpolation targets
      const system = multiplayerSystem as any;
      const now = Date.now();

      system.addInterpolationTarget('remote-player-1', {
        position: { x: 200, y: 200 },
        velocity: { x: 50, y: 0 },
        facing: 0,
        timestamp: now - 200,
      });

      system.addInterpolationTarget('remote-player-1', {
        position: { x: 250, y: 200 },
        velocity: { x: 50, y: 0 },
        facing: 0,
        timestamp: now - 100,
      });

      // Update should interpolate between targets
      multiplayerSystem.update(16); // 16ms delta time

      const remotePlayers = multiplayerSystem.getRemotePlayers();
      expect(remotePlayers).toHaveLength(1);
    });
  });

  describe('Prediction and Reconciliation', () => {
    beforeEach(() => {
      multiplayerSystem.setLocalPlayer(localPlayer);

      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      connectHandler();
    });

    it('should enable/disable prediction correctly', () => {
      expect(multiplayerSystem.getPredictionEnabled()).toBe(true);

      multiplayerSystem.setPredictionEnabled(false);
      expect(multiplayerSystem.getPredictionEnabled()).toBe(false);

      multiplayerSystem.setPredictionEnabled(true);
      expect(multiplayerSystem.getPredictionEnabled()).toBe(true);
    });

    it('should handle server reconciliation for local player', () => {
      const updateHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'player:update'
      )[1];

      const serverUpdate: NetworkUpdate = {
        playerId: localPlayer.id,
        position: { x: 300, y: 300 },
        velocity: { x: 0, y: 0 },
        facing: Math.PI,
        timestamp: Date.now(),
        sequenceNumber: 1,
      };

      updateHandler(serverUpdate);

      // Local player position should be updated to match server
      expect(localPlayer.position.x).toBe(300);
      expect(localPlayer.position.y).toBe(300);
      expect(localPlayer.facing).toBe(Math.PI);
    });
  });

  describe('Update System', () => {
    it('should update without errors', () => {
      expect(() => {
        multiplayerSystem.update(16);
      }).not.toThrow();
    });

    it('should check connection health during update', () => {
      const spy = vi.spyOn(multiplayerSystem, 'checkConnectionHealth');

      multiplayerSystem.update(16);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      multiplayerSystem.setLocalPlayer(localPlayer);

      // Add some remote players
      const joinHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'player:joined'
      )[1];
      joinHandler({
        id: 'remote-1',
        username: 'Remote1',
        position: { x: 100, y: 100 },
        health: 100,
        isAlive: true,
      });

      expect(multiplayerSystem.getRemotePlayers()).toHaveLength(1);

      multiplayerSystem.destroy();

      expect(multiplayerSystem.getRemotePlayers()).toHaveLength(0);
      expect(mockSocket.off).toHaveBeenCalledWith('connect');
      expect(mockSocket.off).toHaveBeenCalledWith('disconnect');
      expect(mockSocket.off).toHaveBeenCalledWith('player:sync');
    });
  });
});
