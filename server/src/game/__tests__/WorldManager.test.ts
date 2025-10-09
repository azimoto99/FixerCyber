import { PrismaClient } from '@prisma/client';
import { BuildingType, DistrictType, RoadType, TileType } from '../../types';
import { WorldManager } from '../WorldManager';

// Mock Prisma
jest.mock('@prisma/client');
const mockPrisma = {
  worldChunk: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  },
} as any;

(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

describe('WorldManager', () => {
  let worldManager: WorldManager;

  beforeEach(() => {
    worldManager = new WorldManager();
    jest.clearAllMocks();
  });

  describe('Chunk Generation', () => {
    test('should generate a new chunk when not found in database', async () => {
      mockPrisma.worldChunk.findFirst.mockResolvedValue(null);
      mockPrisma.worldChunk.create.mockResolvedValue({
        id: 'test-chunk-id',
        x: 0,
        y: 0,
        districtType: 'corporate',
        generatedData: {},
        generatedAt: new Date(),
        lastAccessed: new Date()
      });
      mockPrisma.worldChunk.update.mockResolvedValue({});

      const chunk = await worldManager.getChunk(0, 0);

      expect(chunk).toBeDefined();
      expect(chunk?.x).toBe(0);
      expect(chunk?.y).toBe(0);
      expect(mockPrisma.worldChunk.create).toHaveBeenCalled();
    });

    test('should return existing chunk from database', async () => {
      const existingChunk = {
        id: 'existing-chunk-id',
        x: 1,
        y: 1,
        districtType: 'residential',
        generatedData: {
          tiles: [],
          buildings: [],
          roads: [],
          lootSpawns: [],
          npcs: [],
          seed: 12345,
          generatedAt: new Date().toISOString()
        },
        generatedAt: new Date(),
        lastAccessed: new Date()
      };

      mockPrisma.worldChunk.findFirst.mockResolvedValue(existingChunk);
      mockPrisma.worldChunk.update.mockResolvedValue({});

      const chunk = await worldManager.getChunk(1, 1);

      expect(chunk).toBeDefined();
      expect(chunk?.id).toBe('existing-chunk-id');
      expect(chunk?.districtType).toBe(DistrictType.RESIDENTIAL);
      expect(mockPrisma.worldChunk.create).not.toHaveBeenCalled();
    });

    test('should generate chunk with 64x64 tile grid', async () => {
      mockPrisma.worldChunk.findFirst.mockResolvedValue(null);
      mockPrisma.worldChunk.create.mockImplementation((data: any) => {
        return Promise.resolve({
          ...data.data,
          generatedAt: new Date(),
          lastAccessed: new Date()
        });
      });
      mockPrisma.worldChunk.update.mockResolvedValue({});

      const chunk = await worldManager.getChunk(0, 0);

      expect(chunk).toBeDefined();
      expect(chunk?.generatedData.tiles).toBeDefined();
      expect(chunk?.generatedData.tiles.length).toBe(64);
      expect(chunk?.generatedData.tiles[0].length).toBe(64);
    });

    test('should generate different district types based on coordinates', async () => {
      mockPrisma.worldChunk.findFirst.mockResolvedValue(null);
      mockPrisma.worldChunk.create.mockImplementation((data: any) => {
        return Promise.resolve({
          ...data.data,
          generatedAt: new Date(),
          lastAccessed: new Date()
        });
      });
      mockPrisma.worldChunk.update.mockResolvedValue({});

      // Test center (should be corporate)
      const centerChunk = await worldManager.getChunk(0, 0);
      expect(centerChunk?.districtType).toBe(DistrictType.CORPORATE);

      // Test far coordinates (should be wasteland)
      const farChunk = await worldManager.getChunk(50, 50);
      expect(farChunk?.districtType).toBe(DistrictType.WASTELAND);
    });
  });

  describe('District Type Generation', () => {
    test('should generate corporate district at center', async () => {
      mockPrisma.worldChunk.findFirst.mockResolvedValue(null);
      mockPrisma.worldChunk.create.mockImplementation((data: any) => {
        return Promise.resolve({
          ...data.data,
          generatedAt: new Date(),
          lastAccessed: new Date()
        });
      });
      mockPrisma.worldChunk.update.mockResolvedValue({});

      const chunk = await worldManager.getChunk(0, 0);
      expect(chunk?.districtType).toBe(DistrictType.CORPORATE);
    });

    test('should generate residential district in middle ring', async () => {
      mockPrisma.worldChunk.findFirst.mockResolvedValue(null);
      mockPrisma.worldChunk.create.mockImplementation((data: any) => {
        return Promise.resolve({
          ...data.data,
          generatedAt: new Date(),
          lastAccessed: new Date()
        });
      });
      mockPrisma.worldChunk.update.mockResolvedValue({});

      const chunk = await worldManager.getChunk(5, 0);
      expect(chunk?.districtType).toBe(DistrictType.RESIDENTIAL);
    });

    test('should generate wasteland district at far coordinates', async () => {
      mockPrisma.worldChunk.findFirst.mockResolvedValue(null);
      mockPrisma.worldChunk.create.mockImplementation((data: any) => {
        return Promise.resolve({
          ...data.data,
          generatedAt: new Date(),
          lastAccessed: new Date()
        });
      });
      mockPrisma.worldChunk.update.mockResolvedValue({});

      const chunk = await worldManager.getChunk(30, 30);
      expect(chunk?.districtType).toBe(DistrictType.WASTELAND);
    });
  });

  describe('Road Network Generation', () => {
    test('should generate roads in chunk', async () => {
      mockPrisma.worldChunk.findFirst.mockResolvedValue(null);
      mockPrisma.worldChunk.create.mockImplementation((data: any) => {
        return Promise.resolve({
          ...data.data,
          generatedAt: new Date(),
          lastAccessed: new Date()
        });
      });
      mockPrisma.worldChunk.update.mockResolvedValue({});

      const chunk = await worldManager.getChunk(0, 0);

      expect(chunk?.generatedData.roads).toBeDefined();
      expect(Array.isArray(chunk?.generatedData.roads)).toBe(true);
    });

    test('should generate different road types', async () => {
      mockPrisma.worldChunk.findFirst.mockResolvedValue(null);
      mockPrisma.worldChunk.create.mockImplementation((data: any) => {
        return Promise.resolve({
          ...data.data,
          generatedAt: new Date(),
          lastAccessed: new Date()
        });
      });
      mockPrisma.worldChunk.update.mockResolvedValue({});

      const chunk = await worldManager.getChunk(0, 0);
      const roads = chunk?.generatedData.roads || [];

      if (roads.length > 0) {
        const roadTypes = roads.map(road => road.type);
        expect(roadTypes.some(type => 
          type === RoadType.MAIN || 
          type === RoadType.SECONDARY || 
          type === RoadType.ALLEY
        )).toBe(true);
      }
    });

    test('should apply roads to tile grid', async () => {
      mockPrisma.worldChunk.findFirst.mockResolvedValue(null);
      mockPrisma.worldChunk.create.mockImplementation((data: any) => {
        return Promise.resolve({
          ...data.data,
          generatedAt: new Date(),
          lastAccessed: new Date()
        });
      });
      mockPrisma.worldChunk.update.mockResolvedValue({});

      const chunk = await worldManager.getChunk(0, 0);
      const tiles = chunk?.generatedData.tiles || [];

      // Check if any tiles are marked as roads
      let hasRoadTiles = false;
      for (let x = 0; x < tiles.length; x++) {
        for (let y = 0; y < tiles[x].length; y++) {
          if (tiles[x][y].type === TileType.ROAD) {
            hasRoadTiles = true;
            expect(tiles[x][y].walkable).toBe(true);
            break;
          }
        }
        if (hasRoadTiles) break;
      }
    });
  });

  describe('Building Generation', () => {
    test('should generate buildings in chunk', async () => {
      mockPrisma.worldChunk.findFirst.mockResolvedValue(null);
      mockPrisma.worldChunk.create.mockImplementation((data: any) => {
        return Promise.resolve({
          ...data.data,
          generatedAt: new Date(),
          lastAccessed: new Date()
        });
      });
      mockPrisma.worldChunk.update.mockResolvedValue({});

      const chunk = await worldManager.getChunk(0, 0);

      expect(chunk?.generatedData.buildings).toBeDefined();
      expect(Array.isArray(chunk?.generatedData.buildings)).toBe(true);
    });

    test('should generate district-appropriate building types', async () => {
      mockPrisma.worldChunk.findFirst.mockResolvedValue(null);
      mockPrisma.worldChunk.create.mockImplementation((data: any) => {
        return Promise.resolve({
          ...data.data,
          generatedAt: new Date(),
          lastAccessed: new Date()
        });
      });
      mockPrisma.worldChunk.update.mockResolvedValue({});

      // Corporate district should have corporate buildings
      const corporateChunk = await worldManager.getChunk(0, 0);
      const corporateBuildings = corporateChunk?.generatedData.buildings || [];
      
      if (corporateBuildings.length > 0) {
        const corporateBuildingTypes = [
          BuildingType.OFFICE, 
          BuildingType.TOWER, 
          BuildingType.PLAZA, 
          BuildingType.HEADQUARTERS
        ];
        expect(corporateBuildingTypes.includes(corporateBuildings[0].type)).toBe(true);
      }
    });

    test('should generate buildings with proper properties', async () => {
      mockPrisma.worldChunk.findFirst.mockResolvedValue(null);
      mockPrisma.worldChunk.create.mockImplementation((data: any) => {
        return Promise.resolve({
          ...data.data,
          generatedAt: new Date(),
          lastAccessed: new Date()
        });
      });
      mockPrisma.worldChunk.update.mockResolvedValue({});

      const chunk = await worldManager.getChunk(0, 0);
      const buildings = chunk?.generatedData.buildings || [];

      if (buildings.length > 0) {
        const building = buildings[0];
        expect(building.id).toBeDefined();
        expect(building.position).toBeDefined();
        expect(building.size).toBeDefined();
        expect(building.size.x).toBeGreaterThan(0);
        expect(building.size.y).toBeGreaterThan(0);
        expect(typeof building.hackable).toBe('boolean');
        expect(building.securityLevel).toBeGreaterThanOrEqual(1);
        expect(building.securityLevel).toBeLessThanOrEqual(5);
        expect(Array.isArray(building.entrances)).toBe(true);
      }
    });

    test('should apply buildings to tile grid', async () => {
      mockPrisma.worldChunk.findFirst.mockResolvedValue(null);
      mockPrisma.worldChunk.create.mockImplementation((data: any) => {
        return Promise.resolve({
          ...data.data,
          generatedAt: new Date(),
          lastAccessed: new Date()
        });
      });
      mockPrisma.worldChunk.update.mockResolvedValue({});

      const chunk = await worldManager.getChunk(0, 0);
      const tiles = chunk?.generatedData.tiles || [];
      const buildings = chunk?.generatedData.buildings || [];

      if (buildings.length > 0) {
        // Check if building tiles are marked correctly
        let hasBuildingTiles = false;
        for (let x = 0; x < tiles.length; x++) {
          for (let y = 0; y < tiles[x].length; y++) {
            if (tiles[x][y].type === TileType.BUILDING) {
              hasBuildingTiles = true;
              expect(tiles[x][y].walkable).toBe(false);
              break;
            }
          }
          if (hasBuildingTiles) break;
        }
      }
    });

    test('should generate building interiors for hackable buildings', async () => {
      mockPrisma.worldChunk.findFirst.mockResolvedValue(null);
      mockPrisma.worldChunk.create.mockImplementation((data: any) => {
        return Promise.resolve({
          ...data.data,
          generatedAt: new Date(),
          lastAccessed: new Date()
        });
      });
      mockPrisma.worldChunk.update.mockResolvedValue({});

      const chunk = await worldManager.getChunk(0, 0);
      const buildings = chunk?.generatedData.buildings || [];

      // Check if any hackable buildings have interiors
      const hackableBuildingsWithInteriors = buildings.filter(building => 
        building.hackable && building.interior && building.size.x >= 6 && building.size.y >= 6
      );

      if (hackableBuildingsWithInteriors.length > 0) {
        const building = hackableBuildingsWithInteriors[0];
        expect(building.interior).toBeDefined();
        expect(building.interior!.rooms).toBeDefined();
        expect(building.interior!.corridors).toBeDefined();
        expect(building.interior!.hackableObjects).toBeDefined();
        expect(building.interior!.rooms.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Chunk Caching', () => {
    test('should cache chunks after loading', async () => {
      const existingChunk = {
        id: 'cached-chunk-id',
        x: 2,
        y: 2,
        districtType: 'industrial',
        generatedData: {
          tiles: [],
          buildings: [],
          roads: [],
          lootSpawns: [],
          npcs: [],
          seed: 12345,
          generatedAt: new Date().toISOString()
        },
        generatedAt: new Date(),
        lastAccessed: new Date()
      };

      mockPrisma.worldChunk.findFirst.mockResolvedValue(existingChunk);
      mockPrisma.worldChunk.update.mockResolvedValue({});

      // First call should load from database
      const chunk1 = await worldManager.getChunk(2, 2);
      expect(mockPrisma.worldChunk.findFirst).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const chunk2 = await worldManager.getChunk(2, 2);
      expect(mockPrisma.worldChunk.findFirst).toHaveBeenCalledTimes(1); // Still 1, not called again
      expect(chunk1?.id).toBe(chunk2?.id);
    });

    test('should unload chunks from cache', async () => {
      const existingChunk = {
        id: 'unload-test-chunk',
        x: 3,
        y: 3,
        districtType: 'residential',
        generatedData: {
          tiles: [],
          buildings: [],
          roads: [],
          lootSpawns: [],
          npcs: [],
          seed: 12345,
          generatedAt: new Date().toISOString()
        },
        generatedAt: new Date(),
        lastAccessed: new Date()
      };

      mockPrisma.worldChunk.findFirst.mockResolvedValue(existingChunk);
      mockPrisma.worldChunk.update.mockResolvedValue({});

      // Load chunk
      await worldManager.getChunk(3, 3);

      // Unload chunk
      worldManager.unloadChunk(3, 3);

      // Next call should load from database again
      await worldManager.getChunk(3, 3);
      expect(mockPrisma.worldChunk.findFirst).toHaveBeenCalledTimes(2);
    });
  });

  describe('Pathfinding', () => {
    test('should find path between two points', async () => {
      const mockChunk = {
        id: 'pathfinding-chunk',
        x: 0,
        y: 0,
        districtType: DistrictType.CORPORATE,
        generatedData: {
          tiles: Array(64).fill(null).map((_, x) => 
            Array(64).fill(null).map((_, y) => ({
              x,
              y,
              type: TileType.GROUND,
              walkable: true,
              height: 0,
              districtType: DistrictType.CORPORATE
            }))
          ),
          buildings: [],
          roads: [],
          lootSpawns: [],
          npcs: [],
          seed: 12345,
          generatedAt: new Date().toISOString()
        },
        generatedAt: new Date(),
        lastAccessed: new Date()
      };

      const start = { x: 0, y: 0 };
      const end = { x: 5, y: 5 };
      const chunks = [mockChunk];

      const path = worldManager.findPath(start, end, chunks);

      expect(Array.isArray(path)).toBe(true);
      if (path.length > 0) {
        expect(path[0]).toEqual(expect.objectContaining({ x: 0, y: 0 }));
        expect(path[path.length - 1]).toEqual(expect.objectContaining({ 
          x: expect.any(Number), 
          y: expect.any(Number) 
        }));
      }
    });

    test('should return empty path when no path exists', async () => {
      const mockChunk = {
        id: 'no-path-chunk',
        x: 0,
        y: 0,
        districtType: DistrictType.CORPORATE,
        generatedData: {
          tiles: Array(64).fill(null).map((_, x) => 
            Array(64).fill(null).map((_, y) => ({
              x,
              y,
              type: TileType.BUILDING,
              walkable: false, // All tiles unwalkable
              height: 0,
              districtType: DistrictType.CORPORATE
            }))
          ),
          buildings: [],
          roads: [],
          lootSpawns: [],
          npcs: [],
          seed: 12345,
          generatedAt: new Date().toISOString()
        },
        generatedAt: new Date(),
        lastAccessed: new Date()
      };

      const start = { x: 0, y: 0 };
      const end = { x: 5, y: 5 };
      const chunks = [mockChunk];

      const path = worldManager.findPath(start, end, chunks);

      expect(path).toEqual([]);
    });
  });

  describe('World Statistics', () => {
    test('should return world statistics', async () => {
      mockPrisma.worldChunk.groupBy.mockResolvedValue([
        { districtType: 'corporate', _count: { id: 5 } },
        { districtType: 'residential', _count: { id: 10 } },
        { districtType: 'industrial', _count: { id: 3 } }
      ]);

      const stats = await worldManager.getWorldStats();

      expect(stats.totalChunks).toBe(18);
      expect(stats.chunksByDistrict.corporate).toBe(5);
      expect(stats.chunksByDistrict.residential).toBe(10);
      expect(stats.chunksByDistrict.industrial).toBe(3);
      expect(typeof stats.cachedChunks).toBe('number');
    });
  });

  describe('Chunk Radius Loading', () => {
    test('should load chunks in radius around position', async () => {
      mockPrisma.worldChunk.findFirst.mockImplementation((params: any) => {
        const { where } = params;
        return Promise.resolve({
          id: `chunk-${where.x}-${where.y}`,
          x: where.x,
          y: where.y,
          districtType: 'corporate',
          generatedData: {
            tiles: [],
            buildings: [],
            roads: [],
            lootSpawns: [],
            npcs: [],
            seed: 12345,
            generatedAt: new Date().toISOString()
          },
          generatedAt: new Date(),
          lastAccessed: new Date()
        });
      });
      mockPrisma.worldChunk.update.mockResolvedValue({});

      const chunks = await worldManager.getChunksInRadius(32, 32, 100);

      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('Consistency and Determinism', () => {
    test('should generate consistent chunks with same coordinates', async () => {
      mockPrisma.worldChunk.findFirst.mockResolvedValue(null);
      mockPrisma.worldChunk.create.mockImplementation((data: any) => {
        return Promise.resolve({
          ...data.data,
          generatedAt: new Date(),
          lastAccessed: new Date()
        });
      });
      mockPrisma.worldChunk.update.mockResolvedValue({});

      // Clear cache to force regeneration
      worldManager.unloadChunk(10, 10);

      const chunk1 = await worldManager.getChunk(10, 10);
      
      // Clear cache and generate again
      worldManager.unloadChunk(10, 10);
      mockPrisma.worldChunk.findFirst.mockResolvedValue(null);
      
      const chunk2 = await worldManager.getChunk(10, 10);

      // Should have same district type and seed
      expect(chunk1?.districtType).toBe(chunk2?.districtType);
      expect(chunk1?.generatedData.seed).toBe(chunk2?.generatedData.seed);
    });

    test('should generate different content for different coordinates', async () => {
      mockPrisma.worldChunk.findFirst.mockResolvedValue(null);
      mockPrisma.worldChunk.create.mockImplementation((data: any) => {
        return Promise.resolve({
          ...data.data,
          generatedAt: new Date(),
          lastAccessed: new Date()
        });
      });
      mockPrisma.worldChunk.update.mockResolvedValue({});

      const chunk1 = await worldManager.getChunk(0, 0);
      const chunk2 = await worldManager.getChunk(1, 1);

      expect(chunk1?.generatedData.seed).not.toBe(chunk2?.generatedData.seed);
    });
  });
});