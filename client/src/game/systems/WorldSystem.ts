// World management system
import { WorldGenerator } from '../utils/WorldGenerator'

// Simple event emitter implementation
class EventEmitter {
  private events: { [key: string]: Function[] } = {}

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(listener)
  }

  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args))
    }
  }
}
import { Vector2 } from '../../types/game'

export class WorldSystem extends EventEmitter {
  private worldState: any = null
  private players: Map<string, any> = new Map()
  private chunks: Map<string, any> = new Map()
  private currentChunk: string | null = null

  constructor() {
    super()
    this.initializeDemoWorld()
  }

  update(deltaTime: number) {
    // Update world state
    this.updateWorldTime(deltaTime)
    this.updateChunks(deltaTime)
    this.updatePlayers(deltaTime)
  }

  private updateWorldTime(deltaTime: number) {
    if (!this.worldState) return
    
    // Update time of day, weather, etc.
    this.worldState.timeOfDay = (this.worldState.timeOfDay + deltaTime / 1000) % 24
  }

  private updateChunks(_deltaTime: number) {
    // Update chunk loading/unloading
    // Update NPCs, buildings, etc.
  }

  private updatePlayers(_deltaTime: number) {
    // Update player positions, states
  }

  // World state management
  setWorldState(worldState: any) {
    this.worldState = worldState
    this.emit('worldStateChanged', worldState)
  }

  getWorldState() {
    return this.worldState
  }

  // Chunk management
  loadChunk(chunkId: string) {
    if (this.chunks.has(chunkId)) {
      return this.chunks.get(chunkId)
    }

    // Parse chunk coordinates from ID
    const coords = this.parseChunkId(chunkId)
    if (coords) {
      const generatedChunk = this.generateChunkIfNeeded(coords.x, coords.y)
      if (generatedChunk) {
        return generatedChunk
      }
    }

    // Load chunk from server if not generated locally
    this.emit('chunkRequested', chunkId)
    return null
  }
  
  generateChunkIfNeeded(x: number, y: number) {
    const chunkId = `chunk_${x}_${y}`
    
    if (!this.chunks.has(chunkId)) {
      const districtType = this.getDistrictTypeForCoords(x, y)
      const generatedChunk = WorldGenerator.generateChunk(x, y, districtType)
      
      // Wrap in expected format
      const chunk = {
        id: chunkId,
        x,
        y,
        districtType,
        generatedData: {
          buildings: generatedChunk.buildings,
          roads: generatedChunk.roads,
          npcs: generatedChunk.npcs,
          loot: generatedChunk.loot,
          tileMap: generatedChunk.tileMap,
          collisionMap: generatedChunk.collisionMap,
          infrastructure: generatedChunk.infrastructure,
          doors: generatedChunk.doors
        },
        generatedAt: new Date(),
        lastAccessed: new Date()
      }
      
      this.addChunk(chunk)
      console.log(`🏗️ Generated chunk ${chunkId} (${districtType})`, chunk)
      return chunk
    }
    
    return this.chunks.get(chunkId)
  }

  addChunk(chunk: any) {
    this.chunks.set(chunk.id, chunk)
    this.emit('chunkLoaded', chunk)
  }

  removeChunk(chunkId: string) {
    if (this.chunks.has(chunkId)) {
      this.chunks.delete(chunkId)
      this.emit('chunkUnloaded', chunkId)
    }
  }

  getChunk(chunkId: string) {
    return this.chunks.get(chunkId)
  }
  
  getChunks() {
    return this.chunks.values()
  }

  // Tile/collision access
  getTileAt(pos: { x: number, y: number }): string | null {
    const CHUNK_SIZE = 1000
    const TILE_SIZE = 50
    const chunkX = Math.floor(pos.x / CHUNK_SIZE)
    const chunkY = Math.floor(pos.y / CHUNK_SIZE)
    const chunkId = `chunk_${chunkX}_${chunkY}`
    const chunk = this.getChunk(chunkId)
    if (!chunk) return null

    const localX = pos.x - chunkX * CHUNK_SIZE
    const localY = pos.y - chunkY * CHUNK_SIZE
    const tileX = Math.max(0, Math.min(19, Math.floor(localX / TILE_SIZE)))
    const tileY = Math.max(0, Math.min(19, Math.floor(localY / TILE_SIZE)))
    const tileMap = chunk.generatedData?.tileMap || chunk.tileMap
    return tileMap && tileMap[tileY] ? tileMap[tileY][tileX] : null
  }

  // Player management
  addPlayer(player: any) {
    this.players.set(player.id, player)
    this.emit('playerAdded', player)
  }

  removePlayer(playerId: string) {
    if (this.players.has(playerId)) {
      this.players.delete(playerId)
      this.emit('playerRemoved', playerId)
    }
  }

  updatePlayer(playerId: string, data: any) {
    const player = this.players.get(playerId)
    if (player) {
      Object.assign(player, data)
      this.emit('playerUpdated', player)
    }
  }

  getPlayers() {
    return Array.from(this.players.values())
  }

  getPlayer(playerId: string) {
    return this.players.get(playerId)
  }

  // Movement handling
  handlePlayerMovement(data: any) {
    const { playerId, position } = data
    
    if (this.players.has(playerId)) {
      this.updatePlayer(playerId, { position })
      this.emit('playerMoved', { playerId, position })
    }
  }

  // Interaction handling
  handleInteraction(data: any) {
    const { target, action } = data
    
    // Handle different interaction types
    switch (action) {
      case 'hack':
        this.handleHacking(target)
        break
      case 'enter':
        this.handleEnterBuilding(target)
        break
      case 'talk':
        this.handleTalkToNPC(target)
        break
      case 'loot':
        this.handleLoot(target)
        break
    }
  }

  private handleHacking(target: any) {
    this.emit('hackingStarted', target)
  }

  private handleEnterBuilding(target: any) {
    this.emit('buildingEntered', target)
  }

  private handleTalkToNPC(target: any) {
    this.emit('npcInteraction', target)
  }

  private handleLoot(target: any) {
    this.emit('lootAttempted', target)
  }

  // Utility methods
  getCurrentChunk() {
    return this.currentChunk
  }

  setCurrentChunk(chunkId: string) {
    this.currentChunk = chunkId
    this.emit('currentChunkChanged', chunkId)
  }

  getNearbyPlayers(position: Vector2, radius: number = 1000) {
    return this.getPlayers().filter(player => {
      const dx = player.position.x - position.x
      const dy = player.position.y - position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      return distance <= radius
    })
  }

  getNearbyBuildings(position: Vector2, radius: number = 500) {
    const buildings: any[] = []
    
    this.chunks.forEach(chunk => {
      if (chunk.generatedData?.buildings) {
        chunk.generatedData.buildings.forEach((building: any) => {
          const dx = building.position.x - position.x
          const dy = building.position.y - position.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance <= radius) {
            buildings.push(building)
          }
        })
      }
    })
    
    return buildings
  }

  getNearbyNPCs(position: Vector2, radius: number = 500) {
    const npcs: any[] = []
    
    this.chunks.forEach(chunk => {
      if (chunk.generatedData?.npcs) {
        chunk.generatedData.npcs.forEach((npc: any) => {
          const dx = npc.position.x - position.x
          const dy = npc.position.y - position.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance <= radius) {
            npcs.push(npc)
          }
        })
      }
    })
    
    return npcs
  }

  // Initialize demo world for testing
  private initializeDemoWorld() {
    // Create initial world state
    this.worldState = {
      timeOfDay: 22.5, // Night time for cyberpunk feel
      weather: 'rain',
      chunks: []
    }

    // Create demo chunks with buildings
    const demoChunks = [
      {
        id: 'chunk_0_0',
        x: 0,
        y: 0,
        districtType: 'corporate',
        generatedData: {
          buildings: [
            {
              id: 'corp_tower_1',
              position: { x: 100, y: 100 },
              size: { x: 80, y: 120 },
              district: 'corporate',
              hackable: true,
              securityLevel: 4,
              type: 'corporate_tower'
            },
            {
              id: 'security_station_1',
              position: { x: 250, y: 150 },
              size: { x: 60, y: 40 },
              district: 'corporate',
              hackable: true,
              securityLevel: 5,
              type: 'security_station'
            }
          ],
          roads: [
            {
              start: { x: 0, y: 200 },
              end: { x: 500, y: 200 },
              width: 20
            },
            {
              start: { x: 200, y: 0 },
              end: { x: 200, y: 500 },
              width: 20
            }
          ],
          npcs: [
            {
              id: 'guard_1',
              position: { x: 180, y: 130 },
              type: 'guard',
              hostile: true
            },
            {
              id: 'executive_1',
              position: { x: 140, y: 160 },
              type: 'executive',
              hostile: false
            }
          ]
        }
      },
      {
        id: 'chunk_1_0',
        x: 1,
        y: 0,
        districtType: 'residential',
        generatedData: {
          buildings: [
            {
              id: 'apartment_1',
              position: { x: 600, y: 80 },
              size: { x: 50, y: 80 },
              district: 'residential',
              hackable: false,
              securityLevel: 1,
              type: 'apartment'
            },
            {
              id: 'medbot_station_1',
              position: { x: 750, y: 180 },
              size: { x: 30, y: 30 },
              district: 'residential',
              hackable: true,
              securityLevel: 2,
              type: 'medbot_station'
            }
          ],
          roads: [
            {
              start: { x: 500, y: 200 },
              end: { x: 1000, y: 200 },
              width: 20
            }
          ],
          npcs: [
            {
              id: 'civilian_1',
              position: { x: 650, y: 220 },
              type: 'civilian',
              hostile: false
            },
            {
              id: 'dealer_1',
              position: { x: 720, y: 160 },
              type: 'dealer',
              hostile: false
            }
          ]
        }
      },
      {
        id: 'chunk_0_-1',
        x: 0,
        y: -1,
        districtType: 'underground',
        generatedData: {
          buildings: [
            {
              id: 'hideout_1',
              position: { x: 120, y: -200 },
              size: { x: 70, y: 50 },
              district: 'underground',
              hackable: true,
              securityLevel: 3,
              type: 'hideout'
            },
            {
              id: 'black_market_1',
              position: { x: 280, y: -150 },
              size: { x: 40, y: 40 },
              district: 'underground',
              hackable: false,
              securityLevel: 2,
              type: 'black_market'
            }
          ],
          roads: [
            {
              start: { x: 0, y: -100 },
              end: { x: 500, y: -100 },
              width: 15
            }
          ],
          npcs: [
            {
              id: 'fixer_1',
              position: { x: 300, y: -130 },
              type: 'fixer',
              hostile: false
            },
            {
              id: 'thug_1',
              position: { x: 180, y: -180 },
              type: 'thug',
              hostile: true
            }
          ]
        }
      }
    ]

    // Add chunks to the world
    demoChunks.forEach(chunk => {
      this.addChunk(chunk)
    })

    // Update world state with chunks
    this.worldState.chunks = demoChunks

    console.log('🌍 Demo world initialized with', demoChunks.length, 'chunks')
  }
  
  // Utility methods for dynamic generation
  private parseChunkId(chunkId: string): { x: number, y: number } | null {
    const match = chunkId.match(/^chunk_(-?\d+)_(-?\d+)$/)
    if (match) {
      return {
        x: parseInt(match[1]),
        y: parseInt(match[2])
      }
    }
    return null
  }
  
  private getDistrictTypeForCoords(x: number, y: number): string {
    // Create distinct districts based on coordinates
    // This creates a pattern across the world
    
    const distance = Math.sqrt(x * x + y * y)
    
    // Center area (0,0) is always corporate
    if (distance <= 1) {
      return 'corporate'
    }
    
    // Create districts in rings around center
    const angle = Math.atan2(y, x)
    const normalizedAngle = (angle + Math.PI) / (2 * Math.PI) // 0-1
    
    if (distance <= 2) {
      // Inner ring: mix of corporate and residential
      if (normalizedAngle < 0.3) return 'corporate'
      if (normalizedAngle < 0.7) return 'residential'
      return 'corporate'
    }
    
    if (distance <= 4) {
      // Middle ring: more diverse
      if (normalizedAngle < 0.2) return 'industrial'
      if (normalizedAngle < 0.4) return 'residential'
      if (normalizedAngle < 0.6) return 'underground'
      if (normalizedAngle < 0.8) return 'industrial'
      return 'residential'
    }
    
    if (distance <= 8) {
      // Outer ring: industrial and underground
      if (normalizedAngle < 0.3) return 'underground'
      if (normalizedAngle < 0.6) return 'industrial'
      if (normalizedAngle < 0.8) return 'underground'
      return 'wasteland'
    }
    
    // Far out: mostly wasteland with some underground
    if (Math.random() < 0.8) {
      return 'wasteland'
    }
    return 'underground'
  }
  
  // Load chunks around a position (for streaming)
  loadChunksAroundPosition(position: Vector2, radius: number = 2) {
    const chunkSize = 1000 // Should match WorldGenerator.CHUNK_SIZE
    const centerChunkX = Math.floor(position.x / chunkSize)
    const centerChunkY = Math.floor(position.y / chunkSize)
    
    const chunksToLoad = []
    
    for (let x = centerChunkX - radius; x <= centerChunkX + radius; x++) {
      for (let y = centerChunkY - radius; y <= centerChunkY + radius; y++) {
        const chunkId = `chunk_${x}_${y}`
        if (!this.chunks.has(chunkId)) {
          const chunk = this.generateChunkIfNeeded(x, y)
          if (chunk) {
            chunksToLoad.push(chunk)
          }
        }
      }
    }
    
    if (chunksToLoad.length > 0) {
      // Update world state chunks
      if (this.worldState) {
        this.worldState.chunks = Array.from(this.chunks.values())
      }
      
      console.log(`🗺️ Loaded ${chunksToLoad.length} new chunks around (${centerChunkX}, ${centerChunkY})`)
    }
    
    return chunksToLoad
  }
  
  // Collision Detection System
  isBlocked(position: Vector2): boolean {
    const CHUNK_SIZE = 1000
    const TILE_SIZE = 50

    const chunkX = Math.floor(position.x / CHUNK_SIZE)
    const chunkY = Math.floor(position.y / CHUNK_SIZE)
    const chunkId = `chunk_${chunkX}_${chunkY}`
    let chunk = this.getChunk(chunkId)
    if (!chunk) {
      chunk = this.generateChunkIfNeeded(chunkX, chunkY)
    }
    if (chunk) {
      const localX = position.x - chunkX * CHUNK_SIZE
      const localY = position.y - chunkY * CHUNK_SIZE
      const tileX = Math.max(0, Math.min(19, Math.floor(localX / TILE_SIZE)))
      const tileY = Math.max(0, Math.min(19, Math.floor(localY / TILE_SIZE)))
      const collision = chunk.generatedData?.collisionMap || chunk.collisionMap
      if (collision && collision[tileY] && typeof collision[tileY][tileX] === 'boolean') {
        return collision[tileY][tileX]
      }
    }

    // Fallback to building rect check if no collision map
    return this.isCollidingWithBuildings(position)
  }

  private isCollidingWithBuildings(position: Vector2): boolean {
    // Get the chunk this position belongs to
    const chunkSize = 1000
    const chunkX = Math.floor(position.x / chunkSize)
    const chunkY = Math.floor(position.y / chunkSize)
    const chunkId = `chunk_${chunkX}_${chunkY}`
    
    const chunk = this.chunks.get(chunkId)
    if (!chunk || !chunk.generatedData?.buildings) {
      return false
    }
    
    // Check collision with each building in the chunk
    for (const building of chunk.generatedData.buildings) {
      if (this.isPointInBuilding(position, building)) {
        return true
      }
    }
    
    // Also check adjacent chunks for buildings near chunk borders
    const adjacentChunks = [
      `chunk_${chunkX - 1}_${chunkY}`,
      `chunk_${chunkX + 1}_${chunkY}`,
      `chunk_${chunkX}_${chunkY - 1}`,
      `chunk_${chunkX}_${chunkY + 1}`
    ]
    
    for (const adjacentChunkId of adjacentChunks) {
      const adjacentChunk = this.chunks.get(adjacentChunkId)
      if (adjacentChunk?.generatedData?.buildings) {
        for (const building of adjacentChunk.generatedData.buildings) {
          if (this.isPointInBuilding(position, building)) {
            return true
          }
        }
      }
    }
    
    return false
  }

  private isPointInBuilding(point: Vector2, building: any): boolean {
    const buildingLeft = building.position.x
    const buildingRight = building.position.x + building.size.x
    const buildingTop = building.position.y
    const buildingBottom = building.position.y + building.size.y
    
    return point.x >= buildingLeft && 
           point.x <= buildingRight && 
           point.y >= buildingTop && 
           point.y <= buildingBottom
  }

  // Get nearby collidable objects for more sophisticated collision
  getNearbyCollidables(position: Vector2, radius: number = 100): any[] {
    const collidables: any[] = []
    
    this.chunks.forEach(chunk => {
      if (chunk.generatedData?.buildings) {
        chunk.generatedData.buildings.forEach((building: any) => {
          const distance = this.getDistanceToBuilding(position, building)
          if (distance <= radius) {
            collidables.push({
              type: 'building',
              ...building,
              distance
            })
          }
        })
      }
    })
    
    return collidables.sort((a, b) => a.distance - b.distance)
  }

  private getDistanceToBuilding(point: Vector2, building: any): number {
    // Distance to closest point on building rectangle
    const buildingCenterX = building.position.x + building.size.x / 2
    const buildingCenterY = building.position.y + building.size.y / 2
    
    const dx = Math.max(0, Math.abs(point.x - buildingCenterX) - building.size.x / 2)
    const dy = Math.max(0, Math.abs(point.y - buildingCenterY) - building.size.y / 2)
    
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Check if movement from one point to another is blocked
  isMovementBlocked(from: Vector2, to: Vector2): boolean {
    // Simple line-of-sight check for movement
    const dx = to.x - from.x
    const dy = to.y - from.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance === 0) return false
    
    const steps = Math.ceil(distance / 5) // Check every 5 units
    const stepX = dx / steps
    const stepY = dy / steps
    
    for (let i = 0; i <= steps; i++) {
      const checkPoint = {
        x: from.x + stepX * i,
        y: from.y + stepY * i
      }
      
      if (this.isBlocked(checkPoint)) {
        return true
      }
    }
    
    return false
  }

  // Get current world statistics
  getWorldStats() {
    const chunks = Array.from(this.chunks.values())
    const stats = {
      totalChunks: chunks.length,
      districtCounts: {} as Record<string, number>,
      totalBuildings: 0,
      totalNPCs: 0,
      totalLoot: 0
    }
    
    chunks.forEach(chunk => {
      // Count districts
      stats.districtCounts[chunk.districtType] = (stats.districtCounts[chunk.districtType] || 0) + 1
      
      // Count entities
      if (chunk.generatedData) {
        stats.totalBuildings += chunk.generatedData.buildings?.length || 0
        stats.totalNPCs += chunk.generatedData.npcs?.length || 0
        stats.totalLoot += chunk.generatedData.loot?.length || 0
      }
    })
    
    return stats
  }
}


