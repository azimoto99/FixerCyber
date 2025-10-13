// Enhanced Player entity with inventory and state management
import {
  Augmentation,
  Housing,
  InventoryItem,
  Vector2,
} from '../../types/game';

export interface PlayerState {
  id: string;
  username: string;
  position: Vector2;
  velocity: Vector2;
  facing: number;
  health: number;
  maxHealth: number;
  credits: number;
  isAlive: boolean;
  isProne: boolean;
  isRolling: boolean;
  lastSeen: Date;

  // Inventory system
  inventory: InventoryItem[];
  equippedWeapon: InventoryItem | null;

  // Augmentation system
  augmentations: Augmentation[];

  // Housing system
  housing: Housing | null;

  // Progression
  reputation: number;
  level: number;
  experience: number;

  // Neural programs
  neuralPrograms: string[];
  systemHeat: number;

  // Vision and detection
  visionRange: number;

  // Movement state
  speed: number;
  acceleration: number;

  // Combat state
  equippedWeaponId: string | null;
  ammo: Map<string, number>;
}

export class Player {
  public id: string;
  public username: string;
  public position: Vector2;
  public velocity: Vector2;
  public facing: number;
  public health: number;
  public maxHealth: number;
  public credits: number;
  public isAlive: boolean;
  public isProne: boolean;
  public isRolling: boolean;
  public lastSeen: Date;

  // Inventory system
  public inventory: InventoryItem[];
  public equippedWeapon: InventoryItem | null;

  // Augmentation system
  public augmentations: Augmentation[];

  // Housing system
  public housing: Housing | null;

  // Progression
  public reputation: number;
  public level: number;
  public experience: number;

  // Neural programs
  public neuralPrograms: string[];
  public systemHeat: number;

  // Vision and detection
  public visionRange: number;

  // Movement state
  public speed: number;
  public acceleration: number;

  // Combat state
  public equippedWeaponId: string | null;
  public ammo: Map<string, number>;

  // Collision bounds
  public collisionRadius: number;

  constructor(id: string, username: string, position: Vector2) {
    this.id = id;
    this.username = username;
    this.position = position;
    this.velocity = { x: 0, y: 0 };
    this.facing = 0;
    this.health = 100;
    this.maxHealth = 100;
    this.credits = 1000; // Starting credits
    this.isAlive = true;
    this.isProne = false;
    this.isRolling = false;
    this.lastSeen = new Date();

    // Initialize inventory system
    this.inventory = [];
    this.equippedWeapon = null;

    // Initialize augmentation system
    this.augmentations = [];

    // Initialize housing system
    this.housing = null;

    // Initialize progression
    this.reputation = 0;
    this.level = 1;
    this.experience = 0;

    // Initialize neural programs
    this.neuralPrograms = [];
    this.systemHeat = 0;

    // Initialize vision and detection
    this.visionRange = 500; // Default vision range

    // Initialize movement state
    this.speed = 200; // pixels per second
    this.acceleration = 800; // pixels per second squared

    // Initialize combat state
    this.equippedWeaponId = null;
    this.ammo = new Map();

    // Initialize collision
    this.collisionRadius = 15; // Player collision radius in pixels
  }

  // Movement
  moveTo(position: Vector2) {
    this.position = position;
    this.lastSeen = new Date();
  }

  // Health management
  takeDamage(damage: number) {
    this.health = Math.max(0, this.health - damage);
    if (this.health <= 0) {
      this.die();
    }
  }

  heal(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  die() {
    this.isAlive = false;
    this.health = 0;
    // Drop items, lose credits, etc.
  }

  respawn() {
    this.isAlive = true;
    this.health = this.maxHealth;
    // Reset position to spawn or housing
  }

  // Movement and physics
  updatePosition(deltaTime: number, worldSystem?: any): void {
    if (!this.isAlive) return;

    // Apply velocity to position
    const newPosition = {
      x: this.position.x + (this.velocity.x * deltaTime) / 1000,
      y: this.position.y + (this.velocity.y * deltaTime) / 1000,
    };

    // Check collision if world system is available
    if (worldSystem && worldSystem.isBlocked) {
      if (!worldSystem.isBlocked(newPosition)) {
        this.position = newPosition;
      } else {
        // Stop movement if blocked
        this.velocity = { x: 0, y: 0 };
      }
    } else {
      this.position = newPosition;
    }

    this.lastSeen = new Date();
  }

  setVelocity(velocity: Vector2): void {
    this.velocity = velocity;
  }

  setFacing(angle: number): void {
    this.facing = angle;
  }

  // State management
  setProne(isProne: boolean): void {
    this.isProne = isProne;
    // Adjust speed and visibility when prone
    if (isProne) {
      this.speed = 50; // Slower when prone
      this.visionRange = 300; // Reduced vision when prone
    } else {
      this.speed = 200; // Normal speed
      this.visionRange = 500; // Normal vision
    }
  }

  setRolling(isRolling: boolean): void {
    this.isRolling = isRolling;
  }

  // Inventory system
  addItem(item: InventoryItem): boolean {
    // Check if inventory has space (simplified - real implementation would check grid)
    if (this.inventory.length < 20) {
      // Max 20 items for now
      this.inventory.push(item);
      return true;
    }
    return false;
  }

  removeItem(itemId: string): InventoryItem | null {
    const index = this.inventory.findIndex(item => item.id === itemId);
    if (index !== -1) {
      return this.inventory.splice(index, 1)[0];
    }
    return null;
  }

  equipWeapon(weaponId: string): boolean {
    const weapon = this.inventory.find(item => item.id === weaponId);
    if (weapon && weapon.type === 'weapon') {
      this.equippedWeapon = weapon;
      this.equippedWeaponId = weaponId;
      return true;
    }
    return false;
  }

  unequipWeapon(): void {
    this.equippedWeapon = null;
    this.equippedWeaponId = null;
  }

  // Augmentation system
  installAugmentation(augmentation: Augmentation): boolean {
    // Check if augmentation is already installed
    const existing = this.augmentations.find(aug => aug.id === augmentation.id);
    if (existing) {
      return false;
    }

    this.augmentations.push(augmentation);
    this.applyAugmentationEffects(augmentation);
    return true;
  }

  removeAugmentation(augmentationId: string): boolean {
    const index = this.augmentations.findIndex(
      aug => aug.id === augmentationId
    );
    if (index !== -1) {
      const augmentation = this.augmentations[index];
      this.removeAugmentationEffects(augmentation);
      this.augmentations.splice(index, 1);
      return true;
    }
    return false;
  }

  private applyAugmentationEffects(augmentation: Augmentation): void {
    augmentation.effects.forEach(effect => {
      switch (effect.type) {
        case 'health':
          this.maxHealth += effect.value;
          break;
        case 'speed':
          this.speed += effect.value;
          break;
        case 'vision':
          this.visionRange += effect.value;
          break;
        case 'damage':
          // Apply damage bonus (would be used in combat calculations)
          break;
      }
    });
  }

  private removeAugmentationEffects(augmentation: Augmentation): void {
    augmentation.effects.forEach(effect => {
      switch (effect.type) {
        case 'health':
          this.maxHealth -= effect.value;
          this.health = Math.min(this.health, this.maxHealth);
          break;
        case 'speed':
          this.speed -= effect.value;
          break;
        case 'vision':
          this.visionRange -= effect.value;
          break;
        case 'damage':
          // Remove damage bonus
          break;
      }
    });
  }

  // Neural programs
  addNeuralProgram(programName: string): boolean {
    if (!this.neuralPrograms.includes(programName)) {
      this.neuralPrograms.push(programName);
      return true;
    }
    return false;
  }

  removeNeuralProgram(programName: string): boolean {
    const index = this.neuralPrograms.indexOf(programName);
    if (index !== -1) {
      this.neuralPrograms.splice(index, 1);
      return true;
    }
    return false;
  }

  hasNeuralProgram(programName: string): boolean {
    return this.neuralPrograms.includes(programName);
  }

  increaseSystemHeat(amount: number): void {
    this.systemHeat = Math.min(100, this.systemHeat + amount);
  }

  decreaseSystemHeat(amount: number): void {
    this.systemHeat = Math.max(0, this.systemHeat - amount);
  }

  // Combat
  setAmmo(weaponType: string, amount: number): void {
    this.ammo.set(weaponType, amount);
  }

  getAmmo(weaponType: string): number {
    return this.ammo.get(weaponType) || 0;
  }

  useAmmo(weaponType: string, amount: number = 1): boolean {
    const currentAmmo = this.getAmmo(weaponType);
    if (currentAmmo >= amount) {
      this.ammo.set(weaponType, currentAmmo - amount);
      return true;
    }
    return false;
  }

  // Experience and leveling
  gainExperience(amount: number) {
    this.experience += amount;
    this.checkLevelUp();
  }

  private checkLevelUp() {
    const requiredExp = this.getRequiredExperience(this.level + 1);
    if (this.experience >= requiredExp) {
      this.levelUp();
    }
  }

  private levelUp() {
    this.level += 1;
    this.maxHealth += 10;
    this.health = this.maxHealth;
    // Award skill points, etc.
  }

  private getRequiredExperience(level: number): number {
    return level * 1000; // Simple formula
  }

  // Housing system
  purchaseHousing(housing: Housing, cost: number): boolean {
    if (this.credits >= cost) {
      this.credits -= cost;
      this.housing = housing;
      return true;
    }
    return false;
  }

  // Collision detection
  isCollidingWith(other: Player): boolean {
    const dx = this.position.x - other.position.x;
    const dy = this.position.y - other.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.collisionRadius + other.collisionRadius;
  }

  isCollidingWithPoint(point: Vector2, radius: number = 0): boolean {
    const dx = this.position.x - point.x;
    const dy = this.position.y - point.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.collisionRadius + radius;
  }

  // Getters
  getAugmentations(): Augmentation[] {
    return [...this.augmentations];
  }

  getInventory(): InventoryItem[] {
    return [...this.inventory];
  }

  getNeuralPrograms(): string[] {
    return [...this.neuralPrograms];
  }

  // State queries
  canMove(): boolean {
    return this.isAlive && !this.isRolling;
  }

  canShoot(): boolean {
    return this.isAlive && this.equippedWeapon !== null && !this.isRolling;
  }

  canInteract(): boolean {
    return this.isAlive && !this.isRolling;
  }

  // Get current state snapshot
  getState(): PlayerState {
    return {
      id: this.id,
      username: this.username,
      position: { ...this.position },
      velocity: { ...this.velocity },
      facing: this.facing,
      health: this.health,
      maxHealth: this.maxHealth,
      credits: this.credits,
      isAlive: this.isAlive,
      isProne: this.isProne,
      isRolling: this.isRolling,
      lastSeen: this.lastSeen,
      inventory: [...this.inventory],
      equippedWeapon: this.equippedWeapon,
      augmentations: [...this.augmentations],
      housing: this.housing,
      reputation: this.reputation,
      level: this.level,
      experience: this.experience,
      neuralPrograms: [...this.neuralPrograms],
      systemHeat: this.systemHeat,
      visionRange: this.visionRange,
      speed: this.speed,
      acceleration: this.acceleration,
      equippedWeaponId: this.equippedWeaponId,
      ammo: new Map(this.ammo),
    };
  }

  // Apply state from snapshot
  setState(state: Partial<PlayerState>): void {
    if (state.position) this.position = { ...state.position };
    if (state.velocity) this.velocity = { ...state.velocity };
    if (state.facing !== undefined) this.facing = state.facing;
    if (state.health !== undefined) this.health = state.health;
    if (state.maxHealth !== undefined) this.maxHealth = state.maxHealth;
    if (state.credits !== undefined) this.credits = state.credits;
    if (state.isAlive !== undefined) this.isAlive = state.isAlive;
    if (state.isProne !== undefined) this.isProne = state.isProne;
    if (state.isRolling !== undefined) this.isRolling = state.isRolling;
    if (state.inventory) this.inventory = [...state.inventory];
    if (state.equippedWeapon) this.equippedWeapon = state.equippedWeapon;
    if (state.augmentations) this.augmentations = [...state.augmentations];
    if (state.housing) this.housing = state.housing;
    if (state.reputation !== undefined) this.reputation = state.reputation;
    if (state.level !== undefined) this.level = state.level;
    if (state.experience !== undefined) this.experience = state.experience;
    if (state.neuralPrograms) this.neuralPrograms = [...state.neuralPrograms];
    if (state.systemHeat !== undefined) this.systemHeat = state.systemHeat;
    if (state.visionRange !== undefined) this.visionRange = state.visionRange;
    if (state.speed !== undefined) this.speed = state.speed;
    if (state.acceleration !== undefined)
      this.acceleration = state.acceleration;
    if (state.equippedWeaponId !== undefined)
      this.equippedWeaponId = state.equippedWeaponId;
    if (state.ammo) this.ammo = new Map(state.ammo);
  }

  getHealthPercentage(): number {
    return (this.health / this.maxHealth) * 100;
  }

  getExperiencePercentage(): number {
    const currentLevelExp = this.getRequiredExperience(this.level);
    const nextLevelExp = this.getRequiredExperience(this.level + 1);
    const progress = this.experience - currentLevelExp;
    const required = nextLevelExp - currentLevelExp;
    return (progress / required) * 100;
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      position: this.position,
      velocity: this.velocity,
      facing: this.facing,
      health: this.health,
      maxHealth: this.maxHealth,
      credits: this.credits,
      isAlive: this.isAlive,
      isProne: this.isProne,
      isRolling: this.isRolling,
      lastSeen: this.lastSeen,
      inventory: this.inventory,
      equippedWeapon: this.equippedWeapon,
      augmentations: this.augmentations,
      housing: this.housing,
      reputation: this.reputation,
      level: this.level,
      experience: this.experience,
      neuralPrograms: this.neuralPrograms,
      systemHeat: this.systemHeat,
      visionRange: this.visionRange,
      speed: this.speed,
      acceleration: this.acceleration,
      equippedWeaponId: this.equippedWeaponId,
      ammo: Array.from(this.ammo.entries()),
      collisionRadius: this.collisionRadius,
    };
  }

  static fromJSON(data: any): Player {
    const player = new Player(data.id, data.username, data.position);

    // Basic properties
    player.velocity = data.velocity || { x: 0, y: 0 };
    player.facing = data.facing || 0;
    player.health = data.health || 100;
    player.maxHealth = data.maxHealth || 100;
    player.credits = data.credits || 0;
    player.isAlive = data.isAlive !== undefined ? data.isAlive : true;
    player.isProne = data.isProne || false;
    player.isRolling = data.isRolling || false;
    player.lastSeen = data.lastSeen ? new Date(data.lastSeen) : new Date();

    // Complex properties
    player.inventory = data.inventory || [];
    player.equippedWeapon = data.equippedWeapon || null;
    player.augmentations = data.augmentations || [];
    player.housing = data.housing || null;
    player.reputation = data.reputation || 0;
    player.level = data.level || 1;
    player.experience = data.experience || 0;
    player.neuralPrograms = data.neuralPrograms || [];
    player.systemHeat = data.systemHeat || 0;
    player.visionRange = data.visionRange || 500;
    player.speed = data.speed || 200;
    player.acceleration = data.acceleration || 800;
    player.equippedWeaponId = data.equippedWeaponId || null;
    player.collisionRadius = data.collisionRadius || 15;

    // Restore ammo map
    if (data.ammo && Array.isArray(data.ammo)) {
      player.ammo = new Map(data.ammo);
    }

    return player;
  }
}
