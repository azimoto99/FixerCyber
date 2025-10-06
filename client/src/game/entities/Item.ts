// Item entity
import { Vector2, ItemType, Rarity } from '../../types/game'

export class Item {
  public id: string
  public type: ItemType
  public name: string
  public description: string
  public gridSize: Vector2
  public position: Vector2
  public stats: any
  public rarity: Rarity
  public value: number
  public stackable: boolean
  public stackSize: number
  public durability: number
  public maxDurability: number
  public requirements: any = {}

  constructor(
    id: string,
    type: ItemType,
    name: string,
    description: string = '',
    gridSize: Vector2 = { x: 1, y: 1 },
    rarity: Rarity = Rarity.COMMON
  ) {
    this.id = id
    this.type = type
    this.name = name
    this.description = description
    this.gridSize = gridSize
    this.position = { x: 0, y: 0 }
    this.stats = {}
    this.rarity = rarity
    this.value = 100
    this.stackable = false
    this.stackSize = 1
    this.durability = 100
    this.maxDurability = 100
  }

  // Item usage
  use(player: any): boolean {
    switch (this.type) {
      case ItemType.CONSUMABLE:
        return this.useConsumable(player)
      case ItemType.AUGMENTATION:
        return this.useAugmentation(player)
      case ItemType.WEAPON:
        return this.useWeapon(player)
      default:
        return false
    }
  }

  private useConsumable(player: any): boolean {
    // Apply consumable effects
    if (this.stats.health) {
      player.heal(this.stats.health)
    }
    if (this.stats.credits) {
      player.credits += this.stats.credits
    }
    if (this.stats.experience) {
      player.gainExperience(this.stats.experience)
    }
    
    // Reduce durability
    this.durability -= 1
    return true
  }

  private useAugmentation(player: any): boolean {
    // Install augmentation
    player.installAugmentation(this)
    return true
  }

  private useWeapon(player: any): boolean {
    // Weapon usage is handled by combat system
    return true
  }

  // Durability management
  takeDamage(amount: number) {
    this.durability = Math.max(0, this.durability - amount)
  }

  repair(amount: number) {
    this.durability = Math.min(this.maxDurability, this.durability + amount)
  }

  isBroken(): boolean {
    return this.durability <= 0
  }

  // Item creation
  static createWeapon(name: string, rarity: Rarity = Rarity.COMMON): Item {
    const item = new Item(
      this.generateId(),
      ItemType.WEAPON,
      name,
      'A weapon for combat',
      { x: 2, y: 1 },
      rarity
    )
    
    item.stats = {
      damage: this.getWeaponDamage(rarity),
      accuracy: this.getWeaponAccuracy(rarity),
      range: this.getWeaponRange(rarity),
      fireRate: this.getWeaponFireRate(rarity)
    }
    
    item.value = this.getItemValue(rarity) * 2
    return item
  }

  static createAugmentation(name: string, category: string, rarity: Rarity = Rarity.COMMON): Item {
    const item = new Item(
      this.generateId(),
      ItemType.AUGMENTATION,
      name,
      'A cybernetic augmentation',
      { x: 1, y: 1 },
      rarity
    )
    
    item.stats = {
      category,
      effects: this.getAugmentationEffects(category, rarity),
      powerCost: this.getAugmentationPowerCost(rarity)
    }
    
    item.value = this.getItemValue(rarity) * 3
    return item
  }

  static createConsumable(name: string, effects: any, rarity: Rarity = Rarity.COMMON): Item {
    const item = new Item(
      this.generateId(),
      ItemType.CONSUMABLE,
      name,
      'A consumable item',
      { x: 1, y: 1 },
      rarity
    )
    
    item.stats = effects
    item.stackable = true
    item.stackSize = 10
    item.value = this.getItemValue(rarity)
    return item
  }

  static createMaterial(name: string, rarity: Rarity = Rarity.COMMON): Item {
    const item = new Item(
      this.generateId(),
      ItemType.MATERIAL,
      name,
      'A crafting material',
      { x: 1, y: 1 },
      rarity
    )
    
    item.stats = {
      materialType: 'generic',
      quality: this.getMaterialQuality(rarity)
    }
    
    item.stackable = true
    item.stackSize = 50
    item.value = this.getItemValue(rarity) * 0.5
    return item
  }

  static createData(name: string, rarity: Rarity = Rarity.COMMON): Item {
    const item = new Item(
      this.generateId(),
      ItemType.DATA,
      name,
      'Digital data',
      { x: 1, y: 1 },
      rarity
    )
    
    item.stats = {
      dataType: 'generic',
      value: this.getDataValue(rarity),
      securityLevel: this.getDataSecurityLevel(rarity)
    }
    
    item.value = this.getItemValue(rarity) * 1.5
    return item
  }

  // Utility methods
  private static getWeaponDamage(rarity: Rarity): number {
    const damages = {
      [Rarity.COMMON]: 25,
      [Rarity.UNCOMMON]: 35,
      [Rarity.RARE]: 50,
      [Rarity.EPIC]: 70,
      [Rarity.LEGENDARY]: 100
    }
    return damages[rarity] || 25
  }

  private static getWeaponAccuracy(rarity: Rarity): number {
    const accuracies = {
      [Rarity.COMMON]: 70,
      [Rarity.UNCOMMON]: 75,
      [Rarity.RARE]: 80,
      [Rarity.EPIC]: 85,
      [Rarity.LEGENDARY]: 90
    }
    return accuracies[rarity] || 70
  }

  private static getWeaponRange(rarity: Rarity): number {
    const ranges = {
      [Rarity.COMMON]: 100,
      [Rarity.UNCOMMON]: 150,
      [Rarity.RARE]: 200,
      [Rarity.EPIC]: 250,
      [Rarity.LEGENDARY]: 300
    }
    return ranges[rarity] || 100
  }

  private static getWeaponFireRate(rarity: Rarity): number {
    const fireRates = {
      [Rarity.COMMON]: 1,
      [Rarity.UNCOMMON]: 1.2,
      [Rarity.RARE]: 1.5,
      [Rarity.EPIC]: 2,
      [Rarity.LEGENDARY]: 3
    }
    return fireRates[rarity] || 1
  }

  private static getAugmentationEffects(category: string, rarity: Rarity): any {
    const effects = {
      combat: {
        health: this.getAugmentationStat(rarity, 10, 50),
        damage: this.getAugmentationStat(rarity, 5, 25),
        accuracy: this.getAugmentationStat(rarity, 5, 20)
      },
      stealth: {
        detection: this.getAugmentationStat(rarity, -10, -50),
        speed: this.getAugmentationStat(rarity, 5, 25),
        invisibility: rarity === Rarity.LEGENDARY ? 1 : 0
      },
      hacking: {
        speed: this.getAugmentationStat(rarity, 10, 50),
        bypass: this.getAugmentationStat(rarity, 5, 25),
        heat: this.getAugmentationStat(rarity, -5, -25)
      },
      utility: {
        storage: this.getAugmentationStat(rarity, 5, 25),
        credits: this.getAugmentationStat(rarity, 10, 50),
        experience: this.getAugmentationStat(rarity, 5, 25)
      }
    }
    return effects[category as keyof typeof effects] || {}
  }

  private static getAugmentationStat(rarity: Rarity, min: number, max: number): number {
    const multipliers = {
      [Rarity.COMMON]: 0.2,
      [Rarity.UNCOMMON]: 0.4,
      [Rarity.RARE]: 0.6,
      [Rarity.EPIC]: 0.8,
      [Rarity.LEGENDARY]: 1.0
    }
    const multiplier = multipliers[rarity] || 0.2
    return Math.floor(min + (max - min) * multiplier)
  }

  private static getAugmentationPowerCost(rarity: Rarity): number {
    const costs = {
      [Rarity.COMMON]: 5,
      [Rarity.UNCOMMON]: 10,
      [Rarity.RARE]: 20,
      [Rarity.EPIC]: 35,
      [Rarity.LEGENDARY]: 50
    }
    return costs[rarity] || 5
  }

  private static getMaterialQuality(rarity: Rarity): number {
    const qualities = {
      [Rarity.COMMON]: 1,
      [Rarity.UNCOMMON]: 2,
      [Rarity.RARE]: 3,
      [Rarity.EPIC]: 4,
      [Rarity.LEGENDARY]: 5
    }
    return qualities[rarity] || 1
  }

  private static getDataValue(rarity: Rarity): number {
    const values = {
      [Rarity.COMMON]: 100,
      [Rarity.UNCOMMON]: 250,
      [Rarity.RARE]: 500,
      [Rarity.EPIC]: 1000,
      [Rarity.LEGENDARY]: 2500
    }
    return values[rarity] || 100
  }

  private static getDataSecurityLevel(rarity: Rarity): number {
    const levels = {
      [Rarity.COMMON]: 1,
      [Rarity.UNCOMMON]: 2,
      [Rarity.RARE]: 3,
      [Rarity.EPIC]: 4,
      [Rarity.LEGENDARY]: 5
    }
    return levels[rarity] || 1
  }

  private static getItemValue(rarity: Rarity): number {
    const values = {
      [Rarity.COMMON]: 100,
      [Rarity.UNCOMMON]: 300,
      [Rarity.RARE]: 800,
      [Rarity.EPIC]: 2000,
      [Rarity.LEGENDARY]: 5000
    }
    return values[rarity] || 100
  }

  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      description: this.description,
      gridSize: this.gridSize,
      position: this.position,
      stats: this.stats,
      rarity: this.rarity,
      value: this.value,
      stackable: this.stackable,
      stackSize: this.stackSize,
      durability: this.durability,
      maxDurability: this.maxDurability,
      requirements: this.requirements
    }
  }

  static fromJSON(data: any): Item {
    const item = new Item(
      data.id,
      data.type,
      data.name,
      data.description,
      data.gridSize,
      data.rarity
    )
    
    item.position = data.position
    item.stats = data.stats
    item.value = data.value
    item.stackable = data.stackable
    item.stackSize = data.stackSize
    item.durability = data.durability
    item.maxDurability = data.maxDurability
    item.requirements = data.requirements
    
    return item
  }
}


