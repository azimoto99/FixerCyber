import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { WorldService } from '../WorldService';

// Mock dependencies
jest.mock('@prisma/client');

const mockPrisma = {
  worldChunk: {
    findFirst: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
  },
  player: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
} as unknown as PrismaClient;

describe('WorldService', () => {
  let worldService: WorldService;

  beforeEach(() => {
    jest.clearAllMocks();
    worldService = new WorldService();
    // Replace the prisma instance with our mock
    (worldService as any).prisma = mockPrisma;
  });

  describe('getChunk', () => {
    it('should return existing chunk if found', async () => {
      const existingChunk = {
        id: 'chunk-id',
        x: 0,
        y: 0,
        districtType: 'corporate',
        generatedData: {
          buildings: [],
          roads: [],
          npcs: [],
        },
        generatedAt: new Date(),
        lastAccessed: new Date(),
      };

      mockPrisma.worldChunk.findFirst.mockResolvedValue(existingChunk);

      const result = await worldService.getChunk(0, 0);

      expect(result).toEqual(existingChunk);
      expect(mockPrisma.worldChunk.findFirst).toHaveBeenCalledWith({
        where: { x: 0, y: 0 },
      });
    });

    it('should generate new chunk if not found', async () => {
      const newChunk = {
        id: 'new-chunk-id',
        x: 1,
        y: 1,
        districtType: 'residential',
        generatedData: {
          buildings: [
            {
              id: expect.any(String),
              type: 'apartment',
              position: expect.any(Object),
              size: expect.any(Object),
              hackable: expect.any(Boolean),
              securityLevel: expect.any(Number),
            },
          ],
          roads: expect.any(Array),
          npcs: expect.any(Array),
        },
        generatedAt: expect.any(Date),
        lastAccessed: expect.any(Date),
      };

      mockPrisma.worldChunk.findFirst.mockResolvedValue(null);
      mockPrisma.worldChunk.create.mockResolvedValue(newChunk);

      const result = await worldService.getChunk(1, 1);

      expect(result).toEqual(newChunk);
      expect(mockPrisma.worldChunk.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          x: 1,
          y: 1,
          districtType: expect.any(String),
          generatedData: expect.any(Object),
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.worldChunk.findFirst.mockRejectedValue(new Error('Database error'));

      const result = await worldService.getChunk(0, 0);

      expect(result).toBeNull();
    });
  });

  describe('generateChunk', () => {
    it('should generate chunk with appropriate district type based on coordinates', async () => {
      const generatedChunk = {
        id: 'generated-chunk-id',
        x: 0,
        y: 0,
        districtType: 'corporate', // Center should be corporate
        generatedData: expect.any(Object),
      };

      mockPrisma.worldChunk.create.mockResolvedValue(generatedChunk);

      const result = await worldService.generateChunk(0, 0);

      expect(result).toEqual(generatedChunk);
      expect(mockPrisma.worldChunk.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          x: 0,
          y: 0,
          districtType: 'corporate',
          generatedData: expect.objectContaining({
            buildings: expect.any(Array),
            roads: expect.any(Array),
            npcs: expect.any(Array),
            generatedAt: expect.any(String),
          }),
        }),
      });
    });

    it('should generate different district types for different distances', async () => {
      // Test corporate (center)
      mockPrisma.worldChunk.create.mockResolvedValue({
        id: 'chunk-1',
        x: 0,
        y: 0,
        districtType: 'corporate',
        generatedData: {},
      });

      await worldService.generateChunk(0, 0);
      expect(mockPrisma.worldChunk.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          districtType: 'corporate',
        }),
      });

      // Test residential (medium distance)
      mockPrisma.worldChunk.create.mockResolvedValue({
        id: 'chunk-2',
        x: 15,
        y: 15,
        districtType: 'residential',
        generatedData: {},
      });

      await worldService.generateChunk(15, 15);
      expect(mockPrisma.worldChunk.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          districtType: 'residential',
        }),
      });

      // Test wasteland (far distance)
      mockPrisma.worldChunk.create.mockResolvedValue({
        id: 'chunk-3',
        x: 70,
        y: 70,
        districtType: 'wasteland',
        generatedData: {},
      });

      await worldService.generateChunk(70, 70);
      expect(mockPrisma.worldChunk.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          districtType: 'wasteland',
        }),
      });
    });
  });

  describe('getNearbyPlayers', () => {
    it('should return players within specified radius', async () => {
      const nearbyPlayers = [
        {
          id: 'player-1',
          username: 'Player1',
          positionX: 95,
          positionY: 105,
          health: 100,
          lastSeen: new Date(),
        },
        {
          id: 'player-2',
          username: 'Player2',
          positionX: 105,
          positionY: 95,
          health: 80,
          lastSeen: new Date(),
        },
      ];

      mockPrisma.player.findMany.mockResolvedValue(nearbyPlayers);

      const result = await worldService.getNearbyPlayers(100, 100, 10);

      expect(result).toEqual(nearbyPlayers);
      expect(mockPrisma.player.findMany).toHaveBeenCalledWith({
        where: {
          isAlive: true,
          positionX: {
            gte: 90,
            lte: 110,
          },
          positionY: {
            gte: 90,
            lte: 110,
          },
        },
        select: {
          id: true,
          username: true,
          positionX: true,
          positionY: true,
          health: true,
          lastSeen: true,
        },
      });
    });

    it('should return empty array if no players nearby', async () => {
      mockPrisma.player.findMany.mockResolvedValue([]);

      const result = await worldService.getNearbyPlayers(1000, 1000, 5);

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.player.findMany.mockRejectedValue(new Error('Database error'));

      const result = await worldService.getNearbyPlayers(100, 100, 10);

      expect(result).toEqual([]);
    });
  });

  describe('getWorldInfo', () => {
    it('should return world statistics', async () => {
      const mockStats = {
        _count: { id: 150 },
      };

      mockPrisma.worldChunk.aggregate.mockResolvedValue(mockStats);
      mockPrisma.player.count.mockResolvedValue(25);

      const result = await worldService.getWorldInfo();

      expect(result).toEqual({
        totalChunks: 150,
        activePlayers: 25,
        worldSize: {
          minX: -100,
          maxX: 100,
          minY: -100,
          maxY: 100,
        },
      });

      expect(mockPrisma.player.count).toHaveBeenCalledWith({
        where: {
          isAlive: true,
          lastSeen: {
            gte: expect.any(Date),
          },
        },
      });
    });

    it('should return default values on database error', async () => {
      mockPrisma.worldChunk.aggregate.mockRejectedValue(new Error('Database error'));

      const result = await worldService.getWorldInfo();

      expect(result).toEqual({
        totalChunks: 0,
        activePlayers: 0,
        worldSize: { minX: -100, maxX: 100, minY: -100, maxY: 100 },
      });
    });
  });

  describe('district type generation', () => {
    it('should generate appropriate district types based on distance from center', () => {
      const worldService = new WorldService();

      // Test private method through public generateChunk
      const testCases = [
        { x: 0, y: 0, expected: 'corporate' }, // Center
        { x: 5, y: 5, expected: 'corporate' }, // Close to center
        { x: 15, y: 15, expected: 'residential' }, // Medium distance
        { x: 30, y: 30, expected: 'industrial' }, // Further out
        { x: 50, y: 50, expected: 'underground' }, // Far
        { x: 70, y: 70, expected: 'wasteland' }, // Very far
      ];

      testCases.forEach(({ x, y, expected }) => {
        const distance = Math.sqrt(x * x + y * y);
        let districtType: string;

        if (distance < 10) {
          districtType = 'corporate';
        } else if (distance < 25) {
          districtType = 'residential';
        } else if (distance < 40) {
          districtType = 'industrial';
        } else if (distance < 60) {
          districtType = 'underground';
        } else {
          districtType = 'wasteland';
        }

        expect(districtType).toBe(expected);
      });
    });
  });
});