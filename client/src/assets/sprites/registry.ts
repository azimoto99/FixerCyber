import { SpriteRegistry, SpriteSheet } from './types';

// Helper to create simple grid-based sheets quickly
function gridSheet(id: string, imageUrl: string, imageWidth: number, imageHeight: number, tileWidth: number, tileHeight: number): SpriteSheet {
  return {
    id,
    imageUrl,
    imageWidth,
    imageHeight,
    tilePixelSize: { x: tileWidth, y: tileHeight },
  };
}

// Placeholder assets (point to temporary images until art arrives)
const PLACEHOLDER_64 = gridSheet('placeholder-64', '/vite.svg', 410, 404, 64, 64);

export const spriteRegistry: SpriteRegistry = {
  tiles: {
    ground: {
      street: PLACEHOLDER_64,
      sidewalk: PLACEHOLDER_64,
      concrete: PLACEHOLDER_64,
      grass: PLACEHOLDER_64,
    },
    wall: {
      default: PLACEHOLDER_64,
    },
    decoration: {
      foliage: PLACEHOLDER_64,
      rubble: PLACEHOLDER_64,
    },
  },
  buildings: {
    office: PLACEHOLDER_64,
    apartment: PLACEHOLDER_64,
    warehouse: PLACEHOLDER_64,
    shop: PLACEHOLDER_64,
    hideout: PLACEHOLDER_64,
    tower: PLACEHOLDER_64,
    factory: PLACEHOLDER_64,
  },
  infrastructure: {
    streetlight: PLACEHOLDER_64,
    sign: PLACEHOLDER_64,
    terminal: PLACEHOLDER_64,
    bench: PLACEHOLDER_64,
    fence: PLACEHOLDER_64,
    roadMarkings: PLACEHOLDER_64,
  },
  items: {
    icons: {
      weapon: PLACEHOLDER_64,
      augmentation: PLACEHOLDER_64,
      consumable: PLACEHOLDER_64,
      material: PLACEHOLDER_64,
      data: PLACEHOLDER_64,
      armor: PLACEHOLDER_64,
      utility: PLACEHOLDER_64,
    },
    world: {
      weapon: PLACEHOLDER_64,
      augmentation: PLACEHOLDER_64,
      consumable: PLACEHOLDER_64,
      material: PLACEHOLDER_64,
      data: PLACEHOLDER_64,
      armor: PLACEHOLDER_64,
      utility: PLACEHOLDER_64,
    },
    rarityOverlays: {},
  },
  characters: {
    player: {
      base: PLACEHOLDER_64,
      actions: {
        idle: {},
        walk: {},
        run: {},
        attack: {},
      },
      overlays: {
        armor: PLACEHOLDER_64,
        weapon: PLACEHOLDER_64,
        effects: PLACEHOLDER_64,
      },
    },
    npcs: {
      guard: { sheet: PLACEHOLDER_64 },
      civilian: { sheet: PLACEHOLDER_64 },
      fixer: { sheet: PLACEHOLDER_64 },
      dealer: { sheet: PLACEHOLDER_64 },
      thug: { sheet: PLACEHOLDER_64 },
      executive: { sheet: PLACEHOLDER_64 },
    },
  },
  effects: {
    projectiles: {
      bullet: PLACEHOLDER_64,
      energy: PLACEHOLDER_64,
    },
    muzzleFlashes: {
      default: PLACEHOLDER_64,
    },
    explosions: {
      small: PLACEHOLDER_64,
      medium: PLACEHOLDER_64,
    },
    hits: {
      spark: PLACEHOLDER_64,
    },
    uiPings: {
      target: PLACEHOLDER_64,
    },
  },
};

export type Registry = typeof spriteRegistry;


