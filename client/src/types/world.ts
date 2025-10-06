// World generation and management types
export interface CityChunk {
  id: string
  x: number
  y: number
  districtType: DistrictType
  buildings: Building[]
  roads: Road[]
  generated: boolean
  lastAccessed: Date
}

export enum DistrictType {
  CORPORATE = 'corporate',
  RESIDENTIAL = 'residential',
  INDUSTRIAL = 'industrial',
  UNDERGROUND = 'underground',
  WASTELAND = 'wasteland'
}

export interface Building {
  id: string
  type: BuildingType
  position: Vector2
  size: Vector2
  hackable: boolean
  securityLevel: number
  lootTables: LootTable[]
}

export enum BuildingType {
  OFFICE = 'office',
  APARTMENT = 'apartment',
  WAREHOUSE = 'warehouse',
  SHOP = 'shop',
  HIDEOUT = 'hideout',
  TOWER = 'tower',
  FACTORY = 'factory'
}

export interface Road {
  id: string
  type: RoadType
  start: Vector2
  end: Vector2
  width: number
}

export enum RoadType {
  MAIN = 'main',
  SECONDARY = 'secondary',
  ALLEY = 'alley'
}

export interface LootTable {
  id: string
  items: LootItem[]
  dropChance: number
}

export interface LootItem {
  itemId: string
  quantity: number
  weight: number
}

export interface NPC {
  id: string
  type: NPCType
  position: Vector2
  behavior: NPCBehavior
  faction: string
  health: number
  level: number
}

export enum NPCType {
  GUARD = 'guard',
  CIVILIAN = 'civilian',
  FIXER = 'fixer',
  DEALER = 'dealer',
  THUG = 'thug',
  EXECUTIVE = 'executive'
}

export enum NPCBehavior {
  PATROL = 'patrol',
  IDLE = 'idle',
  AGGRESSIVE = 'aggressive',
  FLEEING = 'fleeing'
}

export interface WorldState {
  chunks: CityChunk[]
  currentChunk: string
  timeOfDay: number
  weather: WeatherType
}

export enum WeatherType {
  CLEAR = 'clear',
  RAIN = 'rain',
  FOG = 'fog',
  STORM = 'storm'
}

// Import Vector2 from game types
import { Vector2 } from './game'



