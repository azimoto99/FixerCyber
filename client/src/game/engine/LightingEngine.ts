// Dynamic lighting system for cyberpunk atmosphere
import { DistrictType, WeatherType } from '../../types/world';
import { Vector2 } from '../utils/Vector2';

export interface LightSource {
  id: string;
  position: Vector2;
  color: string;
  intensity: number;
  radius: number;
  type: LightType;
  flickerRate?: number;
  flickerIntensity?: number;
  animated?: boolean;
  height?: number; // Height above ground for 3D lighting
}

export enum LightType {
  NEON = 'neon',
  STREET_LAMP = 'street_lamp',
  BUILDING_LIGHT = 'building_light',
  EXPLOSION = 'explosion',
  MUZZLE_FLASH = 'muzzle_flash',
  AMBIENT = 'ambient',
  SPOTLIGHT = 'spotlight'
}

export interface AtmosphericEffect {
  type: EffectType;
  intensity: number;
  color: string;
  position?: Vector2;
  radius?: number;
  animated?: boolean;
}

export enum EffectType {
  FOG = 'fog',
  RAIN = 'rain',
  NEON_GLOW = 'neon_glow',
  SMOKE = 'smoke',
  SPARKS = 'sparks'
}

export interface TimeOfDay {
  hour: number; // 0-23
  ambient: string; // Ambient light color
  intensity: number; // Overall light intensity
}

export class LightingEngine {
  private ctx: CanvasRenderingContext2D;
  private lightSources: Map<string, LightSource> = new Map();
  private atmosphericEffects: AtmosphericEffect[] = [];
  private timeOfDay: TimeOfDay = { hour: 20, ambient: '#1a1a2e', intensity: 0.3 };
  private weather: WeatherType = WeatherType.CLEAR;
  
  // Performance optimization
  private lightingCanvas: HTMLCanvasElement;
  private lightingCtx: CanvasRenderingContext2D;
  private needsUpdate: boolean = true;
  
  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = context;
    
    // Create off-screen canvas for lighting calculations
    this.lightingCanvas = document.createElement('canvas');
    this.lightingCanvas.width = canvas.width;
    this.lightingCanvas.height = canvas.height;
    const lightingContext = this.lightingCanvas.getContext('2d');
    if (!lightingContext) {
      throw new Error('Failed to create lighting context');
    }
    this.lightingCtx = lightingContext;
  }

  /**
   * Add a light source to the scene
   */
  addLightSource(light: LightSource): void {
    this.lightSources.set(light.id, light);
    this.needsUpdate = true;
  }

  /**
   * Remove a light source from the scene
   */
  removeLightSource(id: string): void {
    this.lightSources.delete(id);
    this.needsUpdate = true;
  }

  /**
   * Update light source properties
   */
  updateLightSource(id: string, updates: Partial<LightSource>): void {
    const light = this.lightSources.get(id);
    if (light) {
      Object.assign(light, updates);
      this.needsUpdate = true;
    }
  }

  /**
   * Add atmospheric effect
   */
  addAtmosphericEffect(effect: AtmosphericEffect): void {
    this.atmosphericEffects.push(effect);
    this.needsUpdate = true;
  }

  /**
   * Clear all atmospheric effects
   */
  clearAtmosphericEffects(): void {
    this.atmosphericEffects = [];
    this.needsUpdate = true;
  }

  /**
   * Set time of day and update ambient lighting
   */
  setTimeOfDay(hour: number): void {
    this.timeOfDay = this.calculateTimeOfDay(hour);
    this.needsUpdate = true;
  }

  /**
   * Set weather conditions
   */
  setWeather(weather: WeatherType): void {
    this.weather = weather;
    this.updateWeatherEffects();
    this.needsUpdate = true;
  }

  /**
   * Calculate time-based lighting parameters
   */
  private calculateTimeOfDay(hour: number): TimeOfDay {
    // Cyberpunk city is darker during day, more vibrant at night
    if (hour >= 6 && hour < 18) {
      // Day time - smoggy, dim
      return {
        hour,
        ambient: '#2a2a3e',
        intensity: 0.4
      };
    } else {
      // Night time - neon-lit cyberpunk atmosphere
      return {
        hour,
        ambient: '#1a1a2e',
        intensity: 0.2
      };
    }
  }

  /**
   * Update atmospheric effects based on weather
   */
  private updateWeatherEffects(): void {
    this.clearAtmosphericEffects();
    
    switch (this.weather) {
      case WeatherType.RAIN:
        this.addAtmosphericEffect({
          type: EffectType.RAIN,
          intensity: 0.6,
          color: '#4a4a6a',
          animated: true
        });
        break;
      case WeatherType.FOG:
        this.addAtmosphericEffect({
          type: EffectType.FOG,
          intensity: 0.8,
          color: '#3a3a4a',
          animated: false
        });
        break;
      case WeatherType.STORM:
        this.addAtmosphericEffect({
          type: EffectType.RAIN,
          intensity: 0.9,
          color: '#2a2a4a',
          animated: true
        });
        break;
    }
  }

  /**
   * Generate district-appropriate lighting
   */
  generateDistrictLighting(districtType: DistrictType, chunkBounds: { x: number; y: number; width: number; height: number }): void {
    const lightId = `district_${districtType}_${chunkBounds.x}_${chunkBounds.y}`;
    
    switch (districtType) {
      case DistrictType.CORPORATE:
        // Bright neon lights, clean and vibrant
        this.addLightSource({
          id: `${lightId}_neon_1`,
          position: new Vector2(chunkBounds.x + chunkBounds.width * 0.3, chunkBounds.y + chunkBounds.height * 0.3),
          color: '#00ffff',
          intensity: 0.8,
          radius: 150,
          type: LightType.NEON,
          flickerRate: 0.1,
          flickerIntensity: 0.05
        });
        
        this.addLightSource({
          id: `${lightId}_neon_2`,
          position: new Vector2(chunkBounds.x + chunkBounds.width * 0.7, chunkBounds.y + chunkBounds.height * 0.7),
          color: '#ff00ff',
          intensity: 0.7,
          radius: 120,
          type: LightType.NEON,
          flickerRate: 0.15,
          flickerIntensity: 0.08
        });
        break;

      case DistrictType.INDUSTRIAL:
        // Dim, harsh lighting with occasional sparks
        this.addLightSource({
          id: `${lightId}_industrial_1`,
          position: new Vector2(chunkBounds.x + chunkBounds.width * 0.5, chunkBounds.y + chunkBounds.height * 0.2),
          color: '#ffaa00',
          intensity: 0.4,
          radius: 80,
          type: LightType.STREET_LAMP,
          flickerRate: 0.3,
          flickerIntensity: 0.2
        });
        
        // Add sparks effect
        this.addAtmosphericEffect({
          type: EffectType.SPARKS,
          intensity: 0.3,
          color: '#ffaa00',
          position: new Vector2(chunkBounds.x + chunkBounds.width * 0.8, chunkBounds.y + chunkBounds.height * 0.6),
          radius: 50,
          animated: true
        });
        break;

      case DistrictType.RESIDENTIAL:
        // Warm but dim lighting, flickering signs
        this.addLightSource({
          id: `${lightId}_residential_1`,
          position: new Vector2(chunkBounds.x + chunkBounds.width * 0.4, chunkBounds.y + chunkBounds.height * 0.5),
          color: '#ffcc66',
          intensity: 0.5,
          radius: 100,
          type: LightType.BUILDING_LIGHT,
          flickerRate: 0.2,
          flickerIntensity: 0.15
        });
        break;

      case DistrictType.UNDERGROUND:
        // Very dim, emergency lighting
        this.addLightSource({
          id: `${lightId}_emergency_1`,
          position: new Vector2(chunkBounds.x + chunkBounds.width * 0.3, chunkBounds.y + chunkBounds.height * 0.3),
          color: '#ff4444',
          intensity: 0.3,
          radius: 60,
          type: LightType.AMBIENT,
          flickerRate: 0.5,
          flickerIntensity: 0.3
        });
        break;

      case DistrictType.WASTELAND:
        // Minimal lighting, mostly ambient
        this.addLightSource({
          id: `${lightId}_wasteland_ambient`,
          position: new Vector2(chunkBounds.x + chunkBounds.width * 0.5, chunkBounds.y + chunkBounds.height * 0.5),
          color: '#444444',
          intensity: 0.2,
          radius: 200,
          type: LightType.AMBIENT
        });
        break;
    }
  }

  /**
   * Add dynamic lighting for explosions
   */
  addExplosionLight(position: Vector2, intensity: number = 1.0): string {
    const id = `explosion_${Date.now()}_${Math.random()}`;
    
    this.addLightSource({
      id,
      position,
      color: '#ffaa00',
      intensity: intensity * 2.0,
      radius: 200 * intensity,
      type: LightType.EXPLOSION,
      animated: true
    });
    
    // Remove explosion light after short duration
    setTimeout(() => {
      this.removeLightSource(id);
    }, 200);
    
    return id;
  }

  /**
   * Add muzzle flash lighting
   */
  addMuzzleFlash(position: Vector2): string {
    const id = `muzzle_${Date.now()}_${Math.random()}`;
    
    this.addLightSource({
      id,
      position,
      color: '#ffffff',
      intensity: 1.5,
      radius: 50,
      type: LightType.MUZZLE_FLASH,
      animated: true
    });
    
    // Remove muzzle flash after very short duration
    setTimeout(() => {
      this.removeLightSource(id);
    }, 50);
    
    return id;
  }

  /**
   * Update lighting system (called each frame)
   */
  update(deltaTime: number): void {
    // Update animated lights
    this.lightSources.forEach(light => {
      if (light.animated || light.flickerRate) {
        this.updateLightAnimation(light, deltaTime);
      }
    });
    
    // Update atmospheric effects
    this.atmosphericEffects.forEach(effect => {
      if (effect.animated) {
        this.updateAtmosphericAnimation(effect, deltaTime);
      }
    });
  }

  /**
   * Update light animation (flickering, pulsing)
   */
  private updateLightAnimation(light: LightSource, _deltaTime: number): void {
    if (light.flickerRate && light.flickerIntensity) {
      // Flicker calculation is done during rendering for performance
      // Intensity is modified during rendering, not stored
    }
  }

  /**
   * Update atmospheric effect animations
   */
  private updateAtmosphericAnimation(_effect: AtmosphericEffect, _deltaTime: number): void {
    // Atmospheric effects are animated during rendering
  }

  /**
   * Render lighting to off-screen canvas
   */
  private renderLighting(): void {
    if (!this.needsUpdate) return;
    
    // Clear lighting canvas
    this.lightingCtx.fillStyle = this.timeOfDay.ambient;
    this.lightingCtx.fillRect(0, 0, this.lightingCanvas.width, this.lightingCanvas.height);
    
    // Set blend mode for additive lighting
    this.lightingCtx.globalCompositeOperation = 'lighter';
    
    // Render each light source
    this.lightSources.forEach(light => {
      this.renderLightSource(light);
    });
    
    // Render atmospheric effects
    this.lightingCtx.globalCompositeOperation = 'multiply';
    this.atmosphericEffects.forEach(effect => {
      this.renderAtmosphericEffect(effect);
    });
    
    this.needsUpdate = false;
  }

  /**
   * Render individual light source
   */
  private renderLightSource(light: LightSource): void {
    const ctx = this.lightingCtx;
    
    // Calculate flicker if applicable
    let intensity = light.intensity;
    if (light.flickerRate && light.flickerIntensity) {
      const time = Date.now() * 0.001;
      const flicker = Math.sin(time * light.flickerRate * 10) * light.flickerIntensity;
      intensity = Math.max(0, intensity + flicker);
    }
    
    // Create radial gradient for light
    const gradient = ctx.createRadialGradient(
      light.position.x, light.position.y, 0,
      light.position.x, light.position.y, light.radius
    );
    
    // Parse color and apply intensity
    const color = this.parseColor(light.color);
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity})`);
    gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.5})`);
    gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(light.position.x, light.position.y, light.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Render atmospheric effect
   */
  private renderAtmosphericEffect(effect: AtmosphericEffect): void {
    switch (effect.type) {
      case EffectType.FOG:
        this.renderFog(effect);
        break;
      case EffectType.RAIN:
        this.renderRain(effect);
        break;
      case EffectType.NEON_GLOW:
        this.renderNeonGlow(effect);
        break;
      case EffectType.SPARKS:
        this.renderSparks(effect);
        break;
    }
  }

  /**
   * Render fog effect
   */
  private renderFog(effect: AtmosphericEffect): void {
    const ctx = this.lightingCtx;
    const color = this.parseColor(effect.color);
    
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${effect.intensity * 0.3})`;
    ctx.fillRect(0, 0, this.lightingCanvas.width, this.lightingCanvas.height);
  }

  /**
   * Render rain effect
   */
  private renderRain(effect: AtmosphericEffect): void {
    const ctx = this.lightingCtx;
    const color = this.parseColor(effect.color);
    
    // Create rain overlay
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${effect.intensity * 0.2})`;
    ctx.fillRect(0, 0, this.lightingCanvas.width, this.lightingCanvas.height);
    
    // Add animated rain lines
    if (effect.animated) {
      const time = Date.now() * 0.001;
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${effect.intensity * 0.5})`;
      ctx.lineWidth = 1;
      
      for (let i = 0; i < 50; i++) {
        const x = (i * 37 + time * 200) % this.lightingCanvas.width;
        const y1 = (i * 23 + time * 300) % this.lightingCanvas.height;
        const y2 = y1 + 20;
        
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x + 5, y2);
        ctx.stroke();
      }
    }
  }

  /**
   * Render neon glow effect
   */
  private renderNeonGlow(effect: AtmosphericEffect): void {
    if (!effect.position || !effect.radius) return;
    
    const ctx = this.lightingCtx;
    const color = this.parseColor(effect.color);
    
    // Create neon glow gradient
    const gradient = ctx.createRadialGradient(
      effect.position.x, effect.position.y, 0,
      effect.position.x, effect.position.y, effect.radius
    );
    
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${effect.intensity})`);
    gradient.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, ${effect.intensity * 0.3})`);
    gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(effect.position.x, effect.position.y, effect.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Render sparks effect
   */
  private renderSparks(effect: AtmosphericEffect): void {
    if (!effect.position || !effect.radius) return;
    
    const ctx = this.lightingCtx;
    const color = this.parseColor(effect.color);
    const time = Date.now() * 0.001;
    
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${effect.intensity})`;
    
    // Animated sparks
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + time;
      const distance = Math.sin(time * 2 + i) * effect.radius * 0.5;
      const x = effect.position.x + Math.cos(angle) * distance;
      const y = effect.position.y + Math.sin(angle) * distance;
      
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Parse color string to RGB values
   */
  private parseColor(color: string): { r: number; g: number; b: number } {
    // Simple hex color parser
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }
    
    // Default to white
    return { r: 255, g: 255, b: 255 };
  }

  /**
   * Apply lighting to main canvas
   */
  applyLighting(): void {
    this.renderLighting();
    
    // Apply lighting overlay to main canvas
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'multiply';
    this.ctx.drawImage(this.lightingCanvas, 0, 0);
    this.ctx.restore();
  }

  /**
   * Resize lighting canvas
   */
  resize(width: number, height: number): void {
    this.lightingCanvas.width = width;
    this.lightingCanvas.height = height;
    this.needsUpdate = true;
  }

  /**
   * Get current time of day
   */
  getTimeOfDay(): TimeOfDay {
    return { ...this.timeOfDay };
  }

  /**
   * Get current weather
   */
  getWeather(): WeatherType {
    return this.weather;
  }

  /**
   * Get all light sources (for debugging)
   */
  getLightSources(): LightSource[] {
    return Array.from(this.lightSources.values());
  }

  /**
   * Get atmospheric effects (for debugging)
   */
  getAtmosphericEffects(): AtmosphericEffect[] {
    return [...this.atmosphericEffects];
  }

  /**
   * Clear all lighting
   */
  clear(): void {
    this.lightSources.clear();
    this.atmosphericEffects = [];
    this.needsUpdate = true;
  }
}