// Core game types
export interface Vector2 {
  x: number
  y: number
  width?: number
  height?: number
  distanceTo?(other: Vector2): number
  toJSON?(): { x: number; y: number }
}

export interface Player {
  id: string
  username: string
  position: Vector2
  health: number
  credits: number
  inventory: InventoryItem[]
  augmentations: Augmentation[]
  housing: Housing | null
  isAlive: boolean
  lastSeen: Date
}

export interface InventoryItem {
  id: string
  type: ItemType
  name: string
  gridSize: Vector2
  position: Vector2
  stats: ItemStats
}

export interface ItemStats {
  damage?: number
  accuracy?: number
  range?: number
  durability?: number
  rarity: Rarity
}

export enum ItemType {
  WEAPON = 'weapon',
  AUGMENTATION = 'augmentation',
  CONSUMABLE = 'consumable',
  MATERIAL = 'material',
  DATA = 'data',
  ARMOR = 'armor',
  UTILITY = 'utility'
}

export enum Rarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export interface Augmentation {
  id: string
  name: string
  category: AugCategory
  effects: AugEffect[]
  powerCost: number
  rarity: Rarity
}

export enum AugCategory {
  COMBAT = 'combat',
  STEALTH = 'stealth',
  HACKING = 'hacking',
  UTILITY = 'utility'
}

export interface AugEffect {
  type: string
  value: number
  duration?: number
}

export interface Housing {
  id: string
  type: HousingType
  district: string
  position: Vector2
  rentCost: number
  storage: StorageSpace
  features: HousingFeature[]
}

export enum HousingType {
  SLUM_APARTMENT = 'slum',
  RESIDENTIAL = 'residential',
  CORPORATE_SUITE = 'corporate'
}

export interface StorageSpace {
  capacity: number
  used: number
}

export interface HousingFeature {
  type: string
  level: number
  description: string
}



