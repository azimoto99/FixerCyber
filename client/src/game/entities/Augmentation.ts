// Augmentation entity for cyberpunk augmentations
import { AugCategory, Rarity } from '../../types/game'

export class Augmentation {
  public id: string
  public name: string
  public description: string
  public category: AugCategory
  public effects: any
  public powerCost: number
  public rarity: Rarity
  public isInstalled: boolean = false
  public installationCost: number
  public requirements: any = {}
  public durability: number = 100
  public maxDurability: number = 100

  constructor(
    id: string,
    name: string,
    description: string,
    category: AugCategory,
    effects: any,
    powerCost: number,
    rarity: Rarity
  ) {
    this.id = id
    this.name = name
    this.description = description
    this.category = category
    this.effects = effects
    this.powerCost = powerCost
    this.rarity = rarity
    this.installationCost = this.calculateInstallationCost()
  }

  // Installation
  canInstall(player: any): boolean {
    // Check if player has enough credits
    if (player.credits < this.installationCost) return false
    
    // Check if player has enough power capacity
    if (player.powerCapacity < this.powerCost) return false
    
    // Check requirements
    for (const [requirement, value] of Object.entries(this.requirements)) {
      if (player[requirement] < value) return false
    }
    
    return true
  }

  install(player: any): boolean {
    if (this.isInstalled) return false
    if (!this.canInstall(player)) return false

    this.isInstalled = true
    this.applyEffects(player)
    return true
  }

  uninstall(player: any): boolean {
    if (!this.isInstalled) return false

    this.isInstalled = false
    this.removeEffects(player)
    return true
  }

  private checkRequirements(player: any): boolean {
    // Check level requirement
    if (this.requirements.level && player.level < this.requirements.level) return false

    // Check reputation requirement
    if (this.requirements.reputation && player.reputation < this.requirements.reputation) return false

    // Check other augmentations requirement
    if (this.requirements.augmentations) {
      for (const augId of this.requirements.augmentations) {
        if (!player.hasAugmentation(augId)) return false
      }
    }

    return true
  }

  private applyEffects(player: any): void {
    switch (this.category) {
      case AugCategory.COMBAT:
        this.applyCombatEffects(player)
        break
      case AugCategory.STEALTH:
        this.applyStealthEffects(player)
        break
      case AugCategory.HACKING:
        this.applyHackingEffects(player)
        break
      case AugCategory.UTILITY:
        this.applyUtilityEffects(player)
        break
    }
  }

  private removeEffects(player: any): void {
    switch (this.category) {
      case AugCategory.COMBAT:
        this.removeCombatEffects(player)
        break
      case AugCategory.STEALTH:
        this.removeStealthEffects(player)
        break
      case AugCategory.HACKING:
        this.removeHackingEffects(player)
        break
      case AugCategory.UTILITY:
        this.removeUtilityEffects(player)
        break
    }
  }

  private applyCombatEffects(player: any): void {
    if (this.effects.health) {
      player.maxHealth += this.effects.health
      player.health += this.effects.health
    }
    if (this.effects.damage) {
      player.damageMultiplier = (player.damageMultiplier || 1) + this.effects.damage / 100
    }
    if (this.effects.accuracy) {
      player.accuracyBonus = (player.accuracyBonus || 0) + this.effects.accuracy
    }
    if (this.effects.armor) {
      player.armor = (player.armor || 0) + this.effects.armor
    }
  }

  private removeCombatEffects(player: any): void {
    if (this.effects.health) {
      player.maxHealth -= this.effects.health
      player.health = Math.min(player.health, player.maxHealth)
    }
    if (this.effects.damage) {
      player.damageMultiplier = (player.damageMultiplier || 1) - this.effects.damage / 100
    }
    if (this.effects.accuracy) {
      player.accuracyBonus = (player.accuracyBonus || 0) - this.effects.accuracy
    }
    if (this.effects.armor) {
      player.armor = (player.armor || 0) - this.effects.armor
    }
  }

  private applyStealthEffects(player: any): void {
    if (this.effects.detection) {
      player.detectionChance = Math.max(0, (player.detectionChance || 1) + this.effects.detection / 100)
    }
    if (this.effects.speed) {
      player.speedMultiplier = (player.speedMultiplier || 1) + this.effects.speed / 100
    }
    if (this.effects.invisibility) {
      player.invisibilityChance = (player.invisibilityChance || 0) + this.effects.invisibility
    }
  }

  private removeStealthEffects(player: any): void {
    if (this.effects.detection) {
      player.detectionChance = Math.min(1, (player.detectionChance || 1) - this.effects.detection / 100)
    }
    if (this.effects.speed) {
      player.speedMultiplier = (player.speedMultiplier || 1) - this.effects.speed / 100
    }
    if (this.effects.invisibility) {
      player.invisibilityChance = Math.max(0, (player.invisibilityChance || 0) - this.effects.invisibility)
    }
  }

  private applyHackingEffects(player: any): void {
    if (this.effects.hackSpeed) {
      player.hackSpeedMultiplier = (player.hackSpeedMultiplier || 1) + this.effects.hackSpeed / 100
    }
    if (this.effects.bypass) {
      player.bypassChance = (player.bypassChance || 0) + this.effects.bypass / 100
    }
    if (this.effects.heat) {
      player.heatReduction = (player.heatReduction || 0) + this.effects.heat / 100
    }
    if (this.effects.programs) {
      player.availablePrograms = [...(player.availablePrograms || []), ...this.effects.programs]
    }
  }

  private removeHackingEffects(player: any): void {
    if (this.effects.hackSpeed) {
      player.hackSpeedMultiplier = (player.hackSpeedMultiplier || 1) - this.effects.hackSpeed / 100
    }
    if (this.effects.bypass) {
      player.bypassChance = Math.max(0, (player.bypassChance || 0) - this.effects.bypass / 100)
    }
    if (this.effects.heat) {
      player.heatReduction = Math.max(0, (player.heatReduction || 0) - this.effects.heat / 100)
    }
    if (this.effects.programs) {
      player.availablePrograms = (player.availablePrograms || []).filter(
        (program: string) => !this.effects.programs.includes(program)
      )
    }
  }

  private applyUtilityEffects(player: any): void {
    if (this.effects.storage) {
      player.inventoryCapacity = (player.inventoryCapacity || 60) + this.effects.storage
    }
    if (this.effects.credits) {
      player.creditMultiplier = (player.creditMultiplier || 1) + this.effects.credits / 100
    }
    if (this.effects.experience) {
      player.experienceMultiplier = (player.experienceMultiplier || 1) + this.effects.experience / 100
    }
    if (this.effects.health) {
      player.maxHealth += this.effects.health
      player.health += this.effects.health
    }
  }

  private removeUtilityEffects(player: any): void {
    if (this.effects.storage) {
      player.inventoryCapacity = Math.max(60, (player.inventoryCapacity || 60) - this.effects.storage)
    }
    if (this.effects.credits) {
      player.creditMultiplier = (player.creditMultiplier || 1) - this.effects.credits / 100
    }
    if (this.effects.experience) {
      player.experienceMultiplier = (player.experienceMultiplier || 1) - this.effects.experience / 100
    }
    if (this.effects.health) {
      player.maxHealth -= this.effects.health
      player.health = Math.min(player.health, player.maxHealth)
    }
  }

  private calculateInstallationCost(): number {
    const baseCost = this.getBaseCost()
    const rarityMultiplier = this.getRarityMultiplier()
    const powerMultiplier = 1 + (this.powerCost / 100)
    
    return Math.floor(baseCost * rarityMultiplier * powerMultiplier)
  }

  private getBaseCost(): number {
    const costs = {
      [AugCategory.COMBAT]: 1000,
      [AugCategory.STEALTH]: 800,
      [AugCategory.HACKING]: 1200,
      [AugCategory.UTILITY]: 600
    }
    return costs[this.category] || 1000
  }

  private getRarityMultiplier(): number {
    const multipliers = {
      [Rarity.COMMON]: 1,
      [Rarity.UNCOMMON]: 1.5,
      [Rarity.RARE]: 2.5,
      [Rarity.EPIC]: 5,
      [Rarity.LEGENDARY]: 10
    }
    return multipliers[this.rarity] || 1
  }

  // Create augmentation from data
  static createFromData(data: any): Augmentation {
    return new Augmentation(
      data.id,
      data.name,
      data.description,
      data.category,
      data.effects,
      data.powerCost,
      data.rarity
    )
  }

  // Create random augmentation
  static createRandom(category: AugCategory, rarity: Rarity): Augmentation {
    const names = this.getNamesForCategory(category)
    const name = names[Math.floor(Math.random() * names.length)]
    const description = this.getDescriptionForCategory(category)
    const effects = this.getEffectsForCategory(category, rarity)
    const powerCost = this.getPowerCostForRarity(rarity)

    return new Augmentation(
      Math.random().toString(36).substr(2, 9),
      name,
      description,
      category,
      effects,
      powerCost,
      rarity
    )
  }

  private static getNamesForCategory(category: AugCategory): string[] {
    const names = {
      [AugCategory.COMBAT]: [
        'Reinforced Skeleton',
        'Targeting System',
        'Combat Reflexes',
        'Pain Suppressor',
        'Adrenaline Boost'
      ],
      [AugCategory.STEALTH]: [
        'Thermoptic Camo',
        'Sound Dampener',
        'Motion Detector',
        'Stealth Field',
        'Shadow Cloak'
      ],
      [AugCategory.HACKING]: [
        'Neural Interface',
        'Data Jack',
        'Cyber Deck',
        'Neural Net',
        'Brain Implant'
      ],
      [AugCategory.UTILITY]: [
        'Storage Implant',
        'Credit Booster',
        'Experience Enhancer',
        'Health Regenerator',
        'Power Core'
      ]
    }
    return names[category] || []
  }

  private static getDescriptionForCategory(category: AugCategory): string {
    const descriptions = {
      [AugCategory.COMBAT]: 'Enhances combat capabilities',
      [AugCategory.STEALTH]: 'Improves stealth and detection avoidance',
      [AugCategory.HACKING]: 'Boosts hacking abilities and neural interface',
      [AugCategory.UTILITY]: 'Provides utility and quality of life improvements'
    }
    return descriptions[category] || 'Unknown augmentation'
  }

  private static getEffectsForCategory(category: AugCategory, rarity: Rarity): any {
    const baseEffects = {
      [AugCategory.COMBAT]: { health: 10, damage: 5, accuracy: 5, armor: 5 },
      [AugCategory.STEALTH]: { detection: -10, speed: 5, invisibility: 0.1 },
      [AugCategory.HACKING]: { hackSpeed: 10, bypass: 5, heat: -5, programs: [] },
      [AugCategory.UTILITY]: { storage: 5, credits: 10, experience: 5, health: 5 }
    }

    const base = baseEffects[category] || {}
    const multiplier = this.getRarityMultiplier(rarity)
    
    const effects = { ...base }
    for (const key in effects) {
      if (typeof effects[key] === 'number') {
        effects[key] = Math.floor(effects[key] * multiplier)
      }
    }
    
    return effects
  }

  private static getPowerCostForRarity(rarity: Rarity): number {
    const costs = {
      [Rarity.COMMON]: 5,
      [Rarity.UNCOMMON]: 10,
      [Rarity.RARE]: 20,
      [Rarity.EPIC]: 35,
      [Rarity.LEGENDARY]: 50
    }
    return costs[rarity] || 5
  }

  private static getRarityMultiplier(rarity: Rarity): number {
    const multipliers = {
      [Rarity.COMMON]: 0.2,
      [Rarity.UNCOMMON]: 0.4,
      [Rarity.RARE]: 0.6,
      [Rarity.EPIC]: 0.8,
      [Rarity.LEGENDARY]: 1.0
    }
    return multipliers[rarity] || 0.2
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      effects: this.effects,
      powerCost: this.powerCost,
      rarity: this.rarity,
      isInstalled: this.isInstalled,
      installationCost: this.installationCost,
      requirements: this.requirements
    }
  }

  static fromJSON(data: any): Augmentation {
    const augmentation = new Augmentation(
      data.id,
      data.name,
      data.description,
      data.category,
      data.effects,
      data.powerCost,
      data.rarity
    )
    
    augmentation.isInstalled = data.isInstalled || false
    augmentation.installationCost = data.installationCost || augmentation.installationCost
    augmentation.requirements = data.requirements || {}
    
    return augmentation
  }
}


