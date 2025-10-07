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

  private updateChunks(deltaTime: number) {
    // Update chunk loading/unloading
    // Update NPCs, buildings, etc.
  }

  private updatePlayers(deltaTime: number) {
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
}


