// Progression system with permadeath and safehouse saves
import { Vector2 } from '../../types/game'

interface SafehouseLocation {
  id: string
  location: Vector2
  cost: number
  district: string
  securityLevel: number // 1-5, affects NPC spawn rates nearby
  isAvailable: boolean
  ownerId?: string
}

interface PlayerCharacter {
  playerId: string
  characterName: string
  createdAt: number
  currentCredits: number
  currentHealth: number
  position: Vector2
  
  // Equipment (lost on death)
  weapons: WeaponItem[]
  armor: ArmorItem[]
  inventory: InventoryItem[]
  
  // Progress (lost on death)
  killCount: number
  contractsCompleted: number
  hacksSuccessful: number
  
  // Safehouse data (lost on death)
  ownedSafehouseId?: string
  lastSaveTime?: number
  hasSavedProgress: boolean
  
  isAlive: boolean
}

interface SavedProgress {
  characterName: string
  savedAt: number
  safehouseId: string
  credits: number
  weapons: WeaponItem[]
  armor: ArmorItem[]
  inventory: InventoryItem[]
  augmentations: string[]
  killCount: number
  contractsCompleted: number
  hacksSuccessful: number
}

interface WeaponItem {
  id: string
  type: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  damage: number
  accuracy: number
  durability: number
  value: number
}

interface ArmorItem {
  id: string
  type: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  protection: number
  durability: number
  value: number
}

interface InventoryItem {
  id: string
  type: string
  quantity: number
  value: number
}

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

export class ProgressionSystem extends EventEmitter {
  private activeCharacters: Map<string, PlayerCharacter> = new Map()
  private availableSafehouses: Map<string, SafehouseLocation> = new Map()
  private playerSaves: Map<string, SavedProgress> = new Map()
  
  // Game balance constants
  private readonly SAFEHOUSE_COSTS = {
    'residential': 5000,
    'corporate': 15000,
    'underground': 3000,
    'industrial': 8000,
    'wasteland': 2000
  }
  
  private readonly STARTING_CREDITS = 500
  private readonly STARTING_HEALTH = 100

  constructor() {
    super()
    this.initializeSafehouses()
    this.loadPlayerSaves()
  }

  // Create new character (fresh start)
  createNewCharacter(playerId: string, characterName: string, startPosition: Vector2): PlayerCharacter {
    const character: PlayerCharacter = {
      playerId,
      characterName,
      createdAt: Date.now(),
      currentCredits: this.STARTING_CREDITS,
      currentHealth: this.STARTING_HEALTH,
      position: startPosition,
      weapons: [],
      armor: [],
      inventory: [],
      killCount: 0,
      contractsCompleted: 0,
      hacksSuccessful: 0,
      hasSavedProgress: false,
      isAlive: true
    }

    this.activeCharacters.set(playerId, character)
    console.log(`🎮 New character created: ${characterName} (${playerId})`)
    
    this.emit('characterCreated', { playerId, character })
    return character
  }
  
  // Load character from safehouse save
  loadCharacterFromSave(playerId: string, saveData: SavedProgress): PlayerCharacter {
    const character: PlayerCharacter = {
      playerId,
      characterName: saveData.characterName,
      createdAt: Date.now(), // New session time
      currentCredits: saveData.credits,
      currentHealth: this.STARTING_HEALTH, // Always start with full health
      position: this.getSafehouseLocation(saveData.safehouseId),
      weapons: [...saveData.weapons],
      armor: [...saveData.armor],
      inventory: [...saveData.inventory],
      killCount: saveData.killCount,
      contractsCompleted: saveData.contractsCompleted,
      hacksSuccessful: saveData.hacksSuccessful,
      ownedSafehouseId: saveData.safehouseId,
      hasSavedProgress: true,
      isAlive: true
    }

    this.activeCharacters.set(playerId, character)
    console.log(`🏠 Character loaded from safehouse: ${saveData.characterName}`)
    
    this.emit('characterLoaded', { playerId, character, fromSave: true })
    return character
  }

  // Handle permanent character death (lose everything!)
  handleCharacterDeath(playerId: string, killedByPlayerId?: string, deathCause?: string): boolean {
    const character = this.activeCharacters.get(playerId)
    if (!character || !character.isAlive) {
      console.log(`⚠️ Attempted to kill already dead character: ${playerId}`)
      return false
    }

    const survivalTime = Date.now() - character.createdAt
    const creditsLost = character.currentCredits
    const hadSafehouse = !!character.ownedSafehouseId
    
    console.log(`💀 ${character.characterName} died! Lost ${creditsLost} credits and ${character.weapons.length + character.armor.length + character.inventory.length} items`)
    
    // If they had a safehouse, make it available again
    if (character.ownedSafehouseId) {
      this.releaseSafehouse(character.ownedSafehouseId)
    }
    
    // Remove their saved progress if any
    this.playerSaves.delete(playerId)
    
    // Award kill to killer
    if (killedByPlayerId) {
      this.awardKill(killedByPlayerId)
    }
    
    // Remove character completely
    this.activeCharacters.delete(playerId)
    
    // Emit death event
    this.emit('characterDeath', {
      playerId,
      characterName: character.characterName,
      survivalTime,
      creditsLost,
      hadSafehouse,
      deathCause: deathCause || 'unknown',
      mustRecreateCharacter: true
    })
    
    this.savePlayerData()
    return true
  }
  
  // Save progress at safehouse (only works if inside safehouse)
  saveProgressAtSafehouse(playerId: string): boolean {
    const character = this.activeCharacters.get(playerId)
    if (!character || !character.isAlive) {
      return false
    }
    
    // Check if character owns a safehouse and is inside it
    if (!character.ownedSafehouseId) {
      console.log(`⚠️ ${character.characterName} tried to save but doesn't own a safehouse`)
      return false
    }
    
    const safehouse = this.availableSafehouses.get(character.ownedSafehouseId)
    if (!safehouse) {
      console.log(`⚠️ Safehouse ${character.ownedSafehouseId} not found`)
      return false
    }
    
    // Check if player is at the safehouse location
    const distance = Math.sqrt(
      Math.pow(character.position.x - safehouse.location.x, 2) +
      Math.pow(character.position.y - safehouse.location.y, 2)
    )
    
    if (distance > 50) { // Must be within 50 units of safehouse
      console.log(`⚠️ ${character.characterName} is too far from safehouse to save (${Math.floor(distance)} units away)`)
      return false
    }
    
    // Create save data
    const saveData: SavedProgress = {
      characterName: character.characterName,
      savedAt: Date.now(),
      safehouseId: character.ownedSafehouseId,
      credits: character.currentCredits,
      weapons: [...character.weapons],
      armor: [...character.armor],
      inventory: [...character.inventory],
      augmentations: [], // TODO: Implement augmentations
      killCount: character.killCount,
      contractsCompleted: character.contractsCompleted,
      hacksSuccessful: character.hacksSuccessful
    }
    
    this.playerSaves.set(playerId, saveData)
    character.lastSaveTime = Date.now()
    character.hasSavedProgress = true
    
    console.log(`💾 ${character.characterName} saved progress at safehouse with ${character.currentCredits} credits`)
    
    this.emit('progressSaved', { playerId, saveData })
    this.savePlayerData()
    return true
  }

  // Purchase a safehouse
  purchaseSafehouse(playerId: string, safehouseId: string): boolean {
    const character = this.activeCharacters.get(playerId)
    const safehouse = this.availableSafehouses.get(safehouseId)
    
    if (!character || !character.isAlive || !safehouse) {
      return false
    }
    
    if (!safehouse.isAvailable) {
      console.log(`⚠️ Safehouse ${safehouseId} is not available`)
      return false
    }
    
    if (character.currentCredits < safehouse.cost) {
      console.log(`⚠️ ${character.characterName} needs ${safehouse.cost - character.currentCredits} more credits for safehouse`)
      return false
    }
    
    if (character.ownedSafehouseId) {
      console.log(`⚠️ ${character.characterName} already owns a safehouse`)
      return false
    }
    
    // Complete purchase
    character.currentCredits -= safehouse.cost
    character.ownedSafehouseId = safehouseId
    safehouse.isAvailable = false
    safehouse.ownerId = playerId
    
    console.log(`🏠 ${character.characterName} purchased safehouse in ${safehouse.district} for ${safehouse.cost} credits`)
    
    this.emit('safehousePurchased', { 
      playerId, 
      safehouseId, 
      location: safehouse.location, 
      cost: safehouse.cost 
    })
    
    return true
  }

  // Award credits for various actions
  awardCredits(playerId: string, amount: number, reason: string): boolean {
    const character = this.activeCharacters.get(playerId)
    if (!character || !character.isAlive) return false

    character.currentCredits += amount
    console.log(`💰 ${character.characterName} earned ${amount} credits for ${reason} (total: ${character.currentCredits})`)

    this.emit('creditsAwarded', { 
      playerId, 
      amount, 
      reason, 
      totalCredits: character.currentCredits,
      characterName: character.characterName
    })
    return true
  }
  
  // Award kill (increase kill count)
  awardKill(playerId: string): boolean {
    const character = this.activeCharacters.get(playerId)
    if (!character || !character.isAlive) return false
    
    character.killCount++
    this.awardCredits(playerId, 100, 'player elimination') // 100 credits per kill
    
    console.log(`🎯 ${character.characterName} eliminated a player (${character.killCount} total kills)`)
    
    this.emit('killAwarded', { playerId, killCount: character.killCount })
    return true
  }

  // Complete contract
  completeContract(playerId: string, contractValue: number): boolean {
    const character = this.activeCharacters.get(playerId)
    if (!character || !character.isAlive) return false

    character.contractsCompleted++
    this.awardCredits(playerId, contractValue, 'contract completion')

    console.log(`📋 ${character.characterName} completed contract #${character.contractsCompleted}`)
    return true
  }

  // Successful hack
  recordSuccessfulHack(playerId: string, hackReward: number): boolean {
    const character = this.activeCharacters.get(playerId)
    if (!character || !character.isAlive) return false

    character.hacksSuccessful++
    this.awardCredits(playerId, hackReward, 'successful hack')
    
    console.log(`💻 ${character.characterName} successfully hacked target (${character.hacksSuccessful} total hacks)`)
    return true
  }

  // Get character data
  getCharacter(playerId: string): PlayerCharacter | undefined {
    return this.activeCharacters.get(playerId)
  }

  // Check if player has active character
  hasActiveCharacter(playerId: string): boolean {
    const character = this.activeCharacters.get(playerId)
    return character ? character.isAlive : false
  }
  
  // Get player's saved progress (if any)
  getPlayerSave(playerId: string): SavedProgress | undefined {
    return this.playerSaves.get(playerId)
  }
  
  // Check if player can load from save
  canLoadFromSave(playerId: string): boolean {
    return this.playerSaves.has(playerId)
  }

  // Get available safehouses for purchase
  getAvailableSafehouses(): SafehouseLocation[] {
    return Array.from(this.availableSafehouses.values())
      .filter(house => house.isAvailable)
      .sort((a, b) => a.cost - b.cost)
  }
  
  // Helper method to get safehouse location
  private getSafehouseLocation(safehouseId: string): Vector2 {
    const safehouse = this.availableSafehouses.get(safehouseId)
    return safehouse ? safehouse.location : { x: 0, y: 0 }
  }
  
  // Release safehouse (when owner dies)
  private releaseSafehouse(safehouseId: string): void {
    const safehouse = this.availableSafehouses.get(safehouseId)
    if (safehouse) {
      safehouse.isAvailable = true
      safehouse.ownerId = undefined
      console.log(`🏠 Safehouse in ${safehouse.district} is now available for purchase`)
    }
  }
  
  // Initialize default safehouses
  private initializeSafehouses(): void {
    const safehouses: SafehouseLocation[] = [
      {
        id: 'residential_safe_1',
        location: { x: 650, y: 100 },
        cost: this.SAFEHOUSE_COSTS.residential,
        district: 'residential',
        securityLevel: 2,
        isAvailable: true
      },
      {
        id: 'underground_safe_1',
        location: { x: 150, y: -180 },
        cost: this.SAFEHOUSE_COSTS.underground,
        district: 'underground',
        securityLevel: 3,
        isAvailable: true
      },
      {
        id: 'corporate_safe_1',
        location: { x: 300, y: 80 },
        cost: this.SAFEHOUSE_COSTS.corporate,
        district: 'corporate',
        securityLevel: 5,
        isAvailable: true
      },
      {
        id: 'industrial_safe_1',
        location: { x: -200, y: 300 },
        cost: this.SAFEHOUSE_COSTS.industrial,
        district: 'industrial',
        securityLevel: 3,
        isAvailable: true
      }
    ]
    
    safehouses.forEach(house => {
      this.availableSafehouses.set(house.id, house)
    })
    
    console.log(`🏠 Initialized ${safehouses.length} safehouse locations`)
  }
  
  // Load player saves from localStorage
  private loadPlayerSaves(): void {
    try {
      const stored = localStorage.getItem('fixerPlayerSaves')
      if (stored) {
        const saveData = JSON.parse(stored)
        this.playerSaves = new Map(Object.entries(saveData))
        console.log(`💾 Loaded ${this.playerSaves.size} player saves from storage`)
      }
    } catch (error) {
      console.warn('Failed to load player saves:', error)
    }
  }
  
  // Save player data to localStorage
  private savePlayerData(): void {
    try {
      const saveData = Object.fromEntries(this.playerSaves)
      localStorage.setItem('fixerPlayerSaves', JSON.stringify(saveData))
    } catch (error) {
      console.warn('Failed to save player data:', error)
    }
  }
  
  // Update character position
  updateCharacterPosition(playerId: string, position: Vector2): void {
    const character = this.activeCharacters.get(playerId)
    if (character && character.isAlive) {
      character.position = { ...position }
    }
  }
  
  // Cleanup and disconnect
  cleanup(): void {
    this.savePlayerData()
    this.activeCharacters.clear()
  }

  // Debug methods
  getDebugInfo() {
    return {
      activeCharacters: Object.fromEntries(this.activeCharacters),
      availableSafehouses: Object.fromEntries(this.availableSafehouses),
      playerSaves: Object.fromEntries(this.playerSaves)
    }
  }
}