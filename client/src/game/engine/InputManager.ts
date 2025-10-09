import { Vector2 } from '../utils/Vector2';

// Input management system with isometric movement support
export class InputManager {
  private canvas: HTMLCanvasElement;
  private keys: Set<string> = new Set();
  private mouse: { x: number; y: number; buttons: Set<number> } = {
    x: 0,
    y: 0,
    buttons: new Set(),
  };
  private eventListeners: Map<string, Function[]> = new Map();
  
  // Movement state for smooth acceleration/deceleration
  private movementState = {
    velocity: new Vector2(0, 0),
    acceleration: 800, // pixels per second squared
    deceleration: 1200, // pixels per second squared
    maxSpeed: 200, // pixels per second
    inputVector: new Vector2(0, 0),
  };

  // Action state tracking
  private actionState = {
    isRolling: false,
    rollCooldown: 0,
    rollDuration: 0.5, // seconds
    rollCooldownTime: 1.0, // seconds
    
    isProne: false,
    proneSpeedMultiplier: 0.3, // 30% speed when prone
    
    facingDirection: new Vector2(1, 0), // Default facing right
    
    // UI state
    inventoryOpen: false,
    pauseMenuOpen: false,
  };

  // Key press tracking for single-press actions
  private keyPressed = new Set<string>();
  private keyJustPressed = new Set<string>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', e => this.handleKeyDown(e));
    document.addEventListener('keyup', e => this.handleKeyUp(e));

    // Mouse events
    this.canvas.addEventListener('mousedown', e => this.handleMouseDown(e));
    this.canvas.addEventListener('mouseup', e => this.handleMouseUp(e));
    this.canvas.addEventListener('mousemove', e => this.handleMouseMove(e));
    this.canvas.addEventListener('wheel', e => this.handleWheel(e));

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', e => this.handleTouchStart(e));
    this.canvas.addEventListener('touchend', e => this.handleTouchEnd(e));
    this.canvas.addEventListener('touchmove', e => this.handleTouchMove(e));
  }

  private handleKeyDown(event: KeyboardEvent) {
    // Track just-pressed keys (for single-press actions)
    if (!this.keys.has(event.code)) {
      this.keyJustPressed.add(event.code);
    }
    
    this.keys.add(event.code);
    this.emit('keydown', { code: event.code, key: event.key });
  }

  private handleKeyUp(event: KeyboardEvent) {
    this.keys.delete(event.code);
    this.keyPressed.delete(event.code);
    this.emit('keyup', { code: event.code, key: event.key });
  }

  private handleMouseDown(event: MouseEvent) {
    this.mouse.buttons.add(event.button);
    this.updateMousePosition(event);
    this.emit('mousedown', {
      button: event.button,
      x: this.mouse.x,
      y: this.mouse.y,
    });
  }

  private handleMouseUp(event: MouseEvent) {
    this.mouse.buttons.delete(event.button);
    this.updateMousePosition(event);
    this.emit('mouseup', {
      button: event.button,
      x: this.mouse.x,
      y: this.mouse.y,
    });
  }

  private handleMouseMove(event: MouseEvent) {
    this.updateMousePosition(event);
    this.emit('mousemove', { x: this.mouse.x, y: this.mouse.y });
  }

  private handleWheel(event: WheelEvent) {
    event.preventDefault();
    this.emit('wheel', {
      deltaY: event.deltaY,
      x: this.mouse.x,
      y: this.mouse.y,
    });
  }

  private handleTouchStart(event: TouchEvent) {
    event.preventDefault();
    const touch = event.touches[0];
    if (touch) {
      this.updateMousePosition({
        clientX: touch.clientX,
        clientY: touch.clientY,
      } as MouseEvent);
      this.emit('touchstart', { x: this.mouse.x, y: this.mouse.y });
    }
  }

  private handleTouchEnd(event: TouchEvent) {
    event.preventDefault();
    this.emit('touchend', { x: this.mouse.x, y: this.mouse.y });
  }

  private handleTouchMove(event: TouchEvent) {
    event.preventDefault();
    const touch = event.touches[0];
    if (touch) {
      this.updateMousePosition({
        clientX: touch.clientX,
        clientY: touch.clientY,
      } as MouseEvent);
      this.emit('touchmove', { x: this.mouse.x, y: this.mouse.y });
    }
  }

  private updateMousePosition(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = event.clientX - rect.left;
    this.mouse.y = event.clientY - rect.top;
  }

  // Event system
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Input state queries
  isKeyPressed(key: string): boolean {
    return this.keys.has(key);
  }

  isMouseButtonPressed(button: number): boolean {
    return this.mouse.buttons.has(button);
  }

  getMousePosition(): { x: number; y: number } {
    return { x: this.mouse.x, y: this.mouse.y };
  }

  // Enhanced movement system with isometric support
  update(deltaTime: number): void {
    this.updateMovementState(deltaTime);
    this.updateActionState(deltaTime);
    this.updateFacingDirection();
    this.processActionInputs();
    
    // Clear just-pressed keys after processing
    this.keyJustPressed.clear();
  }

  private updateMovementState(deltaTime: number): void {
    // Get raw input vector
    const rawInput = this.getRawMovementInput();
    
    // Convert to isometric coordinates and normalize diagonal movement
    this.movementState.inputVector = this.convertToIsometricMovement(rawInput);
    
    // Apply acceleration or deceleration
    if (this.movementState.inputVector.magnitude > 0) {
      // Accelerate towards target velocity
      const targetVelocity = this.movementState.inputVector.multiply(this.movementState.maxSpeed);
      const velocityDiff = targetVelocity.subtract(this.movementState.velocity);
      const acceleration = velocityDiff.normalize().multiply(this.movementState.acceleration * deltaTime);
      
      // Don't overshoot the target velocity
      if (acceleration.magnitude > velocityDiff.magnitude) {
        this.movementState.velocity = targetVelocity;
      } else {
        this.movementState.velocity = this.movementState.velocity.add(acceleration);
      }
    } else {
      // Decelerate to stop
      const deceleration = this.movementState.velocity.normalize().multiply(this.movementState.deceleration * deltaTime);
      
      if (deceleration.magnitude >= this.movementState.velocity.magnitude) {
        this.movementState.velocity = new Vector2(0, 0);
      } else {
        this.movementState.velocity = this.movementState.velocity.subtract(deceleration);
      }
    }
    
    // Clamp velocity to max speed
    if (this.movementState.velocity.magnitude > this.movementState.maxSpeed) {
      this.movementState.velocity = this.movementState.velocity.normalize().multiply(this.movementState.maxSpeed);
    }
  }

  private getRawMovementInput(): Vector2 {
    let x = 0;
    let y = 0;

    if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) y -= 1;
    if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) y += 1;
    if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) x -= 1;
    if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) x += 1;

    return new Vector2(x, y);
  }

  private convertToIsometricMovement(input: Vector2): Vector2 {
    if (input.magnitude === 0) {
      return new Vector2(0, 0);
    }

    // Convert WASD input to isometric directions
    // In isometric view (standard diamond orientation):
    // W (up) = northwest direction (-x, -y)
    // S (down) = southeast direction (+x, +y)  
    // A (left) = southwest direction (-x, +y)
    // D (right) = northeast direction (+x, -y)
    
    // Standard isometric transformation matrix
    // For input: W=y-1, A=x-1, S=y+1, D=x+1
    // W: x=0, y=-1 -> isoX = -0.5, isoY = -0.5 (northwest)
    // A: x=-1, y=0 -> isoX = -0.5, isoY = 0.5 (southwest)  
    // S: x=0, y=1 -> isoX = 0.5, isoY = 0.5 (southeast)
    // D: x=1, y=0 -> isoX = 0.5, isoY = -0.5 (northeast)
    const isoX = (input.x - input.y) * 0.5;
    const isoY = (input.x + input.y) * 0.5;
    
    const isometricVector = new Vector2(isoX, isoY);
    
    // Normalize diagonal movement to prevent faster diagonal speed
    return isometricVector.magnitude > 0 ? isometricVector.normalize() : isometricVector;
  }

  // Get current movement velocity (for use by game systems)
  getMovementVelocity(): Vector2 {
    return this.movementState.velocity.clone();
  }

  // Get normalized movement direction (for animation systems)
  getMovementDirection(): Vector2 {
    return this.movementState.velocity.magnitude > 0 
      ? this.movementState.velocity.normalize() 
      : new Vector2(0, 0);
  }

  // Check if player is currently moving
  isMoving(): boolean {
    return this.movementState.velocity.magnitude > 0.1; // Small threshold to account for floating point precision
  }

  // Get movement input for backward compatibility
  getMovementInput(): { x: number; y: number } {
    const velocity = this.getMovementVelocity();
    
    // Apply prone speed modifier if prone
    if (this.actionState.isProne) {
      return { 
        x: velocity.x * this.actionState.proneSpeedMultiplier, 
        y: velocity.y * this.actionState.proneSpeedMultiplier 
      };
    }
    
    // No movement during roll
    if (this.actionState.isRolling) {
      return { x: 0, y: 0 };
    }
    
    return { x: velocity.x, y: velocity.y };
  }

  private updateActionState(deltaTime: number): void {
    // Update roll cooldown
    if (this.actionState.rollCooldown > 0) {
      this.actionState.rollCooldown -= deltaTime;
    }
    
    // Update roll state
    if (this.actionState.isRolling) {
      this.actionState.rollDuration -= deltaTime;
      if (this.actionState.rollDuration <= 0) {
        this.actionState.isRolling = false;
        this.actionState.rollDuration = 0.5; // Reset for next roll
      }
    }
  }

  private updateFacingDirection(): void {
    // Update facing direction based on mouse position
    const mousePos = this.getMousePosition();
    const canvasCenter = new Vector2(this.canvas.width / 2, this.canvas.height / 2);
    const mouseVector = new Vector2(mousePos.x, mousePos.y).subtract(canvasCenter);
    
    if (mouseVector.magnitude > 0) {
      this.actionState.facingDirection = mouseVector.normalize();
    }
  }

  private processActionInputs(): void {
    // Handle Space key for roll/dodge
    if (this.keyJustPressed.has('Space')) {
      this.handleRollAction();
    }
    
    // Handle E key for interactions
    if (this.keyJustPressed.has('KeyE')) {
      this.handleInteractionAction();
    }
    
    // Handle C key for prone toggle
    if (this.keyJustPressed.has('KeyC')) {
      this.handleProneToggle();
    }
    
    // Handle I key for inventory toggle
    if (this.keyJustPressed.has('KeyI')) {
      this.handleInventoryToggle();
    }
    
    // Handle Escape key for pause menu toggle
    if (this.keyJustPressed.has('Escape')) {
      this.handlePauseMenuToggle();
    }
  }

  private handleRollAction(): void {
    // Can only roll if not on cooldown and not already rolling
    if (this.actionState.rollCooldown <= 0 && !this.actionState.isRolling) {
      this.actionState.isRolling = true;
      this.actionState.rollCooldown = this.actionState.rollCooldownTime;
      
      // Emit roll event for game systems to handle
      this.emit('action', { 
        type: 'roll', 
        direction: this.actionState.facingDirection.clone() 
      });
    }
  }

  private handleInteractionAction(): void {
    this.emit('action', { 
      type: 'interact', 
      position: this.getMousePosition() 
    });
  }

  private handleProneToggle(): void {
    this.actionState.isProne = !this.actionState.isProne;
    this.emit('action', { 
      type: 'prone', 
      isProne: this.actionState.isProne 
    });
  }

  private handleInventoryToggle(): void {
    this.actionState.inventoryOpen = !this.actionState.inventoryOpen;
    this.emit('ui', { 
      type: 'inventory', 
      isOpen: this.actionState.inventoryOpen 
    });
  }

  private handlePauseMenuToggle(): void {
    this.actionState.pauseMenuOpen = !this.actionState.pauseMenuOpen;
    this.emit('ui', { 
      type: 'pauseMenu', 
      isOpen: this.actionState.pauseMenuOpen 
    });
  }

  getActionInput(): string | null {
    if (this.isKeyPressed('Space')) return 'interact';
    if (this.isKeyPressed('KeyE')) return 'hack';
    if (this.isKeyPressed('KeyI')) return 'inventory';
    if (this.isKeyPressed('KeyC')) return 'contracts';
    if (this.isKeyPressed('KeyH')) return 'housing';
    return null;
  }

  getCombatInput(): string | null {
    if (this.isMouseButtonPressed(0)) return 'shoot';
    if (this.isMouseButtonPressed(2)) return 'aim';
    if (this.isKeyPressed('KeyR')) return 'reload';
    return null;
  }

  // Action state queries
  isRolling(): boolean {
    return this.actionState.isRolling;
  }

  isProne(): boolean {
    return this.actionState.isProne;
  }

  getFacingDirection(): Vector2 {
    return this.actionState.facingDirection.clone();
  }

  isInventoryOpen(): boolean {
    return this.actionState.inventoryOpen;
  }

  isPauseMenuOpen(): boolean {
    return this.actionState.pauseMenuOpen;
  }

  getRollCooldown(): number {
    return this.actionState.rollCooldown;
  }

  // Check if a key was just pressed this frame
  wasKeyJustPressed(key: string): boolean {
    return this.keyJustPressed.has(key);
  }

  // Cleanup
  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
  }
}
