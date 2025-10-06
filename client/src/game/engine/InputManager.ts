// Input management system
export class InputManager {
  private canvas: HTMLCanvasElement
  private keys: Set<string> = new Set()
  private mouse: { x: number; y: number; buttons: Set<number> } = { x: 0, y: 0, buttons: new Set() }
  private eventListeners: Map<string, Function[]> = new Map()

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.setupEventListeners()
  }

  private setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', (e) => this.handleKeyDown(e))
    document.addEventListener('keyup', (e) => this.handleKeyUp(e))
    
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e))
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e))
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e))
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e))
    
    // Touch events for mobile
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e))
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e))
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e))
  }

  private handleKeyDown(event: KeyboardEvent) {
    this.keys.add(event.code)
    this.emit('keydown', { code: event.code, key: event.key })
  }

  private handleKeyUp(event: KeyboardEvent) {
    this.keys.delete(event.code)
    this.emit('keyup', { code: event.code, key: event.key })
  }

  private handleMouseDown(event: MouseEvent) {
    this.mouse.buttons.add(event.button)
    this.updateMousePosition(event)
    this.emit('mousedown', { button: event.button, x: this.mouse.x, y: this.mouse.y })
  }

  private handleMouseUp(event: MouseEvent) {
    this.mouse.buttons.delete(event.button)
    this.updateMousePosition(event)
    this.emit('mouseup', { button: event.button, x: this.mouse.x, y: this.mouse.y })
  }

  private handleMouseMove(event: MouseEvent) {
    this.updateMousePosition(event)
    this.emit('mousemove', { x: this.mouse.x, y: this.mouse.y })
  }

  private handleWheel(event: WheelEvent) {
    event.preventDefault()
    this.emit('wheel', { deltaY: event.deltaY, x: this.mouse.x, y: this.mouse.y })
  }

  private handleTouchStart(event: TouchEvent) {
    event.preventDefault()
    const touch = event.touches[0]
    if (touch) {
      this.updateMousePosition({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent)
      this.emit('touchstart', { x: this.mouse.x, y: this.mouse.y })
    }
  }

  private handleTouchEnd(event: TouchEvent) {
    event.preventDefault()
    this.emit('touchend', { x: this.mouse.x, y: this.mouse.y })
  }

  private handleTouchMove(event: TouchEvent) {
    event.preventDefault()
    const touch = event.touches[0]
    if (touch) {
      this.updateMousePosition({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent)
      this.emit('touchmove', { x: this.mouse.x, y: this.mouse.y })
    }
  }

  private updateMousePosition(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect()
    this.mouse.x = event.clientX - rect.left
    this.mouse.y = event.clientY - rect.top
  }

  // Event system
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  // Input state queries
  isKeyPressed(key: string): boolean {
    return this.keys.has(key)
  }

  isMouseButtonPressed(button: number): boolean {
    return this.mouse.buttons.has(button)
  }

  getMousePosition(): { x: number; y: number } {
    return { x: this.mouse.x, y: this.mouse.y }
  }

  // Game-specific input handling
  getMovementInput(): { x: number; y: number } {
    let x = 0
    let y = 0

    if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) y -= 1
    if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) y += 1
    if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) x -= 1
    if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) x += 1

    return { x, y }
  }

  getActionInput(): string | null {
    if (this.isKeyPressed('Space')) return 'interact'
    if (this.isKeyPressed('KeyE')) return 'hack'
    if (this.isKeyPressed('KeyI')) return 'inventory'
    if (this.isKeyPressed('KeyC')) return 'contracts'
    if (this.isKeyPressed('KeyH')) return 'housing'
    return null
  }

  getCombatInput(): string | null {
    if (this.isMouseButtonPressed(0)) return 'shoot'
    if (this.isMouseButtonPressed(2)) return 'aim'
    if (this.isKeyPressed('KeyR')) return 'reload'
    return null
  }

  // Cleanup
  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown)
    document.removeEventListener('keyup', this.handleKeyUp)
    this.canvas.removeEventListener('mousedown', this.handleMouseDown)
    this.canvas.removeEventListener('mouseup', this.handleMouseUp)
    this.canvas.removeEventListener('mousemove', this.handleMouseMove)
    this.canvas.removeEventListener('wheel', this.handleWheel)
    this.canvas.removeEventListener('touchstart', this.handleTouchStart)
    this.canvas.removeEventListener('touchend', this.handleTouchEnd)
    this.canvas.removeEventListener('touchmove', this.handleTouchMove)
  }
}


