// Tests for the LightingEngine
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DistrictType, WeatherType } from '../../types/world';
import { EffectType, LightingEngine, LightType } from '../engine/LightingEngine';
import { Vector2 } from '../utils/Vector2';

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
    drawImage: vi.fn()
  }))
} as unknown as HTMLCanvasElement;

// Mock document.createElement for off-screen canvas
Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => mockCanvas),
  writable: true
});

describe('LightingEngine', () => {
  let lightingEngine: LightingEngine;

  beforeEach(() => {
    lightingEngine = new LightingEngine(mockCanvas);
  });

  describe('Light Source Management', () => {
    test('should add light source correctly', () => {
      const light = {
        id: 'test-light',
        position: new Vector2(100, 100),
        color: '#ff0000',
        intensity: 0.8,
        radius: 150,
        type: LightType.NEON
      };

      lightingEngine.addLightSource(light);
      const lights = lightingEngine.getLightSources();
      
      expect(lights).toHaveLength(1);
      expect(lights[0]).toEqual(light);
    });

    test('should remove light source correctly', () => {
      const light = {
        id: 'test-light',
        position: new Vector2(100, 100),
        color: '#ff0000',
        intensity: 0.8,
        radius: 150,
        type: LightType.NEON
      };

      lightingEngine.addLightSource(light);
      expect(lightingEngine.getLightSources()).toHaveLength(1);

      lightingEngine.removeLightSource('test-light');
      expect(lightingEngine.getLightSources()).toHaveLength(0);
    });

    test('should update light source properties', () => {
      const light = {
        id: 'test-light',
        position: new Vector2(100, 100),
        color: '#ff0000',
        intensity: 0.8,
        radius: 150,
        type: LightType.NEON
      };

      lightingEngine.addLightSource(light);
      lightingEngine.updateLightSource('test-light', { intensity: 0.5, color: '#00ff00' });
      
      const updatedLight = lightingEngine.getLightSources()[0];
      expect(updatedLight.intensity).toBe(0.5);
      expect(updatedLight.color).toBe('#00ff00');
    });
  });

  describe('Time of Day System', () => {
    test('should set time of day correctly', () => {
      lightingEngine.setTimeOfDay(12); // Noon
      const timeOfDay = lightingEngine.getTimeOfDay();
      
      expect(timeOfDay.hour).toBe(12);
      expect(timeOfDay.ambient).toBe('#2a2a3e'); // Day time ambient
      expect(timeOfDay.intensity).toBe(0.4);
    });

    test('should handle night time correctly', () => {
      lightingEngine.setTimeOfDay(22); // 10 PM
      const timeOfDay = lightingEngine.getTimeOfDay();
      
      expect(timeOfDay.hour).toBe(22);
      expect(timeOfDay.ambient).toBe('#1a1a2e'); // Night time ambient
      expect(timeOfDay.intensity).toBe(0.2);
    });
  });

  describe('Weather System', () => {
    test('should set weather correctly', () => {
      lightingEngine.setWeather(WeatherType.RAIN);
      expect(lightingEngine.getWeather()).toBe(WeatherType.RAIN);
      
      const effects = lightingEngine.getAtmosphericEffects();
      expect(effects).toHaveLength(1);
      expect(effects[0].type).toBe(EffectType.RAIN);
    });

    test('should handle fog weather', () => {
      lightingEngine.setWeather(WeatherType.FOG);
      const effects = lightingEngine.getAtmosphericEffects();
      
      expect(effects).toHaveLength(1);
      expect(effects[0].type).toBe(EffectType.FOG);
      expect(effects[0].intensity).toBe(0.8);
    });
  });

  describe('District Lighting Generation', () => {
    test('should generate corporate district lighting', () => {
      const chunkBounds = { x: 0, y: 0, width: 100, height: 100 };
      
      lightingEngine.generateDistrictLighting(DistrictType.CORPORATE, chunkBounds);
      const lights = lightingEngine.getLightSources();
      
      expect(lights.length).toBeGreaterThan(0);
      expect(lights.some(light => light.type === LightType.NEON)).toBe(true);
      expect(lights.some(light => light.color === '#00ffff')).toBe(true);
    });

    test('should generate industrial district lighting', () => {
      const chunkBounds = { x: 0, y: 0, width: 100, height: 100 };
      
      lightingEngine.generateDistrictLighting(DistrictType.INDUSTRIAL, chunkBounds);
      const lights = lightingEngine.getLightSources();
      const effects = lightingEngine.getAtmosphericEffects();
      
      expect(lights.length).toBeGreaterThan(0);
      expect(lights.some(light => light.type === LightType.STREET_LAMP)).toBe(true);
      expect(effects.some(effect => effect.type === EffectType.SPARKS)).toBe(true);
    });
  });

  describe('Dynamic Combat Lighting', () => {
    test('should add explosion light', () => {
      const position = new Vector2(200, 200);
      const lightId = lightingEngine.addExplosionLight(position, 1.5);
      
      expect(lightId).toBeTruthy();
      const lights = lightingEngine.getLightSources();
      const explosionLight = lights.find(light => light.id === lightId);
      
      expect(explosionLight).toBeTruthy();
      expect(explosionLight?.type).toBe(LightType.EXPLOSION);
      expect(explosionLight?.color).toBe('#ffaa00');
      expect(explosionLight?.intensity).toBe(3.0); // 1.5 * 2.0
    });

    test('should add muzzle flash light', () => {
      const position = new Vector2(150, 150);
      const lightId = lightingEngine.addMuzzleFlash(position);
      
      expect(lightId).toBeTruthy();
      const lights = lightingEngine.getLightSources();
      const muzzleLight = lights.find(light => light.id === lightId);
      
      expect(muzzleLight).toBeTruthy();
      expect(muzzleLight?.type).toBe(LightType.MUZZLE_FLASH);
      expect(muzzleLight?.color).toBe('#ffffff');
      expect(muzzleLight?.intensity).toBe(1.5);
    });
  });

  describe('Rendering System', () => {
    test('should resize correctly', () => {
      expect(() => {
        lightingEngine.resize(1024, 768);
      }).not.toThrow();
    });

    test('should apply lighting without errors', () => {
      // Add some lights
      lightingEngine.addLightSource({
        id: 'test-light',
        position: new Vector2(100, 100),
        color: '#ff0000',
        intensity: 0.8,
        radius: 150,
        type: LightType.NEON
      });

      expect(() => {
        lightingEngine.applyLighting();
      }).not.toThrow();
    });

    test('should clear all lighting', () => {
      lightingEngine.addLightSource({
        id: 'test-light',
        position: new Vector2(100, 100),
        color: '#ff0000',
        intensity: 0.8,
        radius: 150,
        type: LightType.NEON
      });

      lightingEngine.addAtmosphericEffect({
        type: EffectType.FOG,
        intensity: 0.3,
        color: '#333333'
      });

      lightingEngine.clear();
      
      expect(lightingEngine.getLightSources()).toHaveLength(0);
      expect(lightingEngine.getAtmosphericEffects()).toHaveLength(0);
    });
  });
});