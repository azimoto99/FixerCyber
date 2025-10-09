// Lighting system that integrates with the game engine
import { DistrictType, WeatherType } from '../../types/world';
import { EffectType, LightingEngine, LightType } from '../engine/LightingEngine';
import { Vector2 } from '../utils/Vector2';

export interface LightingSystemConfig {
  enableDynamicLighting: boolean;
  enableAtmosphericEffects: boolean;
  enableDayNightCycle: boolean;
  lightingQuality: 'low' | 'medium' | 'high';
  performanceMode: boolean;
}

export class LightingSystem {
  private lightingEngine: LightingEngine;
  private config: LightingSystemConfig;
  private dayNightTimer: number = 0;
  private currentHour: number = 20; // Start at night for cyberpunk atmosphere
  private dayNightSpeed: number = 0.1; // How fast time passes (0.1 = slow)
  
  // Performance tracking
  private lastUpdateTime: number = 0;
  private updateInterval: number = 16; // ~60fps
  
  constructor(canvas: HTMLCanvasElement, config: Partial<LightingSystemConfig> = {}) {
    this.lightingEngine = new LightingEngine(canvas);
    this.config = {
      enableDynamicLighting: true,
      enableAtmosphericEffects: true,
      enableDayNightCycle: true,
      lightingQuality: 'medium',
      performanceMode: false,
      ...config
    };
    
    // Initialize with cyberpunk night atmosphere
    this.lightingEngine.setTimeOfDay(this.currentHour);
    this.lightingEngine.setWeather(WeatherType.CLEAR);
  }

  /**
   * Update lighting system
   */
  update(deltaTime: number): void {
    const currentTime = Date.now();
    
    // Performance optimization - limit update frequency
    if (this.config.performanceMode && currentTime - this.lastUpdateTime < this.updateInterval) {
      return;
    }
    
    this.lastUpdateTime = currentTime;
    
    // Update day/night cycle
    if (this.config.enableDayNightCycle) {
      this.updateDayNightCycle(deltaTime);
    }
    
    // Update lighting engine
    if (this.config.enableDynamicLighting) {
      this.lightingEngine.update(deltaTime);
    }
  }

  /**
   * Update day/night cycle
   */
  private updateDayNightCycle(deltaTime: number): void {
    this.dayNightTimer += deltaTime * this.dayNightSpeed;
    
    // Each "hour" takes 60 seconds at speed 1.0
    if (this.dayNightTimer >= 60) {
      this.dayNightTimer = 0;
      this.currentHour = (this.currentHour + 1) % 24;
      this.lightingEngine.setTimeOfDay(this.currentHour);
      
      // Trigger gameplay effects based on time
      this.onTimeChange(this.currentHour);
    }
  }

  /**
   * Handle time-based gameplay effects
   */
  private onTimeChange(hour: number): void {
    // Different activities and lighting based on time
    if (hour === 6) {
      // Dawn - reduce neon intensity
      this.adjustDistrictLighting(0.7);
    } else if (hour === 18) {
      // Dusk - increase neon intensity
      this.adjustDistrictLighting(1.3);
    } else if (hour === 0) {
      // Midnight - peak cyberpunk atmosphere
      this.adjustDistrictLighting(1.5);
    }
  }

  /**
   * Adjust all district lighting intensity
   */
  private adjustDistrictLighting(multiplier: number): void {
    const lights = this.lightingEngine.getLightSources();
    lights.forEach(light => {
      if (light.type === LightType.NEON || light.type === LightType.BUILDING_LIGHT) {
        this.lightingEngine.updateLightSource(light.id, {
          intensity: light.intensity * multiplier
        });
      }
    });
  }

  /**
   * Generate lighting for a district chunk
   */
  generateDistrictLighting(districtType: DistrictType, chunkBounds: { x: number; y: number; width: number; height: number }): void {
    if (!this.config.enableDynamicLighting) return;
    
    this.lightingEngine.generateDistrictLighting(districtType, chunkBounds);
    
    // Add additional atmospheric effects based on district
    this.addDistrictAtmosphere(districtType, chunkBounds);
  }

  /**
   * Add district-specific atmospheric effects
   */
  private addDistrictAtmosphere(districtType: DistrictType, chunkBounds: { x: number; y: number; width: number; height: number }): void {
    if (!this.config.enableAtmosphericEffects) return;
    
    switch (districtType) {
      case DistrictType.CORPORATE:
        // Clean, bright neon glow
        this.lightingEngine.addAtmosphericEffect({
          type: EffectType.NEON_GLOW,
          intensity: 0.3,
          color: '#00ffff',
          position: new Vector2(chunkBounds.x + chunkBounds.width * 0.5, chunkBounds.y + chunkBounds.height * 0.5),
          radius: 200,
          animated: false
        });
        break;
        
      case DistrictType.INDUSTRIAL:
        // Smoke and pollution
        this.lightingEngine.addAtmosphericEffect({
          type: EffectType.SMOKE,
          intensity: 0.4,
          color: '#333333',
          position: new Vector2(chunkBounds.x + chunkBounds.width * 0.3, chunkBounds.y + chunkBounds.height * 0.7),
          radius: 150,
          animated: true
        });
        break;
        
      case DistrictType.UNDERGROUND:
        // Fog and mist
        this.lightingEngine.addAtmosphericEffect({
          type: EffectType.FOG,
          intensity: 0.6,
          color: '#2a2a3a',
          animated: false
        });
        break;
    }
  }

  /**
   * Add combat lighting effects
   */
  addCombatLighting(position: Vector2, type: 'explosion' | 'muzzle_flash', intensity: number = 1.0): string {
    if (!this.config.enableDynamicLighting) return '';
    
    switch (type) {
      case 'explosion':
        return this.lightingEngine.addExplosionLight(position, intensity);
      case 'muzzle_flash':
        return this.lightingEngine.addMuzzleFlash(position);
      default:
        return '';
    }
  }

  /**
   * Set weather and update atmospheric effects
   */
  setWeather(weather: WeatherType): void {
    this.lightingEngine.setWeather(weather);
  }

  /**
   * Apply lighting to the canvas
   */
  render(): void {
    if (!this.config.enableDynamicLighting) return;
    
    this.lightingEngine.applyLighting();
  }

  /**
   * Resize lighting system
   */
  resize(width: number, height: number): void {
    this.lightingEngine.resize(width, height);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LightingSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Apply performance optimizations
    if (this.config.performanceMode) {
      this.updateInterval = 33; // ~30fps
    } else {
      this.updateInterval = 16; // ~60fps
    }
  }

  /**
   * Get current time of day (for UI display)
   */
  getCurrentTime(): { hour: number; timeString: string } {
    const timeString = `${this.currentHour.toString().padStart(2, '0')}:00`;
    return {
      hour: this.currentHour,
      timeString
    };
  }

  /**
   * Get current weather
   */
  getCurrentWeather(): WeatherType {
    return this.lightingEngine.getWeather();
  }

  /**
   * Set day/night cycle speed
   */
  setDayNightSpeed(speed: number): void {
    this.dayNightSpeed = Math.max(0, speed);
  }

  /**
   * Force time of day (for testing or events)
   */
  setTimeOfDay(hour: number): void {
    this.currentHour = Math.max(0, Math.min(23, Math.floor(hour)));
    this.lightingEngine.setTimeOfDay(this.currentHour);
  }

  /**
   * Get lighting performance stats
   */
  getPerformanceStats(): {
    lightSources: number;
    atmosphericEffects: number;
    currentHour: number;
    weather: WeatherType;
  } {
    return {
      lightSources: this.lightingEngine.getLightSources().length,
      atmosphericEffects: this.lightingEngine.getAtmosphericEffects().length,
      currentHour: this.currentHour,
      weather: this.lightingEngine.getWeather()
    };
  }

  /**
   * Clear all lighting
   */
  clear(): void {
    this.lightingEngine.clear();
  }
}