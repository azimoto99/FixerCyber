import { PrismaClient } from '@prisma/client';
import { WorldManager } from '../game/WorldManager';
import { Vector2, WorldChunk } from '../types';

export class WorldService {
  private prisma: PrismaClient;
  private worldManager: WorldManager;

  constructor() {
    this.prisma = new PrismaClient();
    this.worldManager = new WorldManager();
  }

  /**
   * Get a chunk at the specified coordinates
   */
  async getChunk(x: number, y: number): Promise<WorldChunk | null> {
    return await this.worldManager.getChunk(x, y);
  }

  /**
   * Get chunks in a radius around a position
   */
  async getChunksInRadius(centerX: number, centerY: number, radius: number): Promise<WorldChunk[]> {
    return await this.worldManager.getChunksInRadius(centerX, centerY, radius);
  }

  /**
   * Find a path between two points
   */
  async findPath(start: Vector2, end: Vector2): Promise<Vector2[]> {
    // Get chunks that might contain the path
    const maxDistance = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
    const chunks = await this.worldManager.getChunksInRadius(
      (start.x + end.x) / 2, 
      (start.y + end.y) / 2, 
      maxDistance + 100
    );
    
    return this.worldManager.findPath(start, end, chunks);
  }

  /**
   * Unload a chunk from cache
   */
  unloadChunk(x: number, y: number): void {
    this.worldManager.unloadChunk(x, y);
  }

  /**
   * Get nearby players
   */
  async getNearbyPlayers(x: number, y: number, radius: number) {
    try {
      const players = await this.prisma.player.findMany({
        where: {
          isAlive: true,
          positionX: {
            gte: x - radius,
            lte: x + radius,
          },
          positionY: {
            gte: y - radius,
            lte: y + radius,
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

      return players;
    } catch (error) {
      console.error('Get nearby players error:', error);
      return [];
    }
  }

  /**
   * Get world information and statistics
   */
  async getWorldInfo() {
    try {
      const worldStats = await this.worldManager.getWorldStats();
      
      const activePlayers = await this.prisma.player.count({
        where: {
          isAlive: true,
          lastSeen: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // Active in last 5 minutes
          },
        },
      });

      return {
        totalChunks: worldStats.totalChunks,
        chunksByDistrict: worldStats.chunksByDistrict,
        cachedChunks: worldStats.cachedChunks,
        activePlayers,
        worldSize: {
          minX: -100,
          maxX: 100,
          minY: -100,
          maxY: 100,
        },
      };
    } catch (error) {
      console.error('Get world info error:', error);
      return {
        totalChunks: 0,
        chunksByDistrict: {},
        cachedChunks: 0,
        activePlayers: 0,
        worldSize: { minX: -100, maxX: 100, minY: -100, maxY: 100 },
      };
    }
  }

  /**
   * Get world statistics
   */
  async getWorldStats() {
    return await this.worldManager.getWorldStats();
  }

  /**
   * Check if a position is walkable
   */
  async isWalkable(x: number, y: number): Promise<boolean> {
    const chunkX = Math.floor(x / 64);
    const chunkY = Math.floor(y / 64);
    const chunk = await this.getChunk(chunkX, chunkY);
    
    if (!chunk) return false;
    
    const localX = x % 64;
    const localY = y % 64;
    
    if (localX < 0 || localX >= 64 || localY < 0 || localY >= 64) {
      return false;
    }
    
    return chunk.generatedData.tiles[localX][localY].walkable;
  }

  /**
   * Get tile information at a specific position
   */
  async getTileAt(x: number, y: number) {
    const chunkX = Math.floor(x / 64);
    const chunkY = Math.floor(y / 64);
    const chunk = await this.getChunk(chunkX, chunkY);
    
    if (!chunk) return null;
    
    const localX = x % 64;
    const localY = y % 64;
    
    if (localX < 0 || localX >= 64 || localY < 0 || localY >= 64) {
      return null;
    }
    
    return chunk.generatedData.tiles[localX][localY];
  }

  /**
   * Get buildings in a specific area
   */
  async getBuildingsInArea(x: number, y: number, width: number, height: number) {
    const chunks = await this.getChunksInRadius(x + width/2, y + height/2, Math.max(width, height));
    const buildings = [];
    
    for (const chunk of chunks) {
      for (const building of chunk.generatedData.buildings) {
        if (building.position.x >= x && building.position.x <= x + width &&
            building.position.y >= y && building.position.y <= y + height) {
          buildings.push(building);
        }
      }
    }
    
    return buildings;
  }

  /**
   * Get roads in a specific area
   */
  async getRoadsInArea(x: number, y: number, width: number, height: number) {
    const chunks = await this.getChunksInRadius(x + width/2, y + height/2, Math.max(width, height));
    const roads = [];
    
    for (const chunk of chunks) {
      for (const road of chunk.generatedData.roads) {
        // Check if road intersects with the area
        for (const point of road.points) {
          if (point.x >= x && point.x <= x + width &&
              point.y >= y && point.y <= y + height) {
            roads.push(road);
            break;
          }
        }
      }
    }
    
    return roads;
  }

  /**
   * Get NPCs in a specific area
   */
  async getNPCsInArea(x: number, y: number, radius: number) {
    const chunks = await this.getChunksInRadius(x, y, radius);
    const npcs = [];
    
    for (const chunk of chunks) {
      for (const npc of chunk.generatedData.npcs) {
        const distance = Math.sqrt(
          Math.pow(npc.position.x - x, 2) + Math.pow(npc.position.y - y, 2)
        );
        if (distance <= radius) {
          npcs.push(npc);
        }
      }
    }
    
    return npcs;
  }

  /**
   * Get loot spawns in a specific area
   */
  async getLootSpawnsInArea(x: number, y: number, radius: number) {
    const chunks = await this.getChunksInRadius(x, y, radius);
    const lootSpawns = [];
    
    for (const chunk of chunks) {
      for (const lootSpawn of chunk.generatedData.lootSpawns) {
        const distance = Math.sqrt(
          Math.pow(lootSpawn.position.x - x, 2) + Math.pow(lootSpawn.position.y - y, 2)
        );
        if (distance <= radius) {
          lootSpawns.push(lootSpawn);
        }
      }
    }
    
    return lootSpawns;
  }
}
