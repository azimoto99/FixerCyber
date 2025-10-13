// Sprite and spritesheet contracts for the isometric game
// Keep types reusable and strict to satisfy TS config (no any)

import { ItemType, Rarity, Vector2 } from '@/types/game';
import { BuildingType, NPCType } from '@/types/world';

// Core frame definition within a spritesheet
export interface SpriteFrame {
  // Pixel-space rectangle in the source image
  x: number;
  y: number;
  width: number;
  height: number;
  // Optional anchor for positioning relative to isometric ground
  // Values are pixel offsets from the frame top-left
  anchorX?: number;
  anchorY?: number;
}

// Animation made from multiple frames
export interface SpriteAnimation {
  frames: SpriteFrame[];
  frameDurationMs: number; // per-frame duration
  loop: boolean;
}

// Cardinal and diagonal facings commonly used in isometric characters
export type FacingDirection =
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW';

// Common actions for humanoid sprites
export type CharacterAction = 'idle' | 'walk' | 'run' | 'attack' | 'hurt' | 'die' | 'interact';

// Generic spritesheet (texture atlas) definition
export interface SpriteSheet {
  id: string; // unique key
  imageUrl: string; // path under public or bundled assets
  imageWidth: number; // pixels
  imageHeight: number; // pixels
  tilePixelSize?: Vector2; // if this sheet is a grid
  // Named frames (for non-grid atlases)
  frames?: Record<string, SpriteFrame>;
  // Named animations
  animations?: Record<string, SpriteAnimation>;
}

// Tiles category (ground, walls, decorative)
export interface TileSprites {
  ground: Record<string, SpriteSheet>; // e.g. street, sidewalk, grass, concrete
  wall?: Record<string, SpriteSheet>;
  decoration?: Record<string, SpriteSheet>;
}

// Buildings keyed by domain BuildingType
export type BuildingSprites = Partial<Record<BuildingType, SpriteSheet>>;

// Infrastructure/props (streetlights, signage, terminals, benches, fences)
export interface InfrastructureSprites {
  streetlight?: SpriteSheet;
  sign?: SpriteSheet;
  terminal?: SpriteSheet;
  bench?: SpriteSheet;
  fence?: SpriteSheet;
  roadMarkings?: SpriteSheet;
}

// Items and loot icons/ground representations
export interface ItemSprites {
  // icon sheets (UI-size)
  icons: Partial<Record<ItemType, SpriteSheet>>;
  // ground/world representations (dropped items)
  world: Partial<Record<ItemType, SpriteSheet>>;
  rarityOverlays?: Partial<Record<Rarity, SpriteSheet>>;
}

// Player and NPCs
export interface CharacterSprites {
  player: {
    base: SpriteSheet; // base body
    actions: Partial<Record<CharacterAction, Partial<Record<FacingDirection, SpriteAnimation>>>>;
    overlays?: {
      armor?: SpriteSheet;
      weapon?: SpriteSheet;
      effects?: SpriteSheet;
    };
  };
  npcs: Partial<Record<NPCType, {
    sheet: SpriteSheet;
    actions?: Partial<Record<CharacterAction, Partial<Record<FacingDirection, SpriteAnimation>>>>;
  }>>;
}

// Combat and interaction effects (projectiles, muzzle flashes, explosions, hit sparks)
export interface EffectSprites {
  projectiles?: Record<string, SpriteSheet>; // e.g. bullet, energy, rocket
  muzzleFlashes?: Record<string, SpriteSheet>;
  explosions?: Record<string, SpriteSheet>;
  hits?: Record<string, SpriteSheet>;
  uiPings?: Record<string, SpriteSheet>; // targeting pings, markers
}

// Full registry contract
export interface SpriteRegistry {
  tiles: TileSprites;
  buildings: BuildingSprites;
  infrastructure: InfrastructureSprites;
  items: ItemSprites;
  characters: CharacterSprites;
  effects: EffectSprites;
}

export type SpriteCategory = keyof SpriteRegistry;


