// World generation utilities
import { Vector2 } from './Vector2'
import { Building } from '../entities/Building'
import { Item, Rarity } from '../entities/Item'

export class WorldGenerator {
  private static readonly CHUNK_SIZE = 1000
  // private static readonly BUILDING_DENSITY = 0.3
  // private static readonly ROAD_DENSITY = 0.1
  // private static readonly NPC_DENSITY = 0.05
  // private static readonly LOOT_DENSITY = 0.02

  // Generate a world chunk
  static generateChunk(x: number, y: number, districtType: string): any {
    const seed = this.generateSeed(x, y)
    const random = this.createSeededRandom(seed)

    const chunk = {
      id: this.generateChunkId(x, y),
      x,
      y,
      districtType,
      buildings: this.generateBuildings(random, districtType),
      roads: this.generateRoads(random),
      npcs: this.generateNPCs(random, districtType),
      loot: this.generateLoot(random, districtType),
      generatedAt: new Date().toISOString()
    }

    return chunk
  }

  // Generate buildings for a chunk
  private static generateBuildings(random: () => number, districtType: string): any[] {
    const buildings = []
    const numBuildings = Math.floor(random() * 5) + 2

    for (let i = 0; i < numBuildings; i++) {
      const building = this.createBuilding(random, districtType)
      buildings.push(building)
    }

    return buildings
  }

  private static createBuilding(random: () => number, districtType: string): any {
    const buildingTypes = this.getBuildingTypesForDistrict(districtType)
    const type = buildingTypes[Math.floor(random() * buildingTypes.length)]
    const info = Building.getBuildingTypeInfo(type)

    const position = new Vector2(
      random() * this.CHUNK_SIZE,
      random() * this.CHUNK_SIZE
    )

    const size = new Vector2(
      50 + random() * 100,
      50 + random() * 100
    )

    return {
      id: this.generateId(),
      type,
      position: { x: position.x, y: position.y },
      size: { x: size.x, y: size.y },
      hackable: info.hackable,
      securityLevel: info.securityLevel,
      lootTables: this.generateLootTables(random, info.lootChance),
      isLocked: random() < 0.3,
      owner: random() < 0.1 ? this.generateId() : null,
      faction: this.getFactionForDistrict(districtType)
    }
  }

  // Generate roads for a chunk
  private static generateRoads(random: () => number): any[] {
    const roads = []
    
    // Main roads
    if (random() > 0.3) {
      roads.push({
        id: this.generateId(),
        type: 'main',
        start: { x: 0, y: this.CHUNK_SIZE / 2 },
        end: { x: this.CHUNK_SIZE, y: this.CHUNK_SIZE / 2 },
        width: 80
      })
    }

    if (random() > 0.3) {
      roads.push({
        id: this.generateId(),
        type: 'main',
        start: { x: this.CHUNK_SIZE / 2, y: 0 },
        end: { x: this.CHUNK_SIZE / 2, y: this.CHUNK_SIZE },
        width: 80
      })
    }

    // Secondary roads
    const numSecondaryRoads = Math.floor(random() * 3)
    for (let i = 0; i < numSecondaryRoads; i++) {
      roads.push({
        id: this.generateId(),
        type: 'secondary',
        start: {
          x: random() * this.CHUNK_SIZE,
          y: random() * this.CHUNK_SIZE
        },
        end: {
          x: random() * this.CHUNK_SIZE,
          y: random() * this.CHUNK_SIZE
        },
        width: 40
      })
    }

    return roads
  }

  // Generate NPCs for a chunk
  private static generateNPCs(random: () => number, districtType: string): any[] {
    const npcs = []
    const numNPCs = Math.floor(random() * 3) + 1

    for (let i = 0; i < numNPCs; i++) {
      const npc = this.createNPC(random, districtType)
      npcs.push(npc)
    }

    return npcs
  }

  private static createNPC(random: () => number, districtType: string): any {
    const npcTypes = this.getNPCTypesForDistrict(districtType)
    const type = npcTypes[Math.floor(random() * npcTypes.length)]

    return {
      id: this.generateId(),
      type,
      position: {
        x: random() * this.CHUNK_SIZE,
        y: random() * this.CHUNK_SIZE
      },
      behavior: this.getNPCBehaviorForType(type),
      faction: this.getFactionForDistrict(districtType),
      health: 100,
      level: Math.floor(random() * 10) + 1,
      reputation: Math.floor(random() * 100)
    }
  }

  // Generate loot for a chunk
  private static generateLoot(random: () => number, districtType: string): any[] {
    const loot = []
    const numLoot = Math.floor(random() * 5) + 1

    for (let i = 0; i < numLoot; i++) {
      const item = this.createLootItem(random, districtType)
      loot.push(item)
    }

    return loot
  }

  private static createLootItem(random: () => number, districtType: string): any {
    const itemTypes = this.getItemTypesForDistrict(districtType)
    const type = itemTypes[Math.floor(random() * itemTypes.length)]
    const rarity = this.getRarityForDistrict(districtType, random)

    let item
    switch (type) {
      case 'weapon':
        item = Item.createWeapon(this.getWeaponName(rarity), rarity)
        break
      case 'augmentation':
        item = Item.createAugmentation(
          this.getAugmentationName(rarity),
          this.getAugmentationCategory(random),
          rarity
        )
        break
      case 'consumable':
        item = Item.createConsumable(
          this.getConsumableName(rarity),
          this.getConsumableEffects(rarity),
          rarity
        )
        break
      case 'material':
        item = Item.createMaterial(this.getMaterialName(rarity), rarity)
        break
      case 'data':
        item = Item.createData(this.getDataName(rarity), rarity)
        break
      default:
        item = Item.createConsumable('Unknown Item', {}, rarity)
    }

    return {
      ...item.toJSON(),
      position: {
        x: random() * this.CHUNK_SIZE,
        y: random() * this.CHUNK_SIZE
      }
    }
  }

  // District-specific generation
  private static getBuildingTypesForDistrict(districtType: string): string[] {
    const types = {
      corporate: ['office', 'tower', 'plaza', 'headquarters'],
      residential: ['apartment', 'house', 'complex', 'condo'],
      industrial: ['warehouse', 'factory', 'depot', 'plant'],
      underground: ['hideout', 'club', 'market', 'den'],
      wasteland: ['ruin', 'shack', 'outpost', 'bunker']
    }
    return types[districtType as keyof typeof types] || ['building']
  }

  private static getNPCTypesForDistrict(districtType: string): string[] {
    const types = {
      corporate: ['guard', 'executive', 'security', 'analyst'],
      residential: ['civilian', 'resident', 'worker', 'family'],
      industrial: ['worker', 'foreman', 'technician', 'engineer'],
      underground: ['fixer', 'dealer', 'thug', 'hacker'],
      wasteland: ['scavenger', 'raider', 'survivor', 'nomad']
    }
    return types[districtType as keyof typeof types] || ['npc']
  }

  private static getItemTypesForDistrict(districtType: string): string[] {
    const types = {
      corporate: ['data', 'augmentation', 'weapon', 'consumable'],
      residential: ['consumable', 'material', 'data'],
      industrial: ['material', 'weapon', 'augmentation'],
      underground: ['weapon', 'augmentation', 'data', 'consumable'],
      wasteland: ['material', 'weapon', 'consumable']
    }
    return types[districtType as keyof typeof types] || ['consumable']
  }

  private static getRarityForDistrict(districtType: string, random: () => number): Rarity {
    const rarityWeights = {
      corporate: [0.3, 0.3, 0.25, 0.12, 0.03],
      residential: [0.6, 0.25, 0.1, 0.04, 0.01],
      industrial: [0.5, 0.3, 0.15, 0.04, 0.01],
      underground: [0.2, 0.3, 0.3, 0.15, 0.05],
      wasteland: [0.1, 0.2, 0.3, 0.25, 0.15]
    }

    const weights = rarityWeights[districtType as keyof typeof rarityWeights] || [0.5, 0.3, 0.15, 0.04, 0.01]
    const rarities = [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY]
    
    const randomValue = random()
    let cumulative = 0
    
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i]
      if (randomValue <= cumulative) {
        return rarities[i]
      }
    }
    
    return Rarity.COMMON
  }

  private static getFactionForDistrict(districtType: string): string {
    const factions = {
      corporate: 'corporate',
      residential: 'civilian',
      industrial: 'workers',
      underground: 'criminals',
      wasteland: 'raiders'
    }
    return factions[districtType as keyof typeof factions] || 'neutral'
  }

  private static getNPCBehaviorForType(type: string): string {
    const behaviors = {
      guard: 'patrol',
      civilian: 'idle',
      fixer: 'patrol',
      dealer: 'idle',
      thug: 'aggressive',
      executive: 'patrol'
    }
    return behaviors[type as keyof typeof behaviors] || 'idle'
  }

  // Item generation helpers
  private static getWeaponName(rarity: Rarity): string {
    const names = {
      [Rarity.COMMON]: ['Pistol', 'Knife', 'Club'],
      [Rarity.UNCOMMON]: ['Rifle', 'SMG', 'Sword'],
      [Rarity.RARE]: ['Plasma Gun', 'Cyber Blade', 'Railgun'],
      [Rarity.EPIC]: ['Quantum Rifle', 'Neural Disruptor', 'Gravity Gun'],
      [Rarity.LEGENDARY]: ['Reality Breaker', 'Soul Reaper', 'Time Cannon']
    }
    const nameList = names[rarity] || names[Rarity.COMMON]
    return nameList[Math.floor(Math.random() * nameList.length)]
  }

  private static getAugmentationName(rarity: Rarity): string {
    const names = {
      [Rarity.COMMON]: ['Basic Implant', 'Simple Mod', 'Standard Aug'],
      [Rarity.UNCOMMON]: ['Enhanced Implant', 'Advanced Mod', 'Quality Aug'],
      [Rarity.RARE]: ['Elite Implant', 'Master Mod', 'Premium Aug'],
      [Rarity.EPIC]: ['Legendary Implant', 'Ultimate Mod', 'Divine Aug'],
      [Rarity.LEGENDARY]: ['Mythic Implant', 'Transcendent Mod', 'Godlike Aug']
    }
    const nameList = names[rarity] || names[Rarity.COMMON]
    return nameList[Math.floor(Math.random() * nameList.length)]
  }

  private static getAugmentationCategory(random: () => number): string {
    const categories = ['combat', 'stealth', 'hacking', 'utility']
    return categories[Math.floor(random() * categories.length)]
  }

  private static getConsumableName(rarity: Rarity): string {
    const names = {
      [Rarity.COMMON]: ['Energy Drink', 'Health Pack', 'Basic Stim'],
      [Rarity.UNCOMMON]: ['Power Boost', 'Med Kit', 'Advanced Stim'],
      [Rarity.RARE]: ['Super Stim', 'Combat Drug', 'Neural Enhancer'],
      [Rarity.EPIC]: ['Ultimate Boost', 'Combat Serum', 'Neural Amplifier'],
      [Rarity.LEGENDARY]: ['Godlike Serum', 'Transcendent Boost', 'Reality Enhancer']
    }
    const nameList = names[rarity] || names[Rarity.COMMON]
    return nameList[Math.floor(Math.random() * nameList.length)]
  }

  private static getConsumableEffects(rarity: Rarity): any {
    const effects = {
      [Rarity.COMMON]: { health: 25, credits: 50 },
      [Rarity.UNCOMMON]: { health: 50, credits: 100, experience: 25 },
      [Rarity.RARE]: { health: 100, credits: 250, experience: 50 },
      [Rarity.EPIC]: { health: 200, credits: 500, experience: 100 },
      [Rarity.LEGENDARY]: { health: 500, credits: 1000, experience: 250 }
    }
    return effects[rarity] || effects[Rarity.COMMON]
  }

  private static getMaterialName(rarity: Rarity): string {
    const names = {
      [Rarity.COMMON]: ['Scrap Metal', 'Basic Circuit', 'Simple Wire'],
      [Rarity.UNCOMMON]: ['Refined Metal', 'Advanced Circuit', 'Quality Wire'],
      [Rarity.RARE]: ['Pure Metal', 'Quantum Circuit', 'Neural Wire'],
      [Rarity.EPIC]: ['Exotic Metal', 'Reality Circuit', 'Soul Wire'],
      [Rarity.LEGENDARY]: ['Mythic Metal', 'Transcendent Circuit', 'Godlike Wire']
    }
    const nameList = names[rarity] || names[Rarity.COMMON]
    return nameList[Math.floor(Math.random() * nameList.length)]
  }

  private static getDataName(rarity: Rarity): string {
    const names = {
      [Rarity.COMMON]: ['Basic Data', 'Simple Info', 'Standard File'],
      [Rarity.UNCOMMON]: ['Advanced Data', 'Quality Info', 'Enhanced File'],
      [Rarity.RARE]: ['Elite Data', 'Master Info', 'Premium File'],
      [Rarity.EPIC]: ['Legendary Data', 'Ultimate Info', 'Divine File'],
      [Rarity.LEGENDARY]: ['Mythic Data', 'Transcendent Info', 'Godlike File']
    }
    const nameList = names[rarity] || names[Rarity.COMMON]
    return nameList[Math.floor(Math.random() * nameList.length)]
  }

  // Utility methods
  private static generateSeed(x: number, y: number): number {
    return (x * 1000 + y) % 2147483647
  }

  private static createSeededRandom(seed: number): () => number {
    let currentSeed = seed
    return () => {
      currentSeed = (currentSeed * 16807) % 2147483647
      return currentSeed / 2147483647
    }
  }

  private static generateChunkId(x: number, y: number): string {
    return `chunk_${x}_${y}`
  }

  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  private static generateLootTables(random: () => number, lootChance: number): any[] {
    const tables = []
    const numTables = Math.floor(random() * 3) + 1

    for (let i = 0; i < numTables; i++) {
      tables.push({
        id: this.generateId(),
        items: this.generateLootItems(random),
        dropChance: lootChance
      })
    }

    return tables
  }

  private static generateLootItems(random: () => number): any[] {
    const items = []
    const numItems = Math.floor(random() * 5) + 1

    for (let i = 0; i < numItems; i++) {
      items.push({
        itemId: this.generateId(),
        quantity: Math.floor(random() * 5) + 1,
        weight: random()
      })
    }

    return items
  }
}


