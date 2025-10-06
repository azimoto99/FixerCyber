// Shared type definitions
export interface Vector2 {
  x: number
  y: number
}

export interface Player {
  id: string
  userId: string
  username: string
  position: Vector2
  health: number
  credits: number
  isAlive: boolean
  lastSeen: Date
}

export interface Contract {
  id: string
  type: string
  fixerId: string
  playerId?: string
  targetData: any
  rewardCredits: number
  timeLimit: number
  status: string
  description?: string
  createdAt: Date
  completedAt?: Date
  cancelledAt?: Date
}

export interface WorldChunk {
  id: string
  x: number
  y: number
  districtType: string
  generatedData: any
  generatedAt: Date
  lastAccessed: Date
}

export interface GameEvent {
  type: string
  playerId: string
  data: any
  timestamp: Date
}

export interface CombatEvent extends GameEvent {
  type: 'shoot' | 'damage' | 'death'
  targetId?: string
  weapon?: string
  damage?: number
}

export interface HackEvent extends GameEvent {
  type: 'hack_attempt' | 'hack_success' | 'hack_failure'
  target: string
  difficulty: number
}

export interface ContractEvent extends GameEvent {
  type: 'contract_accepted' | 'contract_completed' | 'contract_cancelled'
  contractId: string
  reward?: number
}



