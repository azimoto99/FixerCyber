import { create } from 'zustand';

interface GameState {
  isAuthenticated: boolean;
  currentView: 'login' | 'register' | 'game';
  player: Player | null;
  world: WorldState | null;
  contracts: Contract[];
  inventory: InventoryItem[];

  // Actions
  setAuthenticated: (authenticated: boolean) => void;
  setCurrentView: (view: 'login' | 'register' | 'game') => void;
  setPlayer: (player: Player | null) => void;
  setWorld: (world: WorldState | null) => void;
  setContracts: (contracts: Contract[]) => void;
  setInventory: (inventory: InventoryItem[]) => void;
}

export const useGameStore = create<GameState>(set => ({
  isAuthenticated: false,
  currentView: 'login',
  player: null,
  world: null,
  contracts: [],
  inventory: [],

  setAuthenticated: authenticated => set({ isAuthenticated: authenticated }),
  setCurrentView: view => set({ currentView: view }),
  setPlayer: player => set({ player }),
  setWorld: world => set({ world }),
  setContracts: contracts => set({ contracts }),
  setInventory: inventory => set({ inventory }),
}));

// Type definitions (will be moved to types files later)
interface Player {
  id: string;
  username: string;
  position: { x: number; y: number };
  health: number;
  credits: number;
  isAlive: boolean;
}

interface WorldState {
  chunks: CityChunk[];
  currentChunk: string;
}

interface CityChunk {
  id: string;
  x: number;
  y: number;
  districtType: string;
  generated: boolean;
}

interface Contract {
  id: string;
  type: string;
  description: string;
  reward: number;
  timeLimit: number;
  status: string;
}

interface InventoryItem {
  id: string;
  type: string;
  name: string;
  gridSize: { width: number; height: number };
  position: { x: number; y: number };
}
