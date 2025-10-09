// Contract system types
export interface Contract {
  id: string;
  type: ContractType;
  fixerId: string;
  playerId?: string;
  target: ContractTarget;
  reward: ContractReward;
  timeLimit: number;
  status: ContractStatus;
  description: string;
  createdAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export enum ContractType {
  ASSASSINATION = 'assassination',
  DATA_EXTRACTION = 'data_extraction',
  TERRITORY_CONTROL = 'territory_control',
  SABOTAGE = 'sabotage',
  ESCORT = 'escort',
  RECOVERY = 'recovery',
  SURVEILLANCE = 'surveillance',
}

export interface ContractTarget {
  id: string;
  type: string;
  position: Vector2;
  data: any;
}

export interface ContractReward {
  credits: number;
  items?: InventoryItem[];
  reputation?: number;
}

export enum ContractStatus {
  AVAILABLE = 'available',
  ACTIVE = 'active',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export interface AIFixer {
  id: string;
  name: string;
  faction: string;
  reputation: number;
  isActive: boolean;
  contracts: Contract[];
}

// Import Vector2 from game types
import { Vector2, InventoryItem } from './game';
