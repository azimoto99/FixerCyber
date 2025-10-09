// Integration tests for lighting system with game engine
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DistrictType } from '../../types/world';
import { IsometricRenderer } from '../engine/IsometricRenderer';
import { LightingSystem } from '../systems/LightingSystem';

// Mock canvas and context
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: vi.fn(() => ({
    fillStyle: '',
    fillRect: vi.fn(),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    globalCompositeOperation: '',
    globalAlpha: 1,
    strokeStyle: '',
    lineWidth: 1,
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    drawImage: vi.fn(),
    imageSmoothingEnabled: true,
    lineCap: 'round',
    lineJoin: 'round',
    setLineDash: vi.fn(),
    textAlign: 'left'
  }))
} as unknown as HTMLCanvasElement;

// Mock document.createElement for off-screen canvas
Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => mockCanvas),
  writable: true
});

describe('Lighting Integration', () => {
  let renderer: IsometricRenderer;
  let lightingSystem: LightingSystem;

  beforeEach(() => {
    renderer = new IsometricRenderer(mockCanvas);
    lightingSystem = new LightingSystem(mockCanvas);
    
    // Integrate lighting system with renderer
    renderer.setLightingSystem(lightingSystem);
  });

  test('should integrate lighting system with renderer', () => {
    expect(renderer.getLightingSystem()).toBe(lightingSystem);
  });

  test('should render with lighting effects', () => {
    // Add some district lighting
    const chunkBounds = { x: 0, y: 0, width: 100, height: 100 };
    lightingSystem.generateDistrictLighting(DistrictType.CORPORATE, chunkBounds);
    
    expect(() => {
      renderer.renderWithLighting();
    }).not.toThrow();
  });

  test('should handle resize with lighting system', () => {
    expect(() => {
      renderer.resize(1024, 768);
    }).not.toThrow();
  });
});