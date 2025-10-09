// Tests for the LightingSystem
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DistrictType, WeatherType } from '../../types/world';
import { LightingSystem } from '../systems/LightingSystem';
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

describe('LightingSystem', () => {
  let lightingSystem: LightingSystem;

  beforeEach(() => {
    lightingSystem = new LightingSystem(mockCanvas);
  });

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      const stats = lightingSystem.getPerformanceStats();
      expect(stats.currentHour).toBe(20); // Night time start
      expect(stats.weather).toBe(WeatherType.CLEAR);
    });

    test('should initialize with custom config', () => {
      const customSystem = new LightingSystem(mockCanvas, {
        enableDynamicLighting: false,
        enableAtmosphericEffects: false,
        performanceMode: true
      });

      expect(customSystem).toBeTruthy();
    });
  });

  describe('Day/Night Cycle', () => {
    test('should get current time correctly', () => {
      const time = lightingSystem.getCurrentTime();
      expect(time.hour).toBe(20);
      expect(time.timeString).toBe('20:00');
    });

    test('should set time of day', () => {
      lightingSystem.setTimeOfDay(12);
      const time = lightingSystem.getCurrentTime();
      expect(time.hour).toBe(12);
      expect(time.timeString).toBe('12:00');
    });

    test('should handle invalid time values', () => {
      lightingSystem.setTimeOfDay(-5);
      expect(lightingSystem.getCurrentTime().hour).toBe(0);

      lightingSystem.setTimeOfDay(25);
      expect(lightingSystem.getCurrentTime().hour).toBe(23);
    });

    test('should set day/night cycle speed', () => {
      expect(() => {
        lightingSystem.setDayNightSpeed(2.0);
      }).not.toThrow();

      expect(() => {
        lightingSystem.setDayNightSpeed(-1.0);
      }).not.toThrow();
    });
  });

  describe('Weather System', () => {
    test('should set weather correctly', () => {
      lightingSystem.setWeather(WeatherType.RAIN);
      expect(lightingSystem.getCurrentWeather()).toBe(WeatherType.RAIN);
    });

    test('should handle all weather types', () => {
      const weatherTypes = [WeatherType.CLEAR, WeatherType.RAIN, WeatherType.FOG, WeatherType.STORM];
      
      weatherTypes.forEach(weather => {
        expect(() => {
          lightingSystem.setWeather(weather);
        }).not.toThrow();
        expect(lightingSystem.getCurrentWeather()).toBe(weather);
      });
    });
  });

  describe('District Lighting Generation', () => {
    test('should generate corporate district lighting', () => {
      const chunkBounds = { x: 0, y: 0, width: 100, height: 100 };
      
      expect(() => {
        lightingSystem.generateDistrictLighting(DistrictType.CORPORATE, chunkBounds);
      }).not.toThrow();

      const stats = lightingSystem.getPerformanceStats();
      expect(stats.lightSources).toBeGreaterThan(0);
    });

    test('should generate industrial district lighting', () => {
      const chunkBounds = { x: 100, y: 100, width: 100, height: 100 };
      
      expect(() => {
        lightingSystem.generateDistrictLighting(DistrictType.INDUSTRIAL, chunkBounds);
      }).not.toThrow();

      const stats = lightingSystem.getPerformanceStats();
      expect(stats.lightSources).toBeGreaterThan(0);
      expect(stats.atmosphericEffects).toBeGreaterThan(0);
    });
  });

  describe('Combat Lighting', () => {
    test('should add explosion lighting', () => {
      const position = new Vector2(100, 100);
      const lightId = lightingSystem.addCombatLighting(position, 'explosion', 1.5);
      
      expect(lightId).toBeTruthy();
      expect(typeof lightId).toBe('string');
    });

    test('should add muzzle flash lighting', () => {
      const position = new Vector2(200, 200);
      const lightId = lightingSystem.addCombatLighting(position, 'muzzle_flash');
      
      expect(lightId).toBeTruthy();
      expect(typeof lightId).toBe('string');
    });

    test('should handle invalid combat lighting type', () => {
      const position = new Vector2(300, 300);
      const lightId = lightingSystem.addCombatLighting(position, 'invalid' as any);
      
      expect(lightId).toBe('');
    });
  });

  describe('System Updates', () => {
    test('should update without errors', () => {
      expect(() => {
        lightingSystem.update(16); // 16ms delta time (~60fps)
      }).not.toThrow();
    });

    test('should render without errors', () => {
      expect(() => {
        lightingSystem.render();
      }).not.toThrow();
    });

    test('should resize without errors', () => {
      expect(() => {
        lightingSystem.resize(1024, 768);
      }).not.toThrow();
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      const newConfig = {
        enableDynamicLighting: false,
        performanceMode: true,
        lightingQuality: 'low' as const
      };

      expect(() => {
        lightingSystem.updateConfig(newConfig);
      }).not.toThrow();
    });

    test('should handle partial configuration updates', () => {
      expect(() => {
        lightingSystem.updateConfig({ performanceMode: true });
      }).not.toThrow();

      expect(() => {
        lightingSystem.updateConfig({ enableAtmosphericEffects: false });
      }).not.toThrow();
    });
  });

  describe('Performance Stats', () => {
    test('should provide performance statistics', () => {
      const stats = lightingSystem.getPerformanceStats();
      
      expect(stats).toHaveProperty('lightSources');
      expect(stats).toHaveProperty('atmosphericEffects');
      expect(stats).toHaveProperty('currentHour');
      expect(stats).toHaveProperty('weather');
      
      expect(typeof stats.lightSources).toBe('number');
      expect(typeof stats.atmosphericEffects).toBe('number');
      expect(typeof stats.currentHour).toBe('number');
      expect(typeof stats.weather).toBe('string');
    });

    test('should track lighting changes in stats', () => {
      const initialStats = lightingSystem.getPerformanceStats();
      
      // Add some lighting
      const chunkBounds = { x: 0, y: 0, width: 100, height: 100 };
      lightingSystem.generateDistrictLighting(DistrictType.CORPORATE, chunkBounds);
      
      const updatedStats = lightingSystem.getPerformanceStats();
      expect(updatedStats.lightSources).toBeGreaterThan(initialStats.lightSources);
    });
  });

  describe('System Cleanup', () => {
    test('should clear all lighting', () => {
      // Add some lighting first
      const chunkBounds = { x: 0, y: 0, width: 100, height: 100 };
      lightingSystem.generateDistrictLighting(DistrictType.CORPORATE, chunkBounds);
      
      const statsBeforeClear = lightingSystem.getPerformanceStats();
      expect(statsBeforeClear.lightSources).toBeGreaterThan(0);
      
      lightingSystem.clear();
      
      const statsAfterClear = lightingSystem.getPerformanceStats();
      expect(statsAfterClear.lightSources).toBe(0);
      expect(statsAfterClear.atmosphericEffects).toBe(0);
    });
  });
});