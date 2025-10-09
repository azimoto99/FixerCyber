import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PlayerService } from '../PlayerService';

// Mock Prisma
const mockPrisma = {
  player: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  inventoryItem: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

describe('PlayerService', () => {
  let playerService: PlayerService;

  beforeEach(() => {
    jest.clearAllMocks();
    playerService = new PlayerService();
  });

  describe('getPlayer', () => {
    it('should return player data with inventory and housing', async () => {
      const mockPlayer = {
        id: 'player-id',
        userId: 'user-id',
        username: 'TestPlayer',
        positionX: 100,
        positionY: 200,
        health: 80,
        credits: 1500,
        isAlive: true,
        inventoryItems: [
          {
            id: 'item-1',
            itemType: 'weapon',
            itemData: { name: 'Pistol' },
            gridX: 0,
            gridY: 0,
          },
        ],
        housing: [
          {
            id: 'house-1',
            type: 'RESIDENTIAL',
            district: 'Downtown',
          },
        ],
      };

      mockPrisma.player.findFirst.mockResolvedValue(mockPlayer);

      const result = await playerService.getPlayer('user-id');

      expect(result).toEqual(mockPlayer);
      expect(mockPrisma.player.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        include: {
          inventoryItems: true,
          housing: true,
        },
      });
    });

    it('should return null if player not found', async () => {
      mockPrisma.player.findFirst.mockResolvedValue(null);

      const result = await playerService.getPlayer('nonexistent-user');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.player.findFirst.mockRejectedValue(new Error('Database error'));

      const result = await playerService.getPlayer('user-id');

      expect(result).toBeNull();
    });
  });

  describe('createPlayer', () => {
    it('should create a new player successfully', async () => {
      const newPlayer = {
        id: 'new-player-id',
        userId: 'user-id',
        username: 'NewPlayer',
        positionX: 0,
        positionY: 0,
        health: 100,
        credits: 0,
        isAlive: true,
      };

      mockPrisma.player.findFirst.mockResolvedValue(null); // No existing player
      mockPrisma.player.create.mockResolvedValue(newPlayer);

      const result = await playerService.createPlayer('user-id', 'NewPlayer');

      expect(result).toEqual(newPlayer);
      expect(mockPrisma.player.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-id',
          username: 'NewPlayer',
          positionX: 0,
          positionY: 0,
          health: 100,
          credits: 0,
          isAlive: true,
        }),
      });
    });

    it('should return null if player already exists', async () => {
      const existingPlayer = {
        id: 'existing-id',
        userId: 'user-id',
        username: 'ExistingPlayer',
      };

      mockPrisma.player.findFirst.mockResolvedValue(existingPlayer);

      const result = await playerService.createPlayer('user-id', 'NewPlayer');

      expect(result).toBeNull();
      expect(mockPrisma.player.create).not.toHaveBeenCalled();
    });
  });

  describe('updatePlayerPosition', () => {
    it('should update player position successfully', async () => {
      const mockPlayer = {
        id: 'player-id',
        userId: 'user-id',
        username: 'TestPlayer',
      };

      mockPrisma.player.findFirst.mockResolvedValue(mockPlayer);
      mockPrisma.player.update.mockResolvedValue({
        ...mockPlayer,
        positionX: 150,
        positionY: 250,
      });

      const result = await playerService.updatePlayerPosition('user-id', 150, 250);

      expect(result).toBe(true);
      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: 'player-id' },
        data: {
          positionX: 150,
          positionY: 250,
          lastSeen: expect.any(Date),
        },
      });
    });

    it('should return false if player not found', async () => {
      mockPrisma.player.findFirst.mockResolvedValue(null);

      const result = await playerService.updatePlayerPosition('nonexistent-user', 150, 250);

      expect(result).toBe(false);
      expect(mockPrisma.player.update).not.toHaveBeenCalled();
    });
  });

  describe('updatePlayerHealth', () => {
    it('should update player health and alive status', async () => {
      const mockPlayer = {
        id: 'player-id',
        userId: 'user-id',
        health: 100,
      };

      mockPrisma.player.findFirst.mockResolvedValue(mockPlayer);
      mockPrisma.player.update.mockResolvedValue({
        ...mockPlayer,
        health: 50,
        isAlive: true,
      });

      const result = await playerService.updatePlayerHealth('user-id', 50);

      expect(result).toBe(true);
      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: 'player-id' },
        data: {
          health: 50,
          isAlive: true,
        },
      });
    });

    it('should set isAlive to false when health reaches 0', async () => {
      const mockPlayer = {
        id: 'player-id',
        userId: 'user-id',
        health: 100,
      };

      mockPrisma.player.findFirst.mockResolvedValue(mockPlayer);
      mockPrisma.player.update.mockResolvedValue({
        ...mockPlayer,
        health: 0,
        isAlive: false,
      });

      const result = await playerService.updatePlayerHealth('user-id', 0);

      expect(result).toBe(true);
      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: 'player-id' },
        data: {
          health: 0,
          isAlive: false,
        },
      });
    });

    it('should clamp health values between 0 and 100', async () => {
      const mockPlayer = {
        id: 'player-id',
        userId: 'user-id',
        health: 50,
      };

      mockPrisma.player.findFirst.mockResolvedValue(mockPlayer);
      mockPrisma.player.update.mockResolvedValue(mockPlayer);

      // Test negative health
      await playerService.updatePlayerHealth('user-id', -10);
      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: 'player-id' },
        data: {
          health: 0,
          isAlive: false,
        },
      });

      // Test health over 100
      await playerService.updatePlayerHealth('user-id', 150);
      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: 'player-id' },
        data: {
          health: 100,
          isAlive: true,
        },
      });
    });
  });

  describe('updatePlayerCredits', () => {
    it('should update player credits successfully', async () => {
      const mockPlayer = {
        id: 'player-id',
        userId: 'user-id',
        credits: 1000,
      };

      mockPrisma.player.findFirst.mockResolvedValue(mockPlayer);
      mockPrisma.player.update.mockResolvedValue({
        ...mockPlayer,
        credits: 1500,
      });

      const result = await playerService.updatePlayerCredits('user-id', 1500);

      expect(result).toBe(true);
      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: 'player-id' },
        data: {
          credits: 1500,
        },
      });
    });

    it('should not allow negative credits', async () => {
      const mockPlayer = {
        id: 'player-id',
        userId: 'user-id',
        credits: 1000,
      };

      mockPrisma.player.findFirst.mockResolvedValue(mockPlayer);
      mockPrisma.player.update.mockResolvedValue({
        ...mockPlayer,
        credits: 0,
      });

      const result = await playerService.updatePlayerCredits('user-id', -500);

      expect(result).toBe(true);
      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: 'player-id' },
        data: {
          credits: 0,
        },
      });
    });
  });

  describe('updatePlayerInventory', () => {
    it('should replace player inventory with new items', async () => {
      const mockPlayer = {
        id: 'player-id',
        userId: 'user-id',
      };

      const newItems = [
        {
          type: 'weapon',
          data: { name: 'Rifle' },
          position: { x: 0, y: 0 },
          gridSize: { width: 2, height: 1 },
        },
        {
          type: 'ammo',
          data: { count: 30 },
          position: { x: 2, y: 0 },
          gridSize: { width: 1, height: 1 },
        },
      ];

      mockPrisma.player.findFirst.mockResolvedValue(mockPlayer);
      mockPrisma.inventoryItem.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.inventoryItem.createMany.mockResolvedValue({ count: 2 });

      const result = await playerService.updatePlayerInventory('user-id', newItems);

      expect(result).toBe(true);
      expect(mockPrisma.inventoryItem.deleteMany).toHaveBeenCalledWith({
        where: { playerId: 'player-id' },
      });
      expect(mockPrisma.inventoryItem.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            playerId: 'player-id',
            itemType: 'weapon',
            itemData: { name: 'Rifle' },
            gridX: 0,
            gridY: 0,
            gridWidth: 2,
            gridHeight: 1,
          }),
          expect.objectContaining({
            playerId: 'player-id',
            itemType: 'ammo',
            itemData: { count: 30 },
            gridX: 2,
            gridY: 0,
            gridWidth: 1,
            gridHeight: 1,
          }),
        ]),
      });
    });

    it('should handle empty inventory update', async () => {
      const mockPlayer = {
        id: 'player-id',
        userId: 'user-id',
      };

      mockPrisma.player.findFirst.mockResolvedValue(mockPlayer);
      mockPrisma.inventoryItem.deleteMany.mockResolvedValue({ count: 0 });

      const result = await playerService.updatePlayerInventory('user-id', []);

      expect(result).toBe(true);
      expect(mockPrisma.inventoryItem.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.inventoryItem.createMany).not.toHaveBeenCalled();
    });
  });
});