// Player entity
import { Vector2 } from '../../types/game'

export class Player {
  public id: string
  public username: string
  public position: Vector2
  public health: number
  public maxHealth: number
  public credits: number
  public isAlive: boolean
  public lastSeen: Date
  public augmentations: Map<string, any> = new Map()
  public housing: string | null = null
  public reputation: number = 0
  public level: number = 1
  public experience: number = 0

  constructor(id: string, username: string, position: Vector2) {
    this.id = id
    this.username = username
    this.position = position
    this.health = 100
    this.maxHealth = 100
    this.credits = 0
    this.isAlive = true
    this.lastSeen = new Date()
  }

  // Movement
  moveTo(position: Vector2) {
    this.position = position
    this.lastSeen = new Date()
  }

  // Health management
  takeDamage(damage: number) {
    this.health = Math.max(0, this.health - damage)
    if (this.health <= 0) {
      this.die()
    }
  }

  heal(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + amount)
  }

  die() {
    this.isAlive = false
    this.health = 0
    // Drop items, lose credits, etc.
  }

  respawn() {
    this.isAlive = true
    this.health = this.maxHealth
    // Reset position to spawn or housing
  }

  // Augmentation system
  installAugmentation(augmentation: any) {
    this.augmentations.set(augmentation.id, augmentation)
    this.applyAugmentationEffects(augmentation)
  }

  removeAugmentation(augmentationId: string) {
    const augmentation = this.augmentations.get(augmentationId)
    if (augmentation) {
      this.removeAugmentationEffects(augmentation)
      this.augmentations.delete(augmentationId)
    }
  }

  private applyAugmentationEffects(augmentation: any) {
    // Apply augmentation effects to player stats
    switch (augmentation.category) {
      case 'combat':
        this.maxHealth += augmentation.effects.health || 0
        break
      case 'stealth':
        // Apply stealth effects
        break
      case 'hacking':
        // Apply hacking effects
        break
      case 'utility':
        // Apply utility effects
        break
    }
  }

  private removeAugmentationEffects(augmentation: any) {
    // Remove augmentation effects from player stats
    switch (augmentation.category) {
      case 'combat':
        this.maxHealth -= augmentation.effects.health || 0
        break
      case 'stealth':
        // Remove stealth effects
        break
      case 'hacking':
        // Remove hacking effects
        break
      case 'utility':
        // Remove utility effects
        break
    }
  }

  // Experience and leveling
  gainExperience(amount: number) {
    this.experience += amount
    this.checkLevelUp()
  }

  private checkLevelUp() {
    const requiredExp = this.getRequiredExperience(this.level + 1)
    if (this.experience >= requiredExp) {
      this.levelUp()
    }
  }

  private levelUp() {
    this.level += 1
    this.maxHealth += 10
    this.health = this.maxHealth
    // Award skill points, etc.
  }

  private getRequiredExperience(level: number): number {
    return level * 1000 // Simple formula
  }

  // Housing system
  purchaseHousing(housingId: string, cost: number): boolean {
    if (this.credits >= cost) {
      this.credits -= cost
      this.housing = housingId
      return true
    }
    return false
  }

  // Getters
  getAugmentations(): any[] {
    return Array.from(this.augmentations.values())
  }

  getHealthPercentage(): number {
    return (this.health / this.maxHealth) * 100
  }

  getExperiencePercentage(): number {
    const currentLevelExp = this.getRequiredExperience(this.level)
    const nextLevelExp = this.getRequiredExperience(this.level + 1)
    const progress = this.experience - currentLevelExp
    const required = nextLevelExp - currentLevelExp
    return (progress / required) * 100
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      position: this.position,
      health: this.health,
      maxHealth: this.maxHealth,
      credits: this.credits,
      isAlive: this.isAlive,
      lastSeen: this.lastSeen,
      housing: this.housing,
      reputation: this.reputation,
      level: this.level,
      experience: this.experience,
      augmentations: Array.from(this.augmentations.values())
    }
  }

  static fromJSON(data: any): Player {
    const player = new Player(data.id, data.username, data.position)
    player.health = data.health
    player.maxHealth = data.maxHealth
    player.credits = data.credits
    player.isAlive = data.isAlive
    player.lastSeen = new Date(data.lastSeen)
    player.housing = data.housing
    player.reputation = data.reputation
    player.level = data.level
    player.experience = data.experience
    
    if (data.augmentations) {
      data.augmentations.forEach((aug: any) => {
        player.augmentations.set(aug.id, aug)
      })
    }
    
    return player
  }
}


