// Shared type definitions
export interface Vector2 {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  userId: string;
  username: string;
  position: Vector2;
  health: number;
  credits: number;
  isAlive: boolean;
  lastSeen: Date;
}

export interface Contract {
  id: string;
  type: string;
  fixerId: string;
  playerId?: string;
  targetData: any;
  rewardCredits: number;
  timeLimit: number;
  status: string;
  description?: string;
  createdAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

// World Generation Types
export enum DistrictType {
  CORPORATE = 'corporate',
  INDUSTRIAL = 'industrial',
  RESIDENTIAL = 'residential',
  UNDERGROUND = 'underground',
  WASTELAND = 'wasteland'
}

export interface WorldChunk {
  id: string;
  x: number;
  y: number;
  districtType: DistrictType;
  generatedData: ChunkData;
  generatedAt: Date;
  lastAccessed: Date;
}

export interface ChunkData {
  tiles: Tile[][];
  buildings: Building[];
  roads: Road[];
  lootSpawns: LootSpawn[];
  npcs: NPC[];
  seed: number;
  generatedAt: string;
}

export interface Tile {
  x: number;
  y: number;
  type: TileType;
  walkable: boolean;
  height: number;
  districtType: DistrictType;
}

export enum TileType {
  GROUND = 'ground',
  ROAD = 'road',
  BUILDING = 'building',
  WATER = 'water',
  DEBRIS = 'debris'
}

export interface Building {
  id: string;
  type: BuildingType;
  position: Vector2;
  size: Vector2;
  rotation: number;
  hackable: boolean;
  securityLevel: number;
  entrances: Vector2[];
  interior?: BuildingInterior;
}

export enum BuildingType {
  // Corporate
  OFFICE = 'office',
  TOWER = 'tower',
  PLAZA = 'plaza',
  HEADQUARTERS = 'headquarters',
  
  // Residential
  APARTMENT = 'apartment',
  HOUSE = 'house',
  COMPLEX = 'complex',
  CONDO = 'condo',
  
  // Industrial
  WAREHOUSE = 'warehouse',
  FACTORY = 'factory',
  DEPOT = 'depot',
  PLANT = 'plant',
  
  // Underground
  HIDEOUT = 'hideout',
  CLUB = 'club',
  MARKET = 'market',
  DEN = 'den',
  
  // Wasteland
  RUIN = 'ruin',
  SHACK = 'shack',
  OUTPOST = 'outpost',
  BUNKER = 'bunker'
}

export interface BuildingInterior {
  rooms: Room[];
  corridors: Corridor[];
  hackableObjects: HackableObject[];
}

export interface Room {
  id: string;
  type: RoomType;
  bounds: Rectangle;
  connections: string[];
}

export enum RoomType {
  OFFICE = 'office',
  BEDROOM = 'bedroom',
  KITCHEN = 'kitchen',
  BATHROOM = 'bathroom',
  STORAGE = 'storage',
  SERVER_ROOM = 'server_room',
  SECURITY = 'security',
  LOBBY = 'lobby'
}

export interface Corridor {
  id: string;
  start: Vector2;
  end: Vector2;
  width: number;
}

export interface HackableObject {
  id: string;
  type: HackableObjectType;
  position: Vector2;
  securityLevel: number;
  data: any;
}

export enum HackableObjectType {
  PHONE = 'phone',
  COMPUTER = 'computer',
  TERMINAL = 'terminal',
  CAMERA = 'camera',
  DOOR_LOCK = 'door_lock',
  ELEVATOR = 'elevator'
}

export interface Road {
  id: string;
  type: RoadType;
  points: Vector2[];
  width: number;
  connections: string[];
}

export enum RoadType {
  MAIN = 'main',
  SECONDARY = 'secondary',
  ALLEY = 'alley'
}

export interface LootSpawn {
  id: string;
  position: Vector2;
  lootTable: string;
  respawnTime: number;
  lastSpawned?: Date;
}

export interface NPC {
  id: string;
  type: string;
  position: Vector2;
  behavior: NPCBehavior;
  faction: string;
  health: number;
  level: number;
  patrolRoute?: Vector2[];
}

export enum NPCBehavior {
  IDLE = 'idle',
  PATROL = 'patrol',
  GUARD = 'guard',
  AGGRESSIVE = 'aggressive',
  FLEEING = 'fleeing',
  WORK = 'work'
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Circle {
  center: Vector2;
  radius: number;
}

// Pathfinding types
export interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic cost to goal
  f: number; // Total cost
  parent?: PathNode;
}

export interface GameEvent {
  type: string;
  playerId: string;
  data: any;
  timestamp: Date;
}

export interface CombatEvent extends GameEvent {
  type: 'shoot' | 'damage' | 'death';
  targetId?: string;
  weapon?: string;
  damage?: number;
}

export interface HackEvent extends GameEvent {
  type: 'hack_attempt' | 'hack_success' | 'hack_failure';
  target: string;
  difficulty: number;
}

export interface ContractEvent extends GameEvent {
  type: 'contract_accepted' | 'contract_completed' | 'contract_cancelled';
  contractId: string;
  reward?: number;
}
