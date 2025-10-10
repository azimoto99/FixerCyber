// Demo showcasing the dynamic lighting system
import { DistrictType, WeatherType } from '../../types/world';
// import { IsometricRenderer } from '../engine/IsometricRenderer';
import { LightingSystem } from '../systems/LightingSystem';
import { Vector2 } from '../utils/Vector2';

export class LightingDemo {
  private canvas: HTMLCanvasElement;
  // private renderer: IsometricRenderer;
  private lightingSystem: LightingSystem;
  private animationId: number = 0;
  private lastTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    // this.renderer = new IsometricRenderer(canvas);
    this.lightingSystem = new LightingSystem(canvas, {
      enableDynamicLighting: true,
      enableAtmosphericEffects: true,
      enableDayNightCycle: true,
      lightingQuality: 'high',
      performanceMode: false,
    });

    // Integrate lighting with renderer
    // this.renderer.setLightingSystem(this.lightingSystem);

    this.setupDemo();
  }

  private setupDemo(): void {
    // Generate different district types for demonstration
    const districts = [
      {
        type: DistrictType.CORPORATE,
        bounds: { x: -200, y: -200, width: 200, height: 200 },
      },
      {
        type: DistrictType.INDUSTRIAL,
        bounds: { x: 0, y: -200, width: 200, height: 200 },
      },
      {
        type: DistrictType.RESIDENTIAL,
        bounds: { x: -200, y: 0, width: 200, height: 200 },
      },
      {
        type: DistrictType.UNDERGROUND,
        bounds: { x: 0, y: 0, width: 200, height: 200 },
      },
      {
        type: DistrictType.WASTELAND,
        bounds: { x: 200, y: 200, width: 200, height: 200 },
      },
    ];

    districts.forEach(district => {
      this.lightingSystem.generateDistrictLighting(
        district.type,
        district.bounds
      );
    });

    // Set initial time to night for better cyberpunk atmosphere
    this.lightingSystem.setTimeOfDay(22);

    // Start with clear weather
    this.lightingSystem.setWeather(WeatherType.CLEAR);
  }

  public start(): void {
    this.lastTime = performance.now();
    this.gameLoop();
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private gameLoop = (): void => {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    // Update lighting system
    this.lightingSystem.update(deltaTime);

    // Update camera to show different districts
    // const time = performance.now() * 0.0005;
    // const cameraX = Math.sin(time) * 100;
    // const cameraY = Math.cos(time) * 100;
    // this.renderer.setCameraPosition(new Vector2(cameraX, cameraY));
  }

  private render(): void {
    // Clear canvas
    // this.renderer.clear();

    // Render grid for reference
    // this.renderer.renderGrid(20, '#1a1a1a');

    // Add some demo sprites to show lighting effects
    // this.addDemoSprites();

    // Render with lighting
    // this.renderer.renderWithLighting();

    // Render performance stats
    this.renderStats();
  }

  // private addDemoSprites(): void {
  //   // Add some buildings/objects to demonstrate lighting
  //   const buildings = [
  //     {
  //       pos: new Vector2(-100, -100),
  //       color: '#333333',
  //       size: new Vector2(40, 60),
  //     },
  //     {
  //       pos: new Vector2(50, -150),
  //       color: '#444444',
  //       size: new Vector2(30, 80),
  //     },
  //     {
  //       pos: new Vector2(-150, 50),
  //       color: '#555555',
  //       size: new Vector2(50, 40),
  //     },
  //     {
  //       pos: new Vector2(100, 100),
  //       color: '#222222',
  //       size: new Vector2(35, 70),
  //     },
  //   ];

  //   buildings.forEach(building => {
  //     this.renderer.addToRenderQueue({
  //       position: building.pos,
  //       size: building.size,
  //       color: building.color,
  //       depth: building.pos.y,
  //       height: 20,
  //     });
  //   });
  // }

  private renderStats(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    const stats = this.lightingSystem.getPerformanceStats();
    const time = this.lightingSystem.getCurrentTime();

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 10, 250, 120);

    ctx.fillStyle = '#00ff00';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';

    let y = 30;
    ctx.fillText(`Time: ${time.timeString}`, 20, y);
    y += 20;
    ctx.fillText(`Weather: ${stats.weather}`, 20, y);
    y += 20;
    ctx.fillText(`Light Sources: ${stats.lightSources}`, 20, y);
    y += 20;
    ctx.fillText(`Atmospheric Effects: ${stats.atmosphericEffects}`, 20, y);
    y += 20;
    ctx.fillText(`Press keys: 1-5 (weather), T (time)`, 20, y);

    ctx.restore();
  }

  // Demo controls
  public setWeather(weather: WeatherType): void {
    this.lightingSystem.setWeather(weather);
  }

  public setTimeOfDay(hour: number): void {
    this.lightingSystem.setTimeOfDay(hour);
  }

  public addExplosion(position: Vector2): void {
    this.lightingSystem.addCombatLighting(position, 'explosion', 1.0);
  }

  public addMuzzleFlash(position: Vector2): void {
    this.lightingSystem.addCombatLighting(position, 'muzzle_flash');
  }

  public getStats() {
    return {
      lighting: this.lightingSystem.getPerformanceStats(),
      // renderer: this.renderer.getPerformanceStats(),
      time: this.lightingSystem.getCurrentTime(),
    };
  }
}
