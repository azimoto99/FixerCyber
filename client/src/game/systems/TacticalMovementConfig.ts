/**
 * Configuration interface for tactical movement system
 */
export interface TacticalMovementConfig {
  /** Base movement speed in pixels per second */
  baseSpeed: number;

  /** Enable instant movement response without acceleration */
  instantResponse: boolean;

  /** Enable grid-based movement mode */
  gridMode: boolean;

  /** Grid cell size in pixels */
  gridSize: number;

  /** Normalize diagonal movement speed to match cardinal directions */
  normalizeDiagonal: boolean;

  /** Movement repeat interval for grid mode in milliseconds */
  gridMoveInterval: number;

  /** Enable collision detection */
  collisionEnabled: boolean;
}

/**
 * Movement configuration class with validation and bounds checking
 */
export class MovementConfiguration {
  // Speed configuration constants
  static readonly MIN_SPEED = 50;
  static readonly MAX_SPEED = 500;
  static readonly DEFAULT_SPEED = 200;

  // Grid configuration constants
  static readonly MIN_GRID_SIZE = 16;
  static readonly MAX_GRID_SIZE = 64;
  static readonly DEFAULT_GRID_SIZE = 32;

  // Grid movement timing constants
  static readonly MIN_GRID_INTERVAL = 100; // milliseconds
  static readonly MAX_GRID_INTERVAL = 1000; // milliseconds
  static readonly DEFAULT_GRID_INTERVAL = 200; // milliseconds

  private config: TacticalMovementConfig;

  constructor(config?: Partial<TacticalMovementConfig>) {
    this.config = this.createDefaultConfig();

    if (config) {
      this.updateConfig(config);
    }
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(): TacticalMovementConfig {
    return {
      baseSpeed: MovementConfiguration.DEFAULT_SPEED,
      instantResponse: true,
      gridMode: false,
      gridSize: MovementConfiguration.DEFAULT_GRID_SIZE,
      normalizeDiagonal: true,
      gridMoveInterval: MovementConfiguration.DEFAULT_GRID_INTERVAL,
      collisionEnabled: true,
    };
  }

  /**
   * Update configuration with validation
   */
  updateConfig(updates: Partial<TacticalMovementConfig>): void {
    const newConfig = { ...this.config, ...updates };

    // Validate all configuration values
    if (!this.validateConfig(newConfig)) {
      throw new Error('Invalid configuration provided');
    }

    this.config = newConfig;
  }

  /**
   * Validate complete configuration object
   */
  private validateConfig(config: TacticalMovementConfig): boolean {
    return (
      MovementConfiguration.validateSpeed(config.baseSpeed) &&
      MovementConfiguration.validateGridSize(config.gridSize) &&
      MovementConfiguration.validateGridInterval(config.gridMoveInterval) &&
      typeof config.instantResponse === 'boolean' &&
      typeof config.gridMode === 'boolean' &&
      typeof config.normalizeDiagonal === 'boolean' &&
      typeof config.collisionEnabled === 'boolean'
    );
  }

  /**
   * Validate movement speed value
   */
  static validateSpeed(speed: number): boolean {
    return (
      typeof speed === 'number' &&
      !isNaN(speed) &&
      speed >= MovementConfiguration.MIN_SPEED &&
      speed <= MovementConfiguration.MAX_SPEED
    );
  }

  /**
   * Validate grid size value
   */
  static validateGridSize(size: number): boolean {
    return (
      typeof size === 'number' &&
      !isNaN(size) &&
      size >= MovementConfiguration.MIN_GRID_SIZE &&
      size <= MovementConfiguration.MAX_GRID_SIZE &&
      size % 2 === 0 // Grid size should be even for proper alignment
    );
  }

  /**
   * Validate grid movement interval
   */
  static validateGridInterval(interval: number): boolean {
    return (
      typeof interval === 'number' &&
      !isNaN(interval) &&
      interval >= MovementConfiguration.MIN_GRID_INTERVAL &&
      interval <= MovementConfiguration.MAX_GRID_INTERVAL
    );
  }

  /**
   * Clamp speed to valid range
   */
  static clampSpeed(speed: number): number {
    return Math.max(
      MovementConfiguration.MIN_SPEED,
      Math.min(MovementConfiguration.MAX_SPEED, speed)
    );
  }

  /**
   * Clamp grid size to valid range and ensure even number
   */
  static clampGridSize(size: number): number {
    const clamped = Math.max(
      MovementConfiguration.MIN_GRID_SIZE,
      Math.min(MovementConfiguration.MAX_GRID_SIZE, size)
    );

    // Ensure even number for proper grid alignment
    return Math.floor(clamped / 2) * 2;
  }

  /**
   * Clamp grid interval to valid range
   */
  static clampGridInterval(interval: number): number {
    return Math.max(
      MovementConfiguration.MIN_GRID_INTERVAL,
      Math.min(MovementConfiguration.MAX_GRID_INTERVAL, interval)
    );
  }

  // Getter methods for configuration values
  getConfig(): Readonly<TacticalMovementConfig> {
    return { ...this.config };
  }

  getBaseSpeed(): number {
    return this.config.baseSpeed;
  }

  isInstantResponse(): boolean {
    return this.config.instantResponse;
  }

  isGridMode(): boolean {
    return this.config.gridMode;
  }

  getGridSize(): number {
    return this.config.gridSize;
  }

  isNormalizeDiagonal(): boolean {
    return this.config.normalizeDiagonal;
  }

  getGridMoveInterval(): number {
    return this.config.gridMoveInterval;
  }

  isCollisionEnabled(): boolean {
    return this.config.collisionEnabled;
  }

  // Setter methods with validation
  setBaseSpeed(speed: number): void {
    if (!MovementConfiguration.validateSpeed(speed)) {
      throw new Error(
        `Invalid speed: ${speed}. Must be between ${MovementConfiguration.MIN_SPEED} and ${MovementConfiguration.MAX_SPEED}`
      );
    }
    this.config.baseSpeed = speed;
  }

  setInstantResponse(enabled: boolean): void {
    this.config.instantResponse = enabled;
  }

  setGridMode(enabled: boolean): void {
    this.config.gridMode = enabled;
  }

  setGridSize(size: number): void {
    if (!MovementConfiguration.validateGridSize(size)) {
      throw new Error(
        `Invalid grid size: ${size}. Must be between ${MovementConfiguration.MIN_GRID_SIZE} and ${MovementConfiguration.MAX_GRID_SIZE} and be an even number`
      );
    }
    this.config.gridSize = size;
  }

  setNormalizeDiagonal(enabled: boolean): void {
    this.config.normalizeDiagonal = enabled;
  }

  setGridMoveInterval(interval: number): void {
    if (!MovementConfiguration.validateGridInterval(interval)) {
      throw new Error(
        `Invalid grid interval: ${interval}. Must be between ${MovementConfiguration.MIN_GRID_INTERVAL} and ${MovementConfiguration.MAX_GRID_INTERVAL}`
      );
    }
    this.config.gridMoveInterval = interval;
  }

  setCollisionEnabled(enabled: boolean): void {
    this.config.collisionEnabled = enabled;
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.config = this.createDefaultConfig();
  }

  /**
   * Create a copy of this configuration
   */
  clone(): MovementConfiguration {
    return new MovementConfiguration(this.config);
  }

  /**
   * Serialize configuration to JSON
   */
  toJSON(): TacticalMovementConfig {
    return { ...this.config };
  }

  /**
   * Create configuration from JSON data
   */
  static fromJSON(data: any): MovementConfiguration {
    return new MovementConfiguration(data);
  }

  /**
   * Get configuration bounds information
   */
  static getBounds() {
    return {
      speed: {
        min: MovementConfiguration.MIN_SPEED,
        max: MovementConfiguration.MAX_SPEED,
        default: MovementConfiguration.DEFAULT_SPEED,
      },
      gridSize: {
        min: MovementConfiguration.MIN_GRID_SIZE,
        max: MovementConfiguration.MAX_GRID_SIZE,
        default: MovementConfiguration.DEFAULT_GRID_SIZE,
      },
      gridInterval: {
        min: MovementConfiguration.MIN_GRID_INTERVAL,
        max: MovementConfiguration.MAX_GRID_INTERVAL,
        default: MovementConfiguration.DEFAULT_GRID_INTERVAL,
      },
    };
  }
}
