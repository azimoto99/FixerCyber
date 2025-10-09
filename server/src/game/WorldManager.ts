import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import {
    Building,
    BuildingType,
    ChunkData,
    DistrictType,
    LootSpawn,
    NPC,
    NPCBehavior,
    PathNode,
    Road,
    RoadType,
    Tile,
    TileType,
    Vector2,
    WorldChunk
} from '../types';
import { BuildingGenerator } from './BuildingGenerator';

export class WorldManager {
  private static readonly CHUNK_SIZE = 64; // 64x64 tiles per chunk
  private static readonly TILE_SIZE = 16; // Each tile is 16x16 pixels
  private static readonly MAX_CACHED_CHUNKS = 100;
  
  private prisma: PrismaClient;
  private chunkCache: Map<string, WorldChunk> = new Map();
  private lastCleanup: number = Date.now();
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Get a chunk at the specified coordinates, generating it if necessary
   */
  async getChunk(chunkX: number, chunkY: number): Promise<WorldChunk | null> {
    const chunkKey = this.getChunkKey(chunkX, chunkY);
    
    // Check cache first
    if (this.chunkCache.has(chunkKey)) {
      const chunk = this.chunkCache.get(chunkKey)!;
      chunk.lastAccessed = new Date();
      return chunk;
    }

    try {
      // Try to load from database
      let chunk = await this.prisma.worldChunk.findFirst({
        where: { x: chunkX, y: chunkY }
      });

      if (!chunk) {
        // Generate new chunk
        chunk = await this.generateChunk(chunkX, chunkY);
      }

      if (!chunk) {
        return null;
      }

      // Convert to proper WorldChunk type
      const worldChunk: WorldChunk = {
        id: chunk.id,
        x: chunk.x,
        y: chunk.y,
        districtType: chunk.districtType as DistrictType,
        generatedData: chunk.generatedData as unknown as ChunkData,
        generatedAt: chunk.generatedAt,
        lastAccessed: new Date()
      };

      // Cache the chunk
      this.cacheChunk(worldChunk);
      
      // Update last accessed time in database
      await this.prisma.worldChunk.update({
        where: { id: chunk.id },
        data: { lastAccessed: new Date() }
      });

      return worldChunk;
    } catch (error) {
      console.error('Error getting chunk:', error);
      return null;
    }
  }

  /**
   * Generate a new chunk with proper district type and content
   */
  async generateChunk(chunkX: number, chunkY: number): Promise<any> {
    const districtType = this.determineDistrictType(chunkX, chunkY);
    const seed = this.generateSeed(chunkX, chunkY);
    
    // Generate chunk data
    const chunkData = this.generateChunkData(chunkX, chunkY, districtType, seed);
    
    try {
      const chunk = await this.prisma.worldChunk.create({
        data: {
          id: uuidv4(),
          x: chunkX,
          y: chunkY,
          districtType,
          generatedData: chunkData as any,
          generatedAt: new Date(),
          lastAccessed: new Date()
        }
      });

      return chunk;
    } catch (error) {
      console.error('Error generating chunk:', error);
      throw error;
    }
  }

  /**
   * Generate complete chunk data including tiles, buildings, roads, etc.
   */
  private generateChunkData(chunkX: number, chunkY: number, districtType: DistrictType, seed: number): ChunkData {
    // Initialize random number generator with seed
    const rng = this.createSeededRNG(seed);
    
    // Generate base tile grid
    const tiles = this.generateTiles(chunkX, chunkY, districtType, rng);
    
    // Generate road network
    const roads = this.generateRoadNetwork(chunkX, chunkY, districtType, rng);
    
    // Update tiles with road information
    this.applyRoadsToTiles(tiles, roads);
    
    // Generate buildings along roads
    const buildings = this.generateBuildings(chunkX, chunkY, districtType, roads, tiles, rng);
    
    // Update tiles with building information
    this.applyBuildingsToTiles(tiles, buildings);
    
    // Generate loot spawns
    const lootSpawns = this.generateLootSpawns(chunkX, chunkY, districtType, buildings, rng);
    
    // Generate NPCs
    const npcs = this.generateNPCs(chunkX, chunkY, districtType, buildings, rng);

    return {
      tiles,
      buildings,
      roads,
      lootSpawns,
      npcs,
      seed,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate the base tile grid for a chunk
   */
  private generateTiles(chunkX: number, chunkY: number, districtType: DistrictType, rng: () => number): Tile[][] {
    const tiles: Tile[][] = [];
    
    for (let x = 0; x < WorldManager.CHUNK_SIZE; x++) {
      tiles[x] = [];
      for (let y = 0; y < WorldManager.CHUNK_SIZE; y++) {
        const worldX = chunkX * WorldManager.CHUNK_SIZE + x;
        const worldY = chunkY * WorldManager.CHUNK_SIZE + y;
        
        tiles[x][y] = {
          x: worldX,
          y: worldY,
          type: TileType.GROUND,
          walkable: true,
          height: this.generateHeight(worldX, worldY, districtType, rng),
          districtType
        };
      }
    }
    
    return tiles;
  }

  /**
   * Generate procedural road network for the chunk
   */
  private generateRoadNetwork(chunkX: number, chunkY: number, districtType: DistrictType, rng: () => number): Road[] {
    const roads: Road[] = [];
    const chunkWorldX = chunkX * WorldManager.CHUNK_SIZE;
    const chunkWorldY = chunkY * WorldManager.CHUNK_SIZE;

    // Generate main roads (grid-based)
    const hasVerticalMain = rng() > 0.3;
    const hasHorizontalMain = rng() > 0.3;

    if (hasVerticalMain) {
      const roadX = Math.floor(rng() * (WorldManager.CHUNK_SIZE - 16)) + 8;
      roads.push({
        id: uuidv4(),
        type: RoadType.MAIN,
        points: [
          { x: chunkWorldX + roadX, y: chunkWorldY },
          { x: chunkWorldX + roadX, y: chunkWorldY + WorldManager.CHUNK_SIZE }
        ],
        width: 8,
        connections: []
      });
    }

    if (hasHorizontalMain) {
      const roadY = Math.floor(rng() * (WorldManager.CHUNK_SIZE - 16)) + 8;
      roads.push({
        id: uuidv4(),
        type: RoadType.MAIN,
        points: [
          { x: chunkWorldX, y: chunkWorldY + roadY },
          { x: chunkWorldX + WorldManager.CHUNK_SIZE, y: chunkWorldY + roadY }
        ],
        width: 8,
        connections: []
      });
    }

    // Generate secondary roads
    const numSecondaryRoads = this.getSecondaryRoadCount(districtType, rng);
    for (let i = 0; i < numSecondaryRoads; i++) {
      const road = this.generateSecondaryRoad(chunkWorldX, chunkWorldY, rng);
      if (road) {
        roads.push(road);
      }
    }

    // Generate alleys in appropriate districts
    if (districtType === DistrictType.RESIDENTIAL || districtType === DistrictType.UNDERGROUND) {
      const numAlleys = Math.floor(rng() * 3) + 1;
      for (let i = 0; i < numAlleys; i++) {
        const alley = this.generateAlley(chunkWorldX, chunkWorldY, rng);
        if (alley) {
          roads.push(alley);
        }
      }
    }

    // Connect roads for pathfinding
    this.connectRoads(roads);

    return roads;
  }

  /**
   * Generate buildings along roads with proper spacing
   */
  private generateBuildings(
    chunkX: number, 
    chunkY: number, 
    districtType: DistrictType, 
    roads: Road[], 
    tiles: Tile[][],
    rng: () => number
  ): Building[] {
    const buildings: Building[] = [];
    const chunkWorldX = chunkX * WorldManager.CHUNK_SIZE;
    const chunkWorldY = chunkY * WorldManager.CHUNK_SIZE;
    
    // Get building density based on district type
    const buildingDensity = this.getBuildingDensity(districtType);
    const maxBuildings = Math.floor(buildingDensity * WorldManager.CHUNK_SIZE * WorldManager.CHUNK_SIZE / 100);
    
    // Find suitable building locations along roads
    const buildingSpots = this.findBuildingSpots(roads, tiles, chunkWorldX, chunkWorldY);
    
    // Generate buildings at suitable spots
    const numBuildings = Math.min(maxBuildings, buildingSpots.length);
    for (let i = 0; i < numBuildings; i++) {
      const spot = buildingSpots[Math.floor(rng() * buildingSpots.length)];
      const building = this.generateBuilding(spot, districtType, rng);
      
      if (building && this.canPlaceBuilding(building, buildings, tiles)) {
        buildings.push(building);
        // Remove used spot
        const index = buildingSpots.indexOf(spot);
        buildingSpots.splice(index, 1);
      }
    }

    return buildings;
  }

  /**
   * Generate loot spawns throughout the chunk
   */
  private generateLootSpawns(
    chunkX: number, 
    chunkY: number, 
    districtType: DistrictType, 
    buildings: Building[],
    rng: () => number
  ): LootSpawn[] {
    const lootSpawns: LootSpawn[] = [];
    const chunkWorldX = chunkX * WorldManager.CHUNK_SIZE;
    const chunkWorldY = chunkY * WorldManager.CHUNK_SIZE;
    
    const lootDensity = this.getLootDensity(districtType);
    const numLootSpawns = Math.floor(rng() * lootDensity) + 1;
    
    for (let i = 0; i < numLootSpawns; i++) {
      const position = {
        x: chunkWorldX + Math.floor(rng() * WorldManager.CHUNK_SIZE),
        y: chunkWorldY + Math.floor(rng() * WorldManager.CHUNK_SIZE)
      };
      
      lootSpawns.push({
        id: uuidv4(),
        position,
        lootTable: this.getLootTable(districtType),
        respawnTime: this.getLootRespawnTime(districtType, rng)
      });
    }
    
    return lootSpawns;
  }

  /**
   * Generate NPCs for the chunk
   */
  private generateNPCs(
    chunkX: number, 
    chunkY: number, 
    districtType: DistrictType, 
    buildings: Building[],
    rng: () => number
  ): NPC[] {
    const npcs: NPC[] = [];
    const chunkWorldX = chunkX * WorldManager.CHUNK_SIZE;
    const chunkWorldY = chunkY * WorldManager.CHUNK_SIZE;
    
    const npcDensity = this.getNPCDensity(districtType);
    const numNPCs = Math.floor(rng() * npcDensity) + 1;
    
    for (let i = 0; i < numNPCs; i++) {
      const position = {
        x: chunkWorldX + Math.floor(rng() * WorldManager.CHUNK_SIZE),
        y: chunkWorldY + Math.floor(rng() * WorldManager.CHUNK_SIZE)
      };
      
      npcs.push({
        id: uuidv4(),
        type: this.getNPCType(districtType, rng),
        position,
        behavior: this.getNPCBehavior(districtType, rng),
        faction: this.getFaction(districtType, rng),
        health: 100,
        level: Math.floor(rng() * 10) + 1,
        patrolRoute: this.generatePatrolRoute(position, rng)
      });
    }
    
    return npcs;
  }

  /**
   * Determine district type based on chunk coordinates
   */
  private determineDistrictType(chunkX: number, chunkY: number): DistrictType {
    const distance = Math.sqrt(chunkX * chunkX + chunkY * chunkY);
    const angle = Math.atan2(chunkY, chunkX);
    
    // Corporate center
    if (distance < 3) {
      return DistrictType.CORPORATE;
    }
    
    // Residential ring
    if (distance < 8) {
      return DistrictType.RESIDENTIAL;
    }
    
    // Industrial sectors (based on angle)
    if (distance < 15) {
      const sector = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 4);
      if (sector === 0 || sector === 2) {
        return DistrictType.INDUSTRIAL;
      } else {
        return DistrictType.RESIDENTIAL;
      }
    }
    
    // Underground areas (scattered)
    if (distance < 25 && (chunkX + chunkY) % 3 === 0) {
      return DistrictType.UNDERGROUND;
    }
    
    // Wasteland outer areas
    return DistrictType.WASTELAND;
  }

  /**
   * Cache management
   */
  private cacheChunk(chunk: WorldChunk): void {
    const chunkKey = this.getChunkKey(chunk.x, chunk.y);
    
    // Clean up cache if needed
    if (this.chunkCache.size >= WorldManager.MAX_CACHED_CHUNKS) {
      this.cleanupCache();
    }
    
    this.chunkCache.set(chunkKey, chunk);
  }

  private cleanupCache(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.CLEANUP_INTERVAL) {
      return;
    }
    
    const cutoffTime = now - this.CLEANUP_INTERVAL;
    const chunksToRemove: string[] = [];
    
    for (const [key, chunk] of this.chunkCache.entries()) {
      if (chunk.lastAccessed.getTime() < cutoffTime) {
        chunksToRemove.push(key);
      }
    }
    
    chunksToRemove.forEach(key => this.chunkCache.delete(key));
    this.lastCleanup = now;
  }

  /**
   * Unload a chunk from cache
   */
  unloadChunk(chunkX: number, chunkY: number): void {
    const chunkKey = this.getChunkKey(chunkX, chunkY);
    this.chunkCache.delete(chunkKey);
  }

  /**
   * Get chunks in a radius around a position
   */
  async getChunksInRadius(centerX: number, centerY: number, radius: number): Promise<WorldChunk[]> {
    const chunks: WorldChunk[] = [];
    const chunkRadius = Math.ceil(radius / WorldManager.CHUNK_SIZE);
    
    const centerChunkX = Math.floor(centerX / WorldManager.CHUNK_SIZE);
    const centerChunkY = Math.floor(centerY / WorldManager.CHUNK_SIZE);
    
    for (let x = centerChunkX - chunkRadius; x <= centerChunkX + chunkRadius; x++) {
      for (let y = centerChunkY - chunkRadius; y <= centerChunkY + chunkRadius; y++) {
        const chunk = await this.getChunk(x, y);
        if (chunk) {
          chunks.push(chunk);
        }
      }
    }
    
    return chunks;
  }

  /**
   * Pathfinding using A* algorithm
   */
  findPath(start: Vector2, end: Vector2, chunks: WorldChunk[]): Vector2[] {
    const openSet: PathNode[] = [];
    const closedSet: Set<string> = new Set();
    
    const startNode: PathNode = {
      x: Math.floor(start.x),
      y: Math.floor(start.y),
      g: 0,
      h: this.heuristic(start, end),
      f: 0
    };
    startNode.f = startNode.g + startNode.h;
    
    openSet.push(startNode);
    
    while (openSet.length > 0) {
      // Find node with lowest f score
      let currentIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIndex].f) {
          currentIndex = i;
        }
      }
      
      const current = openSet.splice(currentIndex, 1)[0];
      const currentKey = `${current.x},${current.y}`;
      closedSet.add(currentKey);
      
      // Check if we reached the goal
      if (Math.abs(current.x - end.x) < 1 && Math.abs(current.y - end.y) < 1) {
        return this.reconstructPath(current);
      }
      
      // Check neighbors
      const neighbors = this.getNeighbors(current, chunks);
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(neighborKey)) {
          continue;
        }
        
        const tentativeG = current.g + this.distance(current, neighbor);
        
        const existingIndex = openSet.findIndex(n => n.x === neighbor.x && n.y === neighbor.y);
        if (existingIndex === -1) {
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor, end);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
          openSet.push(neighbor);
        } else if (tentativeG < openSet[existingIndex].g) {
          openSet[existingIndex].g = tentativeG;
          openSet[existingIndex].f = tentativeG + openSet[existingIndex].h;
          openSet[existingIndex].parent = current;
        }
      }
    }
    
    return []; // No path found
  }

  // Helper methods
  private getChunkKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  private generateSeed(chunkX: number, chunkY: number): number {
    return ((chunkX * 1000) + chunkY) % 2147483647;
  }

  private createSeededRNG(seed: number): () => number {
    let currentSeed = seed;
    return () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }

  private generateHeight(x: number, y: number, districtType: DistrictType, rng: () => number): number {
    const baseHeight = districtType === DistrictType.UNDERGROUND ? -10 : 0;
    const variation = (rng() - 0.5) * 4;
    return baseHeight + variation;
  }

  private getSecondaryRoadCount(districtType: DistrictType, rng: () => number): number {
    const baseCounts = {
      [DistrictType.CORPORATE]: 3,
      [DistrictType.RESIDENTIAL]: 4,
      [DistrictType.INDUSTRIAL]: 2,
      [DistrictType.UNDERGROUND]: 1,
      [DistrictType.WASTELAND]: 1
    };
    
    const base = baseCounts[districtType];
    return Math.floor(rng() * base) + 1;
  }

  private generateSecondaryRoad(chunkWorldX: number, chunkWorldY: number, rng: () => number): Road | null {
    const startX = chunkWorldX + Math.floor(rng() * WorldManager.CHUNK_SIZE);
    const startY = chunkWorldY + Math.floor(rng() * WorldManager.CHUNK_SIZE);
    const endX = chunkWorldX + Math.floor(rng() * WorldManager.CHUNK_SIZE);
    const endY = chunkWorldY + Math.floor(rng() * WorldManager.CHUNK_SIZE);
    
    return {
      id: uuidv4(),
      type: RoadType.SECONDARY,
      points: [
        { x: startX, y: startY },
        { x: endX, y: endY }
      ],
      width: 4,
      connections: []
    };
  }

  private generateAlley(chunkWorldX: number, chunkWorldY: number, rng: () => number): Road | null {
    const startX = chunkWorldX + Math.floor(rng() * WorldManager.CHUNK_SIZE);
    const startY = chunkWorldY + Math.floor(rng() * WorldManager.CHUNK_SIZE);
    const length = Math.floor(rng() * 20) + 10;
    const direction = rng() > 0.5 ? 1 : 0; // 0 = horizontal, 1 = vertical
    
    const endX = direction === 0 ? startX + length : startX;
    const endY = direction === 1 ? startY + length : startY;
    
    return {
      id: uuidv4(),
      type: RoadType.ALLEY,
      points: [
        { x: startX, y: startY },
        { x: endX, y: endY }
      ],
      width: 2,
      connections: []
    };
  }

  private connectRoads(roads: Road[]): void {
    // Simple connection logic - connect roads that are close to each other
    for (let i = 0; i < roads.length; i++) {
      for (let j = i + 1; j < roads.length; j++) {
        const road1 = roads[i];
        const road2 = roads[j];
        
        // Check if roads intersect or are close
        if (this.roadsIntersect(road1, road2)) {
          road1.connections.push(road2.id);
          road2.connections.push(road1.id);
        }
      }
    }
  }

  private roadsIntersect(road1: Road, road2: Road): boolean {
    // Simplified intersection check
    const r1Start = road1.points[0];
    const r1End = road1.points[road1.points.length - 1];
    const r2Start = road2.points[0];
    const r2End = road2.points[road2.points.length - 1];
    
    const distance = Math.min(
      this.distance(r1Start, r2Start),
      this.distance(r1Start, r2End),
      this.distance(r1End, r2Start),
      this.distance(r1End, r2End)
    );
    
    return distance < 10;
  }

  private applyRoadsToTiles(tiles: Tile[][], roads: Road[]): void {
    for (const road of roads) {
      for (let i = 0; i < road.points.length - 1; i++) {
        const start = road.points[i];
        const end = road.points[i + 1];
        this.drawRoadOnTiles(tiles, start, end, road.width);
      }
    }
  }

  private drawRoadOnTiles(tiles: Tile[][], start: Vector2, end: Vector2, width: number): void {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(length);
    
    for (let i = 0; i <= steps; i++) {
      const t = steps > 0 ? i / steps : 0;
      const worldX = Math.floor(start.x + dx * t);
      const worldY = Math.floor(start.y + dy * t);
      
      // Apply road to tiles in width radius
      for (let wx = -Math.floor(width / 2); wx <= Math.floor(width / 2); wx++) {
        for (let wy = -Math.floor(width / 2); wy <= Math.floor(width / 2); wy++) {
          const tileWorldX = worldX + wx;
          const tileWorldY = worldY + wy;
          
          // Convert world coordinates to local chunk coordinates
          const localX = ((tileWorldX % WorldManager.CHUNK_SIZE) + WorldManager.CHUNK_SIZE) % WorldManager.CHUNK_SIZE;
          const localY = ((tileWorldY % WorldManager.CHUNK_SIZE) + WorldManager.CHUNK_SIZE) % WorldManager.CHUNK_SIZE;
          
          if (localX >= 0 && localX < WorldManager.CHUNK_SIZE && 
              localY >= 0 && localY < WorldManager.CHUNK_SIZE &&
              tiles[localX] && tiles[localX][localY]) {
            tiles[localX][localY].type = TileType.ROAD;
            tiles[localX][localY].walkable = true;
          }
        }
      }
    }
  }

  private getBuildingDensity(districtType: DistrictType): number {
    const densities = {
      [DistrictType.CORPORATE]: 15,
      [DistrictType.RESIDENTIAL]: 25,
      [DistrictType.INDUSTRIAL]: 10,
      [DistrictType.UNDERGROUND]: 8,
      [DistrictType.WASTELAND]: 3
    };
    return densities[districtType];
  }

  private findBuildingSpots(roads: Road[], tiles: Tile[][], chunkWorldX: number, chunkWorldY: number): Vector2[] {
    const spots: Vector2[] = [];
    
    // Find spots along roads
    for (const road of roads) {
      for (let i = 0; i < road.points.length - 1; i++) {
        const start = road.points[i];
        const end = road.points[i + 1];
        const spots_on_road = this.findSpotsAlongRoad(start, end, road.width + 2);
        spots.push(...spots_on_road);
      }
    }
    
    return spots;
  }

  private findSpotsAlongRoad(start: Vector2, end: Vector2, offset: number): Vector2[] {
    const spots: Vector2[] = [];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.floor(length / 10); // One spot every 10 units
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = start.x + dx * t;
      const y = start.y + dy * t;
      
      // Add spots on both sides of the road
      const perpX = -dy / length * offset;
      const perpY = dx / length * offset;
      
      spots.push({ x: x + perpX, y: y + perpY });
      spots.push({ x: x - perpX, y: y - perpY });
    }
    
    return spots;
  }

  private generateBuilding(position: Vector2, districtType: DistrictType, rng: () => number): Building {
    const buildingTypes = this.getBuildingTypes(districtType);
    const type = buildingTypes[Math.floor(rng() * buildingTypes.length)];
    
    const size = this.getBuildingSize(type, rng);
    const rotation = Math.floor(rng() * 4) * 90; // 0, 90, 180, 270 degrees
    const entrances = this.generateEntrances(position, size, rotation, rng);
    
    const building: Building = {
      id: uuidv4(),
      type,
      position,
      size,
      rotation,
      hackable: rng() > 0.3,
      securityLevel: Math.floor(rng() * 5) + 1,
      entrances
    };

    // Generate interior layout for hackable buildings
    if (building.hackable && size.x >= 6 && size.y >= 6) {
      building.interior = BuildingGenerator.generateBuildingInterior(building, districtType, rng);
    }
    
    return building;
  }

  private getBuildingTypes(districtType: DistrictType): BuildingType[] {
    const typeMap = {
      [DistrictType.CORPORATE]: [BuildingType.OFFICE, BuildingType.TOWER, BuildingType.PLAZA, BuildingType.HEADQUARTERS],
      [DistrictType.RESIDENTIAL]: [BuildingType.APARTMENT, BuildingType.HOUSE, BuildingType.COMPLEX, BuildingType.CONDO],
      [DistrictType.INDUSTRIAL]: [BuildingType.WAREHOUSE, BuildingType.FACTORY, BuildingType.DEPOT, BuildingType.PLANT],
      [DistrictType.UNDERGROUND]: [BuildingType.HIDEOUT, BuildingType.CLUB, BuildingType.MARKET, BuildingType.DEN],
      [DistrictType.WASTELAND]: [BuildingType.RUIN, BuildingType.SHACK, BuildingType.OUTPOST, BuildingType.BUNKER]
    };
    return typeMap[districtType];
  }

  private getBuildingSize(type: BuildingType, rng: () => number): Vector2 {
    const baseSizes: Record<BuildingType, { x: number; y: number }> = {
      [BuildingType.TOWER]: { x: 20, y: 20 },
      [BuildingType.HEADQUARTERS]: { x: 30, y: 30 },
      [BuildingType.OFFICE]: { x: 15, y: 15 },
      [BuildingType.PLAZA]: { x: 25, y: 25 },
      [BuildingType.APARTMENT]: { x: 12, y: 8 },
      [BuildingType.HOUSE]: { x: 8, y: 6 },
      [BuildingType.COMPLEX]: { x: 20, y: 12 },
      [BuildingType.CONDO]: { x: 10, y: 8 },
      [BuildingType.WAREHOUSE]: { x: 25, y: 15 },
      [BuildingType.FACTORY]: { x: 30, y: 20 },
      [BuildingType.DEPOT]: { x: 20, y: 15 },
      [BuildingType.PLANT]: { x: 35, y: 25 },
      [BuildingType.HIDEOUT]: { x: 8, y: 8 },
      [BuildingType.CLUB]: { x: 15, y: 12 },
      [BuildingType.MARKET]: { x: 18, y: 15 },
      [BuildingType.DEN]: { x: 6, y: 6 },
      [BuildingType.RUIN]: { x: 12, y: 10 },
      [BuildingType.SHACK]: { x: 4, y: 4 },
      [BuildingType.OUTPOST]: { x: 8, y: 8 },
      [BuildingType.BUNKER]: { x: 10, y: 10 }
    };
    
    const baseSize = baseSizes[type] || { x: 10, y: 10 };
    const variation = 0.3;
    
    return {
      x: Math.floor(baseSize.x * (1 + (rng() - 0.5) * variation)),
      y: Math.floor(baseSize.y * (1 + (rng() - 0.5) * variation))
    };
  }

  private generateEntrances(position: Vector2, size: Vector2, rotation: number, rng: () => number): Vector2[] {
    const entrances: Vector2[] = [];
    const numEntrances = Math.floor(rng() * 2) + 1; // 1-2 entrances
    
    for (let i = 0; i < numEntrances; i++) {
      // Place entrance on a random side
      const side = Math.floor(rng() * 4);
      let entrance: Vector2;
      
      switch (side) {
        case 0: // Top
          entrance = { x: position.x + rng() * size.x, y: position.y };
          break;
        case 1: // Right
          entrance = { x: position.x + size.x, y: position.y + rng() * size.y };
          break;
        case 2: // Bottom
          entrance = { x: position.x + rng() * size.x, y: position.y + size.y };
          break;
        case 3: // Left
          entrance = { x: position.x, y: position.y + rng() * size.y };
          break;
        default:
          entrance = { x: position.x, y: position.y };
      }
      
      entrances.push(entrance);
    }
    
    return entrances;
  }

  private canPlaceBuilding(building: Building, existingBuildings: Building[], tiles: Tile[][]): boolean {
    // Check for overlaps with existing buildings
    for (const existing of existingBuildings) {
      if (this.buildingsOverlap(building, existing)) {
        return false;
      }
    }
    
    // Check if building fits within chunk bounds
    const localX = building.position.x % WorldManager.CHUNK_SIZE;
    const localY = building.position.y % WorldManager.CHUNK_SIZE;
    
    if (localX < 0 || localY < 0 || 
        localX + building.size.x >= WorldManager.CHUNK_SIZE || 
        localY + building.size.y >= WorldManager.CHUNK_SIZE) {
      return false;
    }
    
    return true;
  }

  private buildingsOverlap(building1: Building, building2: Building): boolean {
    const b1 = {
      left: building1.position.x,
      right: building1.position.x + building1.size.x,
      top: building1.position.y,
      bottom: building1.position.y + building1.size.y
    };
    
    const b2 = {
      left: building2.position.x,
      right: building2.position.x + building2.size.x,
      top: building2.position.y,
      bottom: building2.position.y + building2.size.y
    };
    
    return !(b1.right < b2.left || b1.left > b2.right || 
             b1.bottom < b2.top || b1.top > b2.bottom);
  }

  private applyBuildingsToTiles(tiles: Tile[][], buildings: Building[]): void {
    for (const building of buildings) {
      // Convert world coordinates to local chunk coordinates with proper handling of negative values
      const worldX = Math.floor(building.position.x);
      const worldY = Math.floor(building.position.y);
      const localX = ((worldX % WorldManager.CHUNK_SIZE) + WorldManager.CHUNK_SIZE) % WorldManager.CHUNK_SIZE;
      const localY = ((worldY % WorldManager.CHUNK_SIZE) + WorldManager.CHUNK_SIZE) % WorldManager.CHUNK_SIZE;
      
      for (let x = 0; x < building.size.x; x++) {
        for (let y = 0; y < building.size.y; y++) {
          const tileX = localX + x;
          const tileY = localY + y;
          
          if (tileX >= 0 && tileX < WorldManager.CHUNK_SIZE && 
              tileY >= 0 && tileY < WorldManager.CHUNK_SIZE &&
              tiles[tileX] && tiles[tileX][tileY]) {
            tiles[tileX][tileY].type = TileType.BUILDING;
            tiles[tileX][tileY].walkable = false;
          }
        }
      }
      
      // Make entrances walkable
      for (const entrance of building.entrances) {
        const entranceWorldX = Math.floor(entrance.x);
        const entranceWorldY = Math.floor(entrance.y);
        const entranceLocalX = ((entranceWorldX % WorldManager.CHUNK_SIZE) + WorldManager.CHUNK_SIZE) % WorldManager.CHUNK_SIZE;
        const entranceLocalY = ((entranceWorldY % WorldManager.CHUNK_SIZE) + WorldManager.CHUNK_SIZE) % WorldManager.CHUNK_SIZE;
        
        if (entranceLocalX >= 0 && entranceLocalX < WorldManager.CHUNK_SIZE && 
            entranceLocalY >= 0 && entranceLocalY < WorldManager.CHUNK_SIZE &&
            tiles[entranceLocalX] && tiles[entranceLocalX][entranceLocalY]) {
          tiles[entranceLocalX][entranceLocalY].walkable = true;
        }
      }
    }
  }

  private getLootDensity(districtType: DistrictType): number {
    const densities = {
      [DistrictType.CORPORATE]: 3,
      [DistrictType.RESIDENTIAL]: 2,
      [DistrictType.INDUSTRIAL]: 4,
      [DistrictType.UNDERGROUND]: 5,
      [DistrictType.WASTELAND]: 6
    };
    return densities[districtType];
  }

  private getLootTable(districtType: DistrictType): string {
    const tables = {
      [DistrictType.CORPORATE]: 'corporate_loot',
      [DistrictType.RESIDENTIAL]: 'residential_loot',
      [DistrictType.INDUSTRIAL]: 'industrial_loot',
      [DistrictType.UNDERGROUND]: 'underground_loot',
      [DistrictType.WASTELAND]: 'wasteland_loot'
    };
    return tables[districtType];
  }

  private getLootRespawnTime(districtType: DistrictType, rng: () => number): number {
    const baseTimes = {
      [DistrictType.CORPORATE]: 300, // 5 minutes
      [DistrictType.RESIDENTIAL]: 600, // 10 minutes
      [DistrictType.INDUSTRIAL]: 450, // 7.5 minutes
      [DistrictType.UNDERGROUND]: 240, // 4 minutes
      [DistrictType.WASTELAND]: 180 // 3 minutes
    };
    
    const baseTime = baseTimes[districtType];
    return Math.floor(baseTime * (0.8 + rng() * 0.4)); // ±20% variation
  }

  private getNPCDensity(districtType: DistrictType): number {
    const densities = {
      [DistrictType.CORPORATE]: 4,
      [DistrictType.RESIDENTIAL]: 6,
      [DistrictType.INDUSTRIAL]: 3,
      [DistrictType.UNDERGROUND]: 2,
      [DistrictType.WASTELAND]: 1
    };
    return densities[districtType];
  }

  private getNPCType(districtType: DistrictType, rng: () => number): string {
    const types = {
      [DistrictType.CORPORATE]: ['guard', 'executive', 'security', 'analyst'],
      [DistrictType.RESIDENTIAL]: ['civilian', 'resident', 'worker', 'family'],
      [DistrictType.INDUSTRIAL]: ['worker', 'foreman', 'technician', 'engineer'],
      [DistrictType.UNDERGROUND]: ['fixer', 'dealer', 'thug', 'hacker'],
      [DistrictType.WASTELAND]: ['scavenger', 'raider', 'survivor', 'nomad']
    };
    
    const typeList = types[districtType];
    return typeList[Math.floor(rng() * typeList.length)];
  }

  private getNPCBehavior(districtType: DistrictType, rng: () => number): NPCBehavior {
    const behaviors = {
      [DistrictType.CORPORATE]: [NPCBehavior.PATROL, NPCBehavior.GUARD],
      [DistrictType.RESIDENTIAL]: [NPCBehavior.IDLE, NPCBehavior.PATROL],
      [DistrictType.INDUSTRIAL]: [NPCBehavior.WORK, NPCBehavior.PATROL],
      [DistrictType.UNDERGROUND]: [NPCBehavior.PATROL, NPCBehavior.AGGRESSIVE],
      [DistrictType.WASTELAND]: [NPCBehavior.AGGRESSIVE, NPCBehavior.FLEEING]
    };
    
    const behaviorList = behaviors[districtType];
    return behaviorList[Math.floor(rng() * behaviorList.length)];
  }

  private getFaction(districtType: DistrictType, rng: () => number): string {
    const factions = {
      [DistrictType.CORPORATE]: ['corporate', 'government', 'security'],
      [DistrictType.RESIDENTIAL]: ['civilian', 'neutral', 'community'],
      [DistrictType.INDUSTRIAL]: ['corporate', 'union', 'workers'],
      [DistrictType.UNDERGROUND]: ['gang', 'syndicate', 'criminals'],
      [DistrictType.WASTELAND]: ['raider', 'scavenger', 'survivor']
    };
    
    const factionList = factions[districtType];
    return factionList[Math.floor(rng() * factionList.length)];
  }

  private generatePatrolRoute(startPosition: Vector2, rng: () => number): Vector2[] {
    const route: Vector2[] = [startPosition];
    const numWaypoints = Math.floor(rng() * 3) + 2; // 2-4 waypoints
    
    let currentPos = { ...startPosition };
    for (let i = 1; i < numWaypoints; i++) {
      const nextPos = {
        x: currentPos.x + (rng() - 0.5) * 40,
        y: currentPos.y + (rng() - 0.5) * 40
      };
      route.push(nextPos);
      currentPos = nextPos;
    }
    
    return route;
  }

  // Pathfinding helper methods
  private heuristic(a: Vector2, b: Vector2): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private distance(a: Vector2, b: Vector2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getNeighbors(node: PathNode, chunks: WorldChunk[]): PathNode[] {
    const neighbors: PathNode[] = [];
    const directions = [
      { x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 },
      { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }
    ];
    
    for (const dir of directions) {
      const newX = node.x + dir.x;
      const newY = node.y + dir.y;
      
      if (this.isWalkable(newX, newY, chunks)) {
        neighbors.push({
          x: newX,
          y: newY,
          g: 0,
          h: 0,
          f: 0
        });
      }
    }
    
    return neighbors;
  }

  private isWalkable(x: number, y: number, chunks: WorldChunk[]): boolean {
    const chunkX = Math.floor(x / WorldManager.CHUNK_SIZE);
    const chunkY = Math.floor(y / WorldManager.CHUNK_SIZE);
    
    const chunk = chunks.find(c => c.x === chunkX && c.y === chunkY);
    if (!chunk) return false;
    
    const localX = x % WorldManager.CHUNK_SIZE;
    const localY = y % WorldManager.CHUNK_SIZE;
    
    if (localX < 0 || localX >= WorldManager.CHUNK_SIZE || 
        localY < 0 || localY >= WorldManager.CHUNK_SIZE) {
      return false;
    }
    
    return chunk.generatedData.tiles[localX][localY].walkable;
  }

  private reconstructPath(node: PathNode): Vector2[] {
    const path: Vector2[] = [];
    let current: PathNode | undefined = node;
    
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    
    return path;
  }

  /**
   * Get world statistics
   */
  async getWorldStats(): Promise<{
    totalChunks: number;
    chunksByDistrict: Record<string, number>;
    cachedChunks: number;
  }> {
    try {
      const stats = await this.prisma.worldChunk.groupBy({
        by: ['districtType'],
        _count: {
          id: true
        }
      });

      const chunksByDistrict: Record<string, number> = {};
      let totalChunks = 0;

      for (const stat of stats) {
        chunksByDistrict[stat.districtType] = stat._count.id;
        totalChunks += stat._count.id;
      }

      return {
        totalChunks,
        chunksByDistrict,
        cachedChunks: this.chunkCache.size
      };
    } catch (error) {
      console.error('Error getting world stats:', error);
      return {
        totalChunks: 0,
        chunksByDistrict: {},
        cachedChunks: this.chunkCache.size
      };
    }
  }
}