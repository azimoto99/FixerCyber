// Character Animation System that manages player animations
import { AnimationManager, AnimationState, Direction } from '../engine/AnimationManager';
import { Vector2 } from '../utils/Vector2';

export interface CharacterAnimationData {
  playerId: string;
  animationManager: AnimationManager;
  lastMovement: Vector2;
  isMoving: boolean;
  isProne: boolean;
  isRolling: boolean;
  isInteracting: boolean;
  isHacking: boolean;
  isTakingDamage: boolean;
  isDead: boolean;
  movementSpeed: number;
  lastStateChange: number;
  currentWeapon: string;
  isShooting: boolean;
  isReloading: boolean;
  rollDirection: Vector2;
  damageDirection: Vector2;
  isAiming: boolean;
  weaponType: WeaponType;
  lastActionTime: number;
  interactionTarget: string | null;
  idleVariation: number;
  lastIdleTime: number;
}

export enum WeaponType {
  PISTOL = 'pistol',
  RIFLE = 'rifle',
  SHOTGUN = 'shotgun',
  SMG = 'smg',
  SNIPER = 'sniper',
  MELEE = 'melee',
  UNARMED = 'unarmed'
}

/**
 * System that manages character animations for all players
 * Handles state transitions based on player actions and movement
 */
export class CharacterAnimationSystem {
  private characterAnimations: Map<string, CharacterAnimationData> = new Map();
  private defaultSpriteSheets: Map<string, string> = new Map();

  constructor() {
    this.setupDefaultSpriteSheets();
  }

  /**
   * Setup default sprite sheet paths
   */
  private setupDefaultSpriteSheets(): void {
    // In a real implementation, these would be actual sprite sheet paths
    this.defaultSpriteSheets.set('player_base', '/assets/sprites/player_base.png');
    this.defaultSpriteSheets.set('player_actions', '/assets/sprites/player_actions.png');
  }

  /**
   * Initialize animation system for a character
   */
  async initializeCharacter(playerId: string): Promise<void> {
    const animationManager = new AnimationManager();
    
    try {
      // Load sprite sheets (using placeholder dimensions for now)
      await this.loadCharacterSpriteSheets(animationManager);
      
      // Create animation clips
      this.createCharacterAnimationClips(animationManager);
      
      // Setup animation callbacks
      this.setupAnimationCallbacks(animationManager, playerId);

      // Initialize character data
      const characterData: CharacterAnimationData = {
        playerId,
        animationManager,
        lastMovement: new Vector2(0, 0),
        isMoving: false,
        isProne: false,
        isRolling: false,
        isInteracting: false,
        isHacking: false,
        isTakingDamage: false,
        isDead: false,
        movementSpeed: 0,
        lastStateChange: Date.now(),
        currentWeapon: 'pistol',
        isShooting: false,
        isReloading: false,
        rollDirection: new Vector2(0, 0),
        damageDirection: new Vector2(0, 0),
        isAiming: false,
        weaponType: WeaponType.PISTOL,
        lastActionTime: Date.now(),
        interactionTarget: null,
        idleVariation: 0,
        lastIdleTime: Date.now()
      };

      this.characterAnimations.set(playerId, characterData);
      
      // Set initial idle animation state
      animationManager.forceState(AnimationState.IDLE, Direction.SOUTH);
      
      console.log(`Initialized character animations for player: ${playerId}`);
    } catch (error) {
      console.error(`Failed to initialize character animations for ${playerId}:`, error);
      throw error;
    }
  }

  /**
   * Load character sprite sheets
   */
  private async loadCharacterSpriteSheets(animationManager: AnimationManager): Promise<void> {
    // Create placeholder sprite sheets for testing
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Fill with a simple pattern for testing
    ctx.fillStyle = '#4A90E2';
    ctx.fillRect(0, 0, 512, 512);
    
    // Create image from canvas
    const image = new Image();
    image.src = canvas.toDataURL();
    
    await new Promise<void>((resolve) => {
      image.onload = () => {
        animationManager.loadSpriteSheet('character_base', image, 64, 64, 8, 8);
        console.log('Loaded placeholder character sprite sheets');
        resolve();
      };
    });
  }

  /**
   * Create character animation clips
   */
  private createCharacterAnimationClips(animationManager: AnimationManager): void {
    // Basic movement animations (8 directions each)
    animationManager.createDirectionalAnimationClips('idle', 'character_base', [
      [0], [1], [2], [3], [4], [5], [6], [7] // 1 frame per direction
    ], 1000, true);

    animationManager.createDirectionalAnimationClips('walking', 'character_base', [
      [8, 9, 10, 11], [12, 13, 14, 15], [16, 17, 18, 19], [20, 21, 22, 23],
      [24, 25, 26, 27], [28, 29, 30, 31], [32, 33, 34, 35], [36, 37, 38, 39]
    ], 200, true);

    animationManager.createDirectionalAnimationClips('running', 'character_base', [
      [8, 9, 10, 11], [12, 13, 14, 15], [16, 17, 18, 19], [20, 21, 22, 23],
      [24, 25, 26, 27], [28, 29, 30, 31], [32, 33, 34, 35], [36, 37, 38, 39]
    ], 120, true);

    animationManager.createDirectionalAnimationClips('rolling', 'character_base', [
      [40, 41, 42, 43, 44], [45, 46, 47, 48, 49], [50, 51, 52, 53, 54], [55, 56, 57, 58, 59],
      [60, 61, 62, 63, 0], [1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15]
    ], 100, false);

    // Action animations
    animationManager.createDirectionalAnimationClips('shooting', 'character_base', [
      [16, 17], [18, 19], [20, 21], [22, 23], [24, 25], [26, 27], [28, 29], [30, 31]
    ], 80, false);

    animationManager.createDirectionalAnimationClips('reloading', 'character_base', [
      [32, 33, 34, 35, 36], [37, 38, 39, 40, 41], [42, 43, 44, 45, 46], [47, 48, 49, 50, 51],
      [52, 53, 54, 55, 56], [57, 58, 59, 60, 61], [62, 63, 0, 1, 2], [3, 4, 5, 6, 7]
    ], 300, false);

    animationManager.createDirectionalAnimationClips('aiming', 'character_base', [
      [8, 9], [10, 11], [12, 13], [14, 15], [16, 17], [18, 19], [20, 21], [22, 23]
    ], 500, true);

    animationManager.createDirectionalAnimationClips('melee_attack', 'character_base', [
      [24, 25, 26], [27, 28, 29], [30, 31, 32], [33, 34, 35], [36, 37, 38], [39, 40, 41], [42, 43, 44], [45, 46, 47]
    ], 100, false);

    animationManager.createDirectionalAnimationClips('throwing', 'character_base', [
      [48, 49, 50, 51], [52, 53, 54, 55], [56, 57, 58, 59], [60, 61, 62, 63],
      [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15]
    ], 150, false);

    // State animations
    animationManager.createDirectionalAnimationClips('prone_idle', 'character_base', [
      [16], [17], [18], [19], [20], [21], [22], [23]
    ], 1000, true);

    animationManager.createDirectionalAnimationClips('prone_moving', 'character_base', [
      [24, 25], [26, 27], [28, 29], [30, 31], [32, 33], [34, 35], [36, 37], [38, 39]
    ], 300, true);

    animationManager.createDirectionalAnimationClips('interacting', 'character_base', [
      [40, 41, 42, 43], [44, 45, 46, 47], [48, 49, 50, 51], [52, 53, 54, 55],
      [56, 57, 58, 59], [60, 61, 62, 63], [0, 1, 2, 3], [4, 5, 6, 7]
    ], 250, false);

    animationManager.createDirectionalAnimationClips('hacking', 'character_base', [
      [8, 9, 10, 11, 12], [13, 14, 15, 16, 17], [18, 19, 20, 21, 22], [23, 24, 25, 26, 27],
      [28, 29, 30, 31, 32], [33, 34, 35, 36, 37], [38, 39, 40, 41, 42], [43, 44, 45, 46, 47]
    ], 200, true);

    animationManager.createDirectionalAnimationClips('taking_damage', 'character_base', [
      [48, 49], [50, 51], [52, 53], [54, 55], [56, 57], [58, 59], [60, 61], [62, 63]
    ], 150, false);

    animationManager.createDirectionalAnimationClips('dying', 'character_base', [
      [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],
      [16, 17, 18, 19], [20, 21, 22, 23], [24, 25, 26, 27], [28, 29, 30, 31]
    ], 300, false);

    animationManager.createDirectionalAnimationClips('dead', 'character_base', [
      [3], [7], [11], [15], [19], [23], [27], [31]
    ], 1000, true);

    // Idle variations
    animationManager.createDirectionalAnimationClips('idle_variant_1', 'character_base', [
      [32, 33, 34], [35, 36, 37], [38, 39, 40], [41, 42, 43], [44, 45, 46], [47, 48, 49], [50, 51, 52], [53, 54, 55]
    ], 800, false);

    animationManager.createDirectionalAnimationClips('idle_variant_2', 'character_base', [
      [56, 57, 58, 59], [60, 61, 62, 63], [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15], [16, 17, 18, 19], [20, 21, 22, 23]
    ], 600, false);

    console.log('Created character animation clips including action animations');
  }

  /**
   * Setup animation callbacks
   */
  private setupAnimationCallbacks(_animationManager: AnimationManager, _playerId: string): void {
    // Add callbacks for animation completion events
    // This would be used for auto-transitioning back to idle after actions
  }

  /**
   * Update character movement and trigger appropriate animations
   */
  updateCharacterMovement(playerId: string, _position: Vector2, velocity: Vector2): void {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return;

    const movement = velocity;
    const speed = movement.magnitude;
    
    // Update movement data
    characterData.lastMovement = movement;
    characterData.isMoving = speed > 0.1; // Small threshold to avoid jitter
    characterData.movementSpeed = speed;

    // Calculate direction from movement
    let direction = Direction.SOUTH; // Default
    if (characterData.isMoving) {
      direction = AnimationManager.calculateDirection(movement);
    }

    // Update animation state based on movement
    this.updateCharacterState(playerId, movement, direction);
  }

  /**
   * Update character state and trigger appropriate animation
   */
  private updateCharacterState(playerId: string, movement?: Vector2, direction?: Direction): void {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return;

    const animationManager = characterData.animationManager;
    let targetState = AnimationState.IDLE;

    // Determine target state based on character flags and movement (priority order matters!)
    if (characterData.isDead) {
      targetState = AnimationState.DEAD;
    } else if (characterData.isTakingDamage) {
      targetState = AnimationState.TAKING_DAMAGE;
    } else if (characterData.isRolling) {
      targetState = AnimationState.ROLLING;
    } else if (characterData.isShooting && characterData.weaponType === WeaponType.MELEE) {
      targetState = AnimationState.MELEE_ATTACK;
    } else if (characterData.isShooting) {
      targetState = AnimationState.SHOOTING;
    } else if (characterData.isReloading) {
      targetState = AnimationState.RELOADING;
    } else if (characterData.isAiming) {
      targetState = AnimationState.AIMING;
    } else if (characterData.isInteracting) {
      targetState = AnimationState.INTERACTING;
    } else if (characterData.isHacking) {
      targetState = AnimationState.HACKING;
    } else if (characterData.isProne && characterData.isMoving) {
      targetState = AnimationState.PRONE_MOVING;
    } else if (characterData.isProne) {
      targetState = AnimationState.PRONE_IDLE;
    } else if (characterData.isMoving) {
      // Determine movement speed-based animation
      if (characterData.movementSpeed > 150) {
        targetState = AnimationState.RUNNING;
      } else {
        targetState = AnimationState.WALKING;
      }
    } else {
      // Handle idle variations
      const timeSinceLastIdle = Date.now() - characterData.lastIdleTime;
      if (timeSinceLastIdle > 5000) { // 5 seconds of idle
        const random = Math.random();
        if (random < 0.1) {
          targetState = AnimationState.IDLE_VARIANT_1;
          characterData.lastIdleTime = Date.now();
        } else if (random < 0.2) {
          targetState = AnimationState.IDLE_VARIANT_2;
          characterData.lastIdleTime = Date.now();
        }
      }
    }

    // Use provided direction or calculate from movement
    let animationDirection = direction;
    if (!animationDirection) {
      if (movement && movement.magnitude > 0.1) {
        animationDirection = AnimationManager.calculateDirection(movement);
      } else {
        animationDirection = animationManager.getCurrentDirection();
      }
    }

    // Change animation state if needed
    const currentState = animationManager.getCurrentState();
    if (currentState !== targetState || animationManager.getCurrentDirection() !== animationDirection) {
      const success = animationManager.changeState(targetState, animationDirection);
      if (success) {
        characterData.lastStateChange = Date.now();
        console.log(`Player ${playerId} animation state changed to: ${targetState}`);
      } else {
        // If transition fails, force the state change
        animationManager.forceState(targetState, animationDirection);
        characterData.lastStateChange = Date.now();
        console.log(`Player ${playerId} animation state forced to: ${targetState}`);
      }
    }
  }

  /**
   * Trigger shooting animation
   */
  triggerShootingAnimation(playerId: string, direction?: Vector2): void {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return;

    characterData.isShooting = true;
    characterData.lastActionTime = Date.now();

    // Calculate direction if provided
    const shootDirection = direction ? AnimationManager.calculateDirection(direction) : characterData.animationManager.getCurrentDirection();
    
    // Update animation state
    this.updateCharacterState(playerId, direction, shootDirection);

    // Auto-stop shooting after a short duration
    setTimeout(() => {
      const data = this.characterAnimations.get(playerId);
      if (data) {
        data.isShooting = false;
        this.updateCharacterState(playerId);
      }
    }, 160); // 160ms shooting animation (2 frames * 80ms)
  }

  /**
   * Set character reloading state
   */
  setCharacterReloading(playerId: string, isReloading: boolean): void {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return;

    characterData.isReloading = isReloading;
    characterData.lastActionTime = Date.now();
    this.updateCharacterState(playerId);

    if (isReloading) {
      // Auto-complete reloading after animation duration
      setTimeout(() => {
        const data = this.characterAnimations.get(playerId);
        if (data) {
          data.isReloading = false;
          this.updateCharacterState(playerId);
        }
      }, 1500); // 1500ms reloading animation
    }
  }

  /**
   * Set character aiming state
   */
  setCharacterAiming(playerId: string, isAiming: boolean): void {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return;

    characterData.isAiming = isAiming;
    this.updateCharacterState(playerId);
  }

  /**
   * Set character weapon type
   */
  setCharacterWeapon(playerId: string, weaponType: WeaponType): void {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return;

    characterData.weaponType = weaponType;
    console.log(`Player ${playerId} weapon set to: ${weaponType}`);
  }

  /**
   * Trigger melee attack animation
   */
  triggerMeleeAttack(playerId: string, direction?: Vector2): void {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return;

    characterData.isShooting = true; // Use shooting flag for melee attacks
    characterData.weaponType = WeaponType.MELEE;
    characterData.lastActionTime = Date.now();

    // Calculate direction if provided
    const attackDirection = direction ? AnimationManager.calculateDirection(direction) : characterData.animationManager.getCurrentDirection();
    
    // Update animation state
    this.updateCharacterState(playerId, direction, attackDirection);

    // Auto-stop melee attack after animation duration
    setTimeout(() => {
      const data = this.characterAnimations.get(playerId);
      if (data) {
        data.isShooting = false;
        this.updateCharacterState(playerId);
      }
    }, 300); // 300ms melee attack animation
  }

  /**
   * Trigger throwing animation
   */
  triggerThrowingAnimation(playerId: string, direction?: Vector2): void {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return;

    // Force throwing state
    const throwDirection = direction ? AnimationManager.calculateDirection(direction) : characterData.animationManager.getCurrentDirection();
    const success = characterData.animationManager.changeState(AnimationState.THROWING, throwDirection);
    
    if (success) {
      characterData.lastStateChange = Date.now();
      console.log(`Player ${playerId} throwing animation triggered`);
    } else {
      console.warn(`Failed to trigger throwing animation for player ${playerId}`);
      characterData.animationManager.forceState(AnimationState.THROWING, throwDirection);
    }

    // Auto-return to idle after throwing animation
    setTimeout(() => {
      this.updateCharacterState(playerId);
    }, 600); // 600ms throwing animation (4 frames * 150ms)
  }

  /**
   * Trigger roll animation
   */
  rollCharacter(playerId: string): void {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return;

    // Don't allow rolling if already rolling
    if (characterData.isRolling) return;

    // Set rolling state
    characterData.isRolling = true;
    
    // Force rolling state
    const currentDirection = characterData.animationManager.getCurrentDirection();
    const success = characterData.animationManager.changeState(AnimationState.ROLLING, currentDirection);
    
    if (success) {
      characterData.lastStateChange = Date.now();
      console.log(`Player ${playerId} rolling animation triggered`);
    } else {
      console.warn(`Failed to trigger rolling animation for player ${playerId}`);
      characterData.animationManager.forceState(AnimationState.ROLLING, currentDirection);
    }
    
    // Auto-complete rolling after animation duration
    setTimeout(() => {
      const data = this.characterAnimations.get(playerId);
      if (data) {
        data.isRolling = false;
        this.updateCharacterState(playerId);
      }
    }, 500); // Rolling animation duration
  }

  /**
   * Trigger roll animation in specific direction
   */
  rollCharacterInDirection(playerId: string, direction: Vector2 | Direction): void {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return;

    // Don't allow rolling if already rolling
    if (characterData.isRolling) return;

    // Set rolling state
    characterData.isRolling = true;
    
    // Convert Vector2 to Direction if needed
    let rollDirection: Direction;
    if (typeof direction === 'number') {
      rollDirection = direction as Direction;
    } else {
      rollDirection = AnimationManager.calculateDirection(direction as Vector2);
    }
    
    // Force rolling state with specific direction
    const success = characterData.animationManager.changeState(AnimationState.ROLLING, rollDirection);
    
    if (success) {
      characterData.lastStateChange = Date.now();
      console.log(`Player ${playerId} rolling animation triggered in direction: ${rollDirection}`);
    } else {
      console.warn(`Failed to trigger rolling animation for player ${playerId}`);
      characterData.animationManager.forceState(AnimationState.ROLLING, rollDirection);
    }
    
    // Auto-complete rolling after animation duration
    setTimeout(() => {
      const data = this.characterAnimations.get(playerId);
      if (data) {
        data.isRolling = false;
        this.updateCharacterState(playerId);
      }
    }, 500); // Rolling animation duration
  }

  /**
   * Set character prone state
   */
  setCharacterProne(playerId: string, isProne: boolean): void {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return;

    characterData.isProne = isProne;
    this.updateCharacterState(playerId);
  }

  /**
   * Set character interaction state
   */
  setCharacterInteracting(playerId: string, isInteracting: boolean): void {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return;

    characterData.isInteracting = isInteracting;
    this.updateCharacterState(playerId);

    if (isInteracting) {
      // Auto-complete interaction after animation duration
      setTimeout(() => {
        const data = this.characterAnimations.get(playerId);
        if (data) {
          data.isInteracting = false;
          this.updateCharacterState(playerId);
        }
      }, 1000); // 1000ms interaction animation
    }
  }

  /**
   * Set character hacking state
   */
  setCharacterHacking(playerId: string, isHacking: boolean): void {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return;

    characterData.isHacking = isHacking;
    this.updateCharacterState(playerId);
  }

  /**
   * Trigger damage animation
   */
  triggerDamageAnimation(playerId: string, direction?: Vector2): void {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return;

    characterData.isTakingDamage = true;
    characterData.damageDirection = direction || new Vector2(0, 0);

    // Calculate direction if provided
    const damageDirection = direction ? AnimationManager.calculateDirection(direction) : characterData.animationManager.getCurrentDirection();
    
    // Force damage state immediately
    const success = characterData.animationManager.changeState(AnimationState.TAKING_DAMAGE, damageDirection);
    
    if (success) {
      characterData.lastStateChange = Date.now();
      console.log(`Player ${playerId} damage animation triggered`);
    } else {
      console.warn(`Failed to trigger damage animation for player ${playerId}`);
      characterData.animationManager.forceState(AnimationState.TAKING_DAMAGE, damageDirection);
    }

    // Auto-complete damage animation
    setTimeout(() => {
      const data = this.characterAnimations.get(playerId);
      if (data) {
        data.isTakingDamage = false;
        this.updateCharacterState(playerId);
      }
    }, 300); // 300ms damage animation
  }

  /**
   * Trigger damage animation with direction
   */
  triggerDamageAnimationWithDirection(playerId: string, direction: Vector2): void {
    this.triggerDamageAnimation(playerId, direction);
  }

  /**
   * Trigger death animation
   */
  triggerDeathAnimation(playerId: string): void {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return;

    // Start with dying animation, not dead state
    characterData.isDead = false;
    
    // Force the dying state immediately
    const currentDirection = characterData.animationManager.getCurrentDirection();
    const success = characterData.animationManager.changeState(AnimationState.DYING, currentDirection);
    
    if (success) {
      characterData.lastStateChange = Date.now();
      console.log(`Player ${playerId} death animation triggered (DYING state)`);
    } else {
      console.warn(`Failed to trigger death animation for player ${playerId}`);
      characterData.animationManager.forceState(AnimationState.DYING, currentDirection);
    }

    // Auto-transition to DEAD state after dying animation completes
    setTimeout(() => {
      const data = this.characterAnimations.get(playerId);
      if (data && data.animationManager.getCurrentState() === AnimationState.DYING) {
        data.isDead = true;
        data.animationManager.changeState(AnimationState.DEAD, currentDirection);
        console.log(`Player ${playerId} transitioned to DEAD state`);
      }
    }, 1200); // 1200ms dying animation (4 frames * 300ms)
  }

  /**
   * Revive character
   */
  reviveCharacter(playerId: string): void {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return;

    characterData.isDead = false;
    characterData.isTakingDamage = false;
    
    // Force idle state immediately
    const currentDirection = characterData.animationManager.getCurrentDirection();
    characterData.animationManager.forceState(AnimationState.IDLE, currentDirection);
    characterData.lastStateChange = Date.now();
    
    console.log(`Player ${playerId} revived`);
  }

  /**
   * Update all character animations
   */
  update(deltaTime: number): void {
    for (const characterData of this.characterAnimations.values()) {
      characterData.animationManager.update(deltaTime);
    }
  }

  /**
   * Get current animation frame for rendering
   */
  getCurrentFrame(playerId: string): { frame: any; spriteSheet: any; alpha: number } | null {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return null;

    return characterData.animationManager.getCurrentFrame();
  }

  /**
   * Get transition frame for blending (if transitioning)
   */
  getTransitionFrame(playerId: string): { frame: any; spriteSheet: any; alpha: number } | null {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return null;

    return characterData.animationManager.getTransitionFrame();
  }

  /**
   * Get character animation state
   */
  getCharacterState(playerId: string): AnimationState | null {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return null;

    return characterData.animationManager.getCurrentState();
  }

  /**
   * Get character direction
   */
  getCharacterDirection(playerId: string): Direction | null {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return null;

    return characterData.animationManager.getCurrentDirection();
  }

  /**
   * Check if character is transitioning
   */
  isCharacterTransitioning(playerId: string): boolean {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return false;

    return characterData.animationManager.isCurrentlyTransitioning();
  }

  /**
   * Set animation playback speed
   */
  setPlaybackSpeed(playerId: string, speed: number): void {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return;

    characterData.animationManager.setPlaybackSpeed(speed);
  }

  /**
   * Pause/resume character animation
   */
  setPaused(playerId: string, paused: boolean): void {
    const characterData = this.characterAnimations.get(playerId);
    if (!characterData) return;

    characterData.animationManager.setPaused(paused);
  }

  /**
   * Remove character from animation system
   */
  removeCharacter(playerId: string): void {
    const characterData = this.characterAnimations.get(playerId);
    if (characterData) {
      characterData.animationManager.destroy();
      this.characterAnimations.delete(playerId);
      console.log(`Removed character animations for player: ${playerId}`);
    }
  }

  /**
   * Get all animated characters
   */
  getAnimatedCharacters(): string[] {
    return Array.from(this.characterAnimations.keys());
  }

  /**
   * Get animation statistics for debugging
   */
  getAnimationStats(): {
    totalCharacters: number;
    activeAnimations: number;
    transitioningAnimations: number;
  } {
    let activeAnimations = 0;
    let transitioningAnimations = 0;

    for (const characterData of this.characterAnimations.values()) {
      if (characterData.animationManager.getCurrentFrame()) {
        activeAnimations++;
      }
      if (characterData.animationManager.isCurrentlyTransitioning()) {
        transitioningAnimations++;
      }
    }

    return {
      totalCharacters: this.characterAnimations.size,
      activeAnimations,
      transitioningAnimations
    };
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    for (const characterData of this.characterAnimations.values()) {
      characterData.animationManager.destroy();
    }
    this.characterAnimations.clear();
    this.defaultSpriteSheets.clear();
  }
}