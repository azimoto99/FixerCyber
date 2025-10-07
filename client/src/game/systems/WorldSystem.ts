// World management system
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

    // Load chunk from server
    this.emit('chunkRequested', chunkId)
    return null
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
}


