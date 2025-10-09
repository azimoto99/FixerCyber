// Animation Manager with sprite sheet support and state machine
import { Vector2 } from '../utils/Vector2';

export interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  duration: number; // Duration in milliseconds
  offsetX?: number; // Offset for sprite alignment
  offsetY?: number;
}

export interface AnimationClip {
  name: string;
  frames: SpriteFrame[];
  loop: boolean;
  totalDuration: number;
  onComplete?: () => void;
}

export interface SpriteSheet {
  image: HTMLImageElement;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
}

export enum AnimationState {
  IDLE = 'idle',
  WALKING = 'walking',
  RUNNING = 'running',
  ROLLING = 'rolling',
  PRONE_IDLE = 'prone_idle',
  PRONE_MOVING = 'prone_moving',
  INTERACTING = 'interacting',
  HACKING = 'hacking',
  TAKING_DAMAGE = 'taking_damage',
  DYING = 'dying',
  DEAD = 'dead',
  SHOOTING = 'shooting',
  RELOADING = 'reloading',
  AIMING = 'aiming',
  IDLE_VARIANT_1 = 'idle_variant_1',
  IDLE_VARIANT_2 = 'idle_variant_2',
  MELEE_ATTACK = 'melee_attack',
  THROWING = 'throwing'
}

export enum Direction {
  NORTH = 0,
  NORTHEAST = 1,
  EAST = 2,
  SOUTHEAST = 3,
  SOUTH = 4,
  SOUTHWEST = 5,
  WEST = 6,
  NORTHWEST = 7
}

export interface AnimationTransition {
  from: AnimationState;
  to: AnimationState;
  condition?: () => boolean;
  duration: number; // Transition duration in milliseconds
  blendType: BlendType;
}

export enum BlendType {
  IMMEDIATE = 'immediate',
  FADE = 'fade',
  CROSSFADE = 'crossfade'
}

export interface AnimationInstance {
  clip: AnimationClip;
  currentFrameIndex: number;
  elapsedTime: number;
  isPlaying: boolean;
  isPaused: boolean;
  playbackSpeed: number;
  direction: Direction;
  alpha: number; // For blending during transitions
}

/**
 * Core animation manager that handles sprite sheet animations, state machines,
 * and smooth transitions between animation states with 8-directional support
 */
export class AnimationManager {
  private spriteSheets: Map<string, SpriteSheet> = new Map();
  private animationClips: Map<string, AnimationClip> = new Map();
  private currentState: AnimationState = AnimationState.IDLE;
  private previousState: AnimationState = AnimationState.IDLE;
  private currentDirection: Direction = Direction.SOUTH;
  private currentAnimation: AnimationInstance | null = null;
  private transitionAnimation: AnimationInstance | null = null;
  private isTransitioning: boolean = false;
  private transitionProgress: number = 0;
  private transitionDuration: number = 0;
  private transitions: Map<string, AnimationTransition> = new Map();
  private stateChangeCallbacks: Map<AnimationState, (() => void)[]> = new Map();

  constructor() {
    this.setupDefaultTransitions();
  }

  /**
   * Load a sprite sheet for animations from a path
   */
  loadSpriteSheet(name: string, imagePath: string, frameWidth: number, frameHeight: number): Promise<void>;
  /**
   * Load a sprite sheet for animations from an Image object
   */
  loadSpriteSheet(name: string, image: HTMLImageElement, frameWidth: number, frameHeight: number, columns: number, rows: number): void;
  loadSpriteSheet(name: string, imagePathOrImage: string | HTMLImageElement, frameWidth: number, frameHeight: number, columns?: number, rows?: number): Promise<void> | void {
    if (typeof imagePathOrImage === 'string') {
      // Load from path
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          const calculatedColumns = Math.floor(image.width / frameWidth);
          const calculatedRows = Math.floor(image.height / frameHeight);
          
          this.spriteSheets.set(name, {
            image,
            frameWidth,
            frameHeight,
            columns: calculatedColumns,
            rows: calculatedRows
          });
          
          console.log(`Loaded sprite sheet: ${name} (${calculatedColumns}x${calculatedRows} frames)`);
          resolve();
        };
        image.onerror = () => {
          reject(new Error(`Failed to load sprite sheet: ${imagePathOrImage}`));
        };
        image.src = imagePathOrImage;
      });
    } else {
      // Load from Image object
      if (columns === undefined || rows === undefined) {
        throw new Error('columns and rows must be provided when loading from Image object');
      }
      
      this.spriteSheets.set(name, {
        image: imagePathOrImage,
        frameWidth,
        frameHeight,
        columns,
        rows
      });
      
      console.log(`Loaded sprite sheet: ${name} (${columns}x${rows} frames)`);
    }
  }

  /**
   * Create an animation clip from sprite sheet frames
   */
  createAnimationClip(
    name: string,
    spriteSheetName: string,
    frameIndices: number[],
    frameDuration: number,
    loop: boolean = true,
    onComplete?: () => void
  ): void {
    const spriteSheet = this.spriteSheets.get(spriteSheetName);
    if (!spriteSheet) {
      throw new Error(`Sprite sheet not found: ${spriteSheetName}`);
    }

    const frames: SpriteFrame[] = frameIndices.map(index => {
      const col = index % spriteSheet.columns;
      const row = Math.floor(index / spriteSheet.columns);
      
      return {
        x: col * spriteSheet.frameWidth,
        y: row * spriteSheet.frameHeight,
        width: spriteSheet.frameWidth,
        height: spriteSheet.frameHeight,
        duration: frameDuration
      };
    });

    const totalDuration = frames.reduce((sum, frame) => sum + frame.duration, 0);

    this.animationClips.set(name, {
      name,
      frames,
      loop,
      totalDuration,
      onComplete
    });

    console.log(`Created animation clip: ${name} (${frames.length} frames, ${totalDuration}ms)`);
  }

  /**
   * Create directional animation clips (8 directions)
   */
  createDirectionalAnimationClips(
    baseName: string,
    spriteSheetName: string,
    frameIndicesPerDirection: number[][],
    frameDuration: number,
    loop: boolean = true
  ): void {
    if (frameIndicesPerDirection.length !== 8) {
      throw new Error('Must provide frame indices for all 8 directions');
    }

    const directions = [
      Direction.NORTH,
      Direction.NORTHEAST,
      Direction.EAST,
      Direction.SOUTHEAST,
      Direction.SOUTH,
      Direction.SOUTHWEST,
      Direction.WEST,
      Direction.NORTHWEST
    ];

    directions.forEach((direction, index) => {
      const clipName = `${baseName}_${Direction[direction].toLowerCase()}`;
      this.createAnimationClip(
        clipName,
        spriteSheetName,
        frameIndicesPerDirection[index],
        frameDuration,
        loop
      );
    });

    console.log(`Created directional animation clips for: ${baseName}`);
  }

  /**
   * Add a state transition rule
   */
  addTransition(
    from: AnimationState,
    to: AnimationState,
    duration: number = 200,
    blendType: BlendType = BlendType.FADE,
    condition?: () => boolean
  ): void {
    const key = `${from}_to_${to}`;
    this.transitions.set(key, {
      from,
      to,
      condition,
      duration,
      blendType
    });
  }

  /**
   * Setup default animation transitions
   */
  private setupDefaultTransitions(): void {
    // Idle transitions
    this.addTransition(AnimationState.IDLE, AnimationState.WALKING, 150);
    this.addTransition(AnimationState.IDLE, AnimationState.RUNNING, 200);
    this.addTransition(AnimationState.IDLE, AnimationState.ROLLING, 100);
    this.addTransition(AnimationState.IDLE, AnimationState.PRONE_IDLE, 300);
    this.addTransition(AnimationState.IDLE, AnimationState.INTERACTING, 150);
    this.addTransition(AnimationState.IDLE, AnimationState.HACKING, 200);

    // Walking transitions
    this.addTransition(AnimationState.WALKING, AnimationState.IDLE, 150);
    this.addTransition(AnimationState.WALKING, AnimationState.RUNNING, 100);
    this.addTransition(AnimationState.WALKING, AnimationState.ROLLING, 100);

    // Running transitions
    this.addTransition(AnimationState.RUNNING, AnimationState.IDLE, 200);
    this.addTransition(AnimationState.RUNNING, AnimationState.WALKING, 100);
    this.addTransition(AnimationState.RUNNING, AnimationState.ROLLING, 100);

    // Rolling transitions (rolling should complete before transitioning)
    this.addTransition(AnimationState.ROLLING, AnimationState.IDLE, 50);
    this.addTransition(AnimationState.ROLLING, AnimationState.WALKING, 50);
    this.addTransition(AnimationState.ROLLING, AnimationState.RUNNING, 50);

    // Prone transitions
    this.addTransition(AnimationState.PRONE_IDLE, AnimationState.IDLE, 300);
    this.addTransition(AnimationState.PRONE_IDLE, AnimationState.PRONE_MOVING, 100);
    this.addTransition(AnimationState.PRONE_MOVING, AnimationState.PRONE_IDLE, 100);
    this.addTransition(AnimationState.PRONE_MOVING, AnimationState.IDLE, 300);

    // Interaction transitions
    this.addTransition(AnimationState.INTERACTING, AnimationState.IDLE, 150);
    this.addTransition(AnimationState.HACKING, AnimationState.IDLE, 200);

    // Damage transitions (can interrupt most states)
    Object.values(AnimationState).forEach(state => {
      if (state !== AnimationState.TAKING_DAMAGE && state !== AnimationState.DYING && state !== AnimationState.DEAD) {
        this.addTransition(state as AnimationState, AnimationState.TAKING_DAMAGE, 50, BlendType.IMMEDIATE);
      }
    });

    // Death transitions
    this.addTransition(AnimationState.TAKING_DAMAGE, AnimationState.DYING, 100);
    this.addTransition(AnimationState.DYING, AnimationState.DEAD, 50);

    // Action animation transitions
    this.addTransition(AnimationState.IDLE, AnimationState.SHOOTING, 50, BlendType.IMMEDIATE);
    this.addTransition(AnimationState.WALKING, AnimationState.SHOOTING, 50, BlendType.IMMEDIATE);
    this.addTransition(AnimationState.RUNNING, AnimationState.SHOOTING, 50, BlendType.IMMEDIATE);
    this.addTransition(AnimationState.SHOOTING, AnimationState.IDLE, 100);
    this.addTransition(AnimationState.SHOOTING, AnimationState.WALKING, 100);
    this.addTransition(AnimationState.SHOOTING, AnimationState.RUNNING, 100);

    // Reloading transitions
    this.addTransition(AnimationState.IDLE, AnimationState.RELOADING, 100);
    this.addTransition(AnimationState.WALKING, AnimationState.RELOADING, 100);
    this.addTransition(AnimationState.RELOADING, AnimationState.IDLE, 150);
    this.addTransition(AnimationState.RELOADING, AnimationState.WALKING, 150);

    // Aiming transitions
    this.addTransition(AnimationState.IDLE, AnimationState.AIMING, 200);
    this.addTransition(AnimationState.WALKING, AnimationState.AIMING, 200);
    this.addTransition(AnimationState.AIMING, AnimationState.IDLE, 200);
    this.addTransition(AnimationState.AIMING, AnimationState.WALKING, 200);
    this.addTransition(AnimationState.AIMING, AnimationState.SHOOTING, 50, BlendType.IMMEDIATE);

    // Melee attack transitions
    this.addTransition(AnimationState.IDLE, AnimationState.MELEE_ATTACK, 50, BlendType.IMMEDIATE);
    this.addTransition(AnimationState.WALKING, AnimationState.MELEE_ATTACK, 50, BlendType.IMMEDIATE);
    this.addTransition(AnimationState.RUNNING, AnimationState.MELEE_ATTACK, 50, BlendType.IMMEDIATE);
    this.addTransition(AnimationState.MELEE_ATTACK, AnimationState.IDLE, 100);
    this.addTransition(AnimationState.MELEE_ATTACK, AnimationState.WALKING, 100);
    this.addTransition(AnimationState.MELEE_ATTACK, AnimationState.RUNNING, 100);

    // Throwing transitions
    this.addTransition(AnimationState.IDLE, AnimationState.THROWING, 100);
    this.addTransition(AnimationState.WALKING, AnimationState.THROWING, 100);
    this.addTransition(AnimationState.THROWING, AnimationState.IDLE, 150);
    this.addTransition(AnimationState.THROWING, AnimationState.WALKING, 150);

    // Idle variant transitions
    this.addTransition(AnimationState.IDLE, AnimationState.IDLE_VARIANT_1, 300);
    this.addTransition(AnimationState.IDLE, AnimationState.IDLE_VARIANT_2, 300);
    this.addTransition(AnimationState.IDLE_VARIANT_1, AnimationState.IDLE, 200);
    this.addTransition(AnimationState.IDLE_VARIANT_2, AnimationState.IDLE, 200);
  }

  /**
   * Change animation state with smooth transition
   */
  changeState(newState: AnimationState, direction?: Direction): boolean {
    if (newState === this.currentState && direction === this.currentDirection) {
      return false; // No change needed
    }

    // Update direction if provided
    if (direction !== undefined) {
      this.currentDirection = direction;
    }

    // Check if transition is allowed
    const transitionKey = `${this.currentState}_to_${newState}`;
    const transition = this.transitions.get(transitionKey);
    
    if (!transition) {
      console.warn(`No transition defined from ${this.currentState} to ${newState}`);
      return false;
    }

    // Check transition condition if provided
    if (transition.condition && !transition.condition()) {
      return false;
    }

    // Get the new animation clip
    const newClipName = this.getDirectionalClipName(newState, this.currentDirection);
    const newClip = this.animationClips.get(newClipName);
    
    if (!newClip) {
      console.warn(`Animation clip not found: ${newClipName}`);
      return false;
    }

    // Start transition
    this.startTransition(newState, newClip, transition);
    return true;
  }

  /**
   * Start a smooth transition between animations
   */
  private startTransition(newState: AnimationState, newClip: AnimationClip, transition: AnimationTransition): void {
    this.previousState = this.currentState;
    this.currentState = newState;

    // Handle different blend types
    switch (transition.blendType) {
      case BlendType.IMMEDIATE:
        // Immediate transition - no blending
        this.currentAnimation = this.createAnimationInstance(newClip);
        this.transitionAnimation = null;
        this.isTransitioning = false;
        break;

      case BlendType.FADE:
        // Fade out current, fade in new
        if (this.currentAnimation) {
          this.transitionAnimation = this.currentAnimation;
          this.transitionAnimation.alpha = 1.0;
        }
        this.currentAnimation = this.createAnimationInstance(newClip);
        this.currentAnimation.alpha = 0.0;
        this.startTransitionBlend(transition.duration);
        break;

      case BlendType.CROSSFADE:
        // Crossfade between animations
        if (this.currentAnimation) {
          this.transitionAnimation = this.currentAnimation;
        }
        this.currentAnimation = this.createAnimationInstance(newClip);
        this.startTransitionBlend(transition.duration);
        break;
    }

    // Trigger state change callbacks
    this.triggerStateChangeCallbacks(newState);
  }

  /**
   * Start transition blending
   */
  private startTransitionBlend(duration: number): void {
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.transitionDuration = duration;
  }

  /**
   * Create an animation instance from a clip
   */
  private createAnimationInstance(clip: AnimationClip): AnimationInstance {
    return {
      clip,
      currentFrameIndex: 0,
      elapsedTime: 0,
      isPlaying: true,
      isPaused: false,
      playbackSpeed: 1.0,
      direction: this.currentDirection,
      alpha: 1.0
    };
  }

  /**
   * Get directional clip name
   */
  private getDirectionalClipName(state: AnimationState, direction: Direction): string {
    const directionName = Direction[direction].toLowerCase();
    return `${state}_${directionName}`;
  }

  /**
   * Update animation system
   */
  update(deltaTime: number): void {
    // Update transition blending
    if (this.isTransitioning) {
      this.updateTransition(deltaTime);
    }

    // Update current animation
    if (this.currentAnimation) {
      this.updateAnimationInstance(this.currentAnimation, deltaTime);
    }

    // Update transition animation
    if (this.transitionAnimation) {
      this.updateAnimationInstance(this.transitionAnimation, deltaTime);
    }
  }

  /**
   * Update transition blending
   */
  private updateTransition(deltaTime: number): void {
    this.transitionProgress += deltaTime;
    const progress = Math.min(this.transitionProgress / this.transitionDuration, 1.0);

    if (this.currentAnimation && this.transitionAnimation) {
      // Update alpha values for blending
      this.currentAnimation.alpha = progress;
      this.transitionAnimation.alpha = 1.0 - progress;
    }

    // Complete transition
    if (progress >= 1.0) {
      this.isTransitioning = false;
      this.transitionAnimation = null;
      if (this.currentAnimation) {
        this.currentAnimation.alpha = 1.0;
      }
    }
  }

  /**
   * Update a single animation instance
   */
  private updateAnimationInstance(instance: AnimationInstance, deltaTime: number): void {
    if (!instance.isPlaying || instance.isPaused) {
      return;
    }

    instance.elapsedTime += deltaTime * instance.playbackSpeed;

    const currentFrame = instance.clip.frames[instance.currentFrameIndex];
    if (instance.elapsedTime >= currentFrame.duration) {
      // Move to next frame
      instance.elapsedTime -= currentFrame.duration;
      instance.currentFrameIndex++;

      // Handle loop or completion
      if (instance.currentFrameIndex >= instance.clip.frames.length) {
        if (instance.clip.loop) {
          instance.currentFrameIndex = 0;
        } else {
          instance.currentFrameIndex = instance.clip.frames.length - 1;
          instance.isPlaying = false;
          
          // Trigger completion callback
          if (instance.clip.onComplete) {
            instance.clip.onComplete();
          }
        }
      }
    }
  }

  /**
   * Get current frame for rendering
   */
  getCurrentFrame(): { frame: SpriteFrame; spriteSheet: SpriteSheet; alpha: number } | null {
    if (!this.currentAnimation) {
      return null;
    }

    const frame = this.currentAnimation.clip.frames[this.currentAnimation.currentFrameIndex];
    
    // Find the sprite sheet (assuming first loaded sheet for now)
    const spriteSheet = Array.from(this.spriteSheets.values())[0];
    if (!spriteSheet) {
      return null;
    }

    return {
      frame,
      spriteSheet,
      alpha: this.currentAnimation.alpha
    };
  }

  /**
   * Get transition frame for blending (if transitioning)
   */
  getTransitionFrame(): { frame: SpriteFrame; spriteSheet: SpriteSheet; alpha: number } | null {
    if (!this.transitionAnimation || !this.isTransitioning) {
      return null;
    }

    const frame = this.transitionAnimation.clip.frames[this.transitionAnimation.currentFrameIndex];
    
    // Find the sprite sheet
    const spriteSheet = Array.from(this.spriteSheets.values())[0];
    if (!spriteSheet) {
      return null;
    }

    return {
      frame,
      spriteSheet,
      alpha: this.transitionAnimation.alpha
    };
  }

  /**
   * Add state change callback
   */
  onStateChange(state: AnimationState, callback: () => void): void {
    if (!this.stateChangeCallbacks.has(state)) {
      this.stateChangeCallbacks.set(state, []);
    }
    this.stateChangeCallbacks.get(state)!.push(callback);
  }

  /**
   * Trigger state change callbacks
   */
  private triggerStateChangeCallbacks(state: AnimationState): void {
    const callbacks = this.stateChangeCallbacks.get(state);
    if (callbacks) {
      callbacks.forEach(callback => callback());
    }
  }

  /**
   * Get current animation state
   */
  getCurrentState(): AnimationState {
    return this.currentState;
  }

  /**
   * Get current direction
   */
  getCurrentDirection(): Direction {
    return this.currentDirection;
  }

  /**
   * Get previous animation state
   */
  getPreviousState(): AnimationState {
    return this.previousState;
  }

  /**
   * Check if currently transitioning
   */
  isCurrentlyTransitioning(): boolean {
    return this.isTransitioning;
  }

  /**
   * Set playback speed for current animation
   */
  setPlaybackSpeed(speed: number): void {
    if (this.currentAnimation) {
      this.currentAnimation.playbackSpeed = speed;
    }
  }

  /**
   * Pause/resume current animation
   */
  setPaused(paused: boolean): void {
    if (this.currentAnimation) {
      this.currentAnimation.isPaused = paused;
    }
  }

  /**
   * Force immediate state change without transition
   */
  forceState(state: AnimationState, direction?: Direction): void {
    if (direction !== undefined) {
      this.currentDirection = direction;
    }

    const clipName = this.getDirectionalClipName(state, this.currentDirection);
    const clip = this.animationClips.get(clipName);
    
    if (clip) {
      this.currentState = state;
      this.currentAnimation = this.createAnimationInstance(clip);
      this.transitionAnimation = null;
      this.isTransitioning = false;
      this.triggerStateChangeCallbacks(state);
    }
  }

  /**
   * Get animation progress (0-1)
   */
  getAnimationProgress(): number {
    if (!this.currentAnimation) {
      return 0;
    }

    const totalElapsed = this.currentAnimation.clip.frames
      .slice(0, this.currentAnimation.currentFrameIndex)
      .reduce((sum, frame) => sum + frame.duration, 0) + this.currentAnimation.elapsedTime;

    return totalElapsed / this.currentAnimation.clip.totalDuration;
  }

  /**
   * Calculate direction from movement vector
   */
  static calculateDirection(movement: Vector2): Direction {
    if (movement.x === 0 && movement.y === 0) {
      return Direction.SOUTH; // Default direction when not moving
    }

    const angle = Math.atan2(movement.y, movement.x);
    const degrees = (angle * 180 / Math.PI + 360) % 360;

    // Convert angle to 8-direction enum
    // 0° = East, 90° = South, 180° = West, 270° = North
    if (degrees >= 337.5 || degrees < 22.5) return Direction.EAST;
    if (degrees >= 22.5 && degrees < 67.5) return Direction.SOUTHEAST;
    if (degrees >= 67.5 && degrees < 112.5) return Direction.SOUTH;
    if (degrees >= 112.5 && degrees < 157.5) return Direction.SOUTHWEST;
    if (degrees >= 157.5 && degrees < 202.5) return Direction.WEST;
    if (degrees >= 202.5 && degrees < 247.5) return Direction.NORTHWEST;
    if (degrees >= 247.5 && degrees < 292.5) return Direction.NORTH;
    if (degrees >= 292.5 && degrees < 337.5) return Direction.NORTHEAST;

    return Direction.SOUTH;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.spriteSheets.clear();
    this.animationClips.clear();
    this.transitions.clear();
    this.stateChangeCallbacks.clear();
    this.currentAnimation = null;
    this.transitionAnimation = null;
  }
}