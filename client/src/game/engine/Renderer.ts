// Enhanced 2D Canvas renderer with cyberpunk styling
export class Renderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private camera: { x: number; y: number; zoom: number } = { x: 0, y: 0, zoom: 1 }
  private viewport: { left: number; right: number; top: number; bottom: number } = { left: 0, right: 0, top: 0, bottom: 0 }
  private renderQueue: RenderObject[] = []
  private effects: VisualEffect[] = []
  private time: number = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.setupCanvas()
    this.updateViewport()
  }

  private setupCanvas() {
    // Set canvas size
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    
    // Set rendering properties
    this.ctx.imageSmoothingEnabled = false
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
  }

  clear() {
    this.time += 16 // ~60fps
    
    // Cyberpunk dark background with subtle gradient
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height)
    )
    gradient.addColorStop(0, '#0a0a0a')
    gradient.addColorStop(1, '#050505')
    
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Clear render queue
    this.renderQueue = []
    
    // Update viewport for culling
    this.updateViewport()
  }

  renderWorld(worldState: any) {
    if (!worldState) return

    // Draw animated cyberpunk grid
    this.drawAnimatedGrid()
    
    // Draw world chunks (with viewport culling)
    if (worldState.chunks) {
      worldState.chunks.forEach((chunk: any) => {
        if (this.isChunkInViewport(chunk)) {
          this.renderChunk(chunk)
        }
      })
    }
    
    // Process render queue (for depth sorting)
    this.processRenderQueue()
    
    // Render effects
    this.renderEffects()
  }

  renderPlayers(players: any[]) {
    if (!players) return

    players.forEach(player => {
      this.renderPlayer(player)
    })
  }

  renderUI() {
    // Render UI elements
    this.drawEnhancedCrosshair()
    this.drawScanLines()
  }

  private drawAnimatedGrid() {
    const gridSize = 20 * this.camera.zoom
    const offsetX = this.camera.x % gridSize
    const offsetY = this.camera.y % gridSize
    
    // Animated grid opacity
    const pulseOpacity = 0.05 + Math.sin(this.time * 0.001) * 0.03
    this.ctx.strokeStyle = `rgba(0, 255, 136, ${pulseOpacity})`
    this.ctx.lineWidth = 1

    // Vertical lines
    for (let x = -offsetX; x < this.canvas.width + gridSize; x += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.canvas.height)
      this.ctx.stroke()
    }

    // Horizontal lines
    for (let y = -offsetY; y < this.canvas.height + gridSize; y += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.canvas.width, y)
      this.ctx.stroke()
    }
    
    // Major grid lines (every 5th line)
    this.ctx.strokeStyle = `rgba(0, 255, 136, ${pulseOpacity * 2})`
    this.ctx.lineWidth = 1.5
    
    for (let x = -offsetX; x < this.canvas.width + gridSize; x += gridSize * 5) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.canvas.height)
      this.ctx.stroke()
    }
    
    for (let y = -offsetY; y < this.canvas.height + gridSize; y += gridSize * 5) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.canvas.width, y)
      this.ctx.stroke()
    }
  }

  private renderChunk(chunk: any) {
    if (!chunk.generatedData) return

    const { buildings, roads, npcs } = chunk.generatedData

    // Render buildings
    if (buildings) {
      buildings.forEach((building: any) => {
        this.renderBuilding(building)
      })
    }

    // Render roads
    if (roads) {
      roads.forEach((road: any) => {
        this.renderRoad(road)
      })
    }

    // Render NPCs
    if (npcs) {
      npcs.forEach((npc: any) => {
        this.renderNPC(npc)
      })
    }
  }

  private renderBuilding(building: any) {
    const screenPos = this.worldToScreen(building.position)
    const screenSize = this.worldToScreen(building.size)
    
    if (!this.isInViewport(screenPos, screenSize)) return

    // Shadow/depth effect
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    this.ctx.fillRect(screenPos.x + 2, screenPos.y + 2, screenSize.x, screenSize.y)

    // Building body with district-based colors
    const buildingColor = this.getBuildingColor(building)
    this.ctx.fillStyle = buildingColor.fill
    this.ctx.fillRect(screenPos.x, screenPos.y, screenSize.x, screenSize.y)
    
    // Hackable building glow effect
    if (building.hackable) {
      this.ctx.save()
      this.ctx.shadowColor = '#ff0080'
      this.ctx.shadowBlur = 10 + Math.sin(this.time * 0.003) * 5
      this.ctx.strokeStyle = '#ff0080'
      this.ctx.lineWidth = 2
      this.ctx.strokeRect(screenPos.x - 1, screenPos.y - 1, screenSize.x + 2, screenSize.y + 2)
      this.ctx.restore()
    }

    // Building outline
    this.ctx.strokeStyle = buildingColor.outline
    this.ctx.lineWidth = 1
    this.ctx.strokeRect(screenPos.x, screenPos.y, screenSize.x, screenSize.y)
    
    // Windows/details
    this.drawBuildingDetails(screenPos, screenSize, building)

    // Security level indicator
    if (building.securityLevel > 0) {
      this.drawSecurityIndicator(screenPos, building.securityLevel)
    }
  }

  private renderRoad(road: any) {
    const start = this.worldToScreen(road.start)
    const end = this.worldToScreen(road.end)

    this.ctx.strokeStyle = '#444444'
    this.ctx.lineWidth = road.width * this.camera.zoom
    this.ctx.beginPath()
    this.ctx.moveTo(start.x, start.y)
    this.ctx.lineTo(end.x, end.y)
    this.ctx.stroke()
  }

  private renderNPC(npc: any) {
    const screenPos = this.worldToScreen(npc.position)
    const size = 8 * this.camera.zoom

    // NPC body
    this.ctx.fillStyle = this.getNPCColor(npc.type)
    this.ctx.beginPath()
    this.ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2)
    this.ctx.fill()

    // NPC outline
    this.ctx.strokeStyle = '#ffffff'
    this.ctx.lineWidth = 1
    this.ctx.stroke()
  }

  private renderPlayer(player: any) {
    const centerX = this.canvas.width / 2
    const centerY = this.canvas.height / 2

    // Player body
    this.ctx.fillStyle = '#00ff88'
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, 15, 0, Math.PI * 2)
    this.ctx.fill()

    // Player outline
    this.ctx.strokeStyle = '#00ffff'
    this.ctx.lineWidth = 2
    this.ctx.stroke()

    // Health bar
    this.drawHealthBar(centerX, centerY - 25, player.health)
  }

  private drawHealthBar(x: number, y: number, health: number) {
    const width = 40
    const height = 4

    // Background
    this.ctx.fillStyle = '#ff0000'
    this.ctx.fillRect(x - width / 2, y, width, height)

    // Health
    this.ctx.fillStyle = '#00ff00'
    this.ctx.fillRect(x - width / 2, y, (health / 100) * width, height)
  }

  private drawEnhancedCrosshair() {
    const centerX = this.canvas.width / 2
    const centerY = this.canvas.height / 2
    const pulse = Math.sin(this.time * 0.008) * 0.3 + 0.7

    this.ctx.save()
    this.ctx.strokeStyle = `rgba(0, 255, 255, ${pulse})`
    this.ctx.lineWidth = 2
    this.ctx.shadowColor = '#00ffff'
    this.ctx.shadowBlur = 8
    
    // Main crosshair
    this.ctx.beginPath()
    this.ctx.moveTo(centerX - 15, centerY)
    this.ctx.lineTo(centerX - 5, centerY)
    this.ctx.moveTo(centerX + 5, centerY)
    this.ctx.lineTo(centerX + 15, centerY)
    this.ctx.moveTo(centerX, centerY - 15)
    this.ctx.lineTo(centerX, centerY - 5)
    this.ctx.moveTo(centerX, centerY + 5)
    this.ctx.lineTo(centerX, centerY + 15)
    this.ctx.stroke()
    
    // Center dot
    this.ctx.fillStyle = `rgba(0, 255, 255, ${pulse * 0.8})`
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, 2, 0, Math.PI * 2)
    this.ctx.fill()
    
    this.ctx.restore()
  }

  private worldToScreen(worldPos: { x: number; y: number }) {
    return {
      x: (worldPos.x - this.camera.x) * this.camera.zoom + this.canvas.width / 2,
      y: (worldPos.y - this.camera.y) * this.camera.zoom + this.canvas.height / 2
    }
  }

  private getNPCColor(type: string): string {
    const colors = {
      guard: '#ff0000',
      civilian: '#ffffff',
      fixer: '#ff0080',
      dealer: '#8b5cf6',
      thug: '#ff6b35',
      executive: '#00ffff'
    }
    return colors[type as keyof typeof colors] || '#666666'
  }

  // Camera controls
  setCamera(x: number, y: number, zoom: number = 1) {
    this.camera = { x, y, zoom }
  }

  getCamera() {
    return this.camera
  }

  // Utility methods
  addChunk(chunk: any) {
    // Add chunk to render queue
    console.log('Added chunk to renderer:', chunk.id)
  }

  resize(width: number, height: number) {
    this.canvas.width = width
    this.canvas.height = height
    this.updateViewport()
  }

  // New enhanced methods
  private updateViewport() {
    const padding = 100
    this.viewport = {
      left: this.camera.x - (this.canvas.width / 2 / this.camera.zoom) - padding,
      right: this.camera.x + (this.canvas.width / 2 / this.camera.zoom) + padding,
      top: this.camera.y - (this.canvas.height / 2 / this.camera.zoom) - padding,
      bottom: this.camera.y + (this.canvas.height / 2 / this.camera.zoom) + padding
    }
  }

  private isChunkInViewport(chunk: any): boolean {
    const chunkSize = 1000 // Assumed chunk size
    const chunkLeft = chunk.x * chunkSize
    const chunkRight = (chunk.x + 1) * chunkSize
    const chunkTop = chunk.y * chunkSize
    const chunkBottom = (chunk.y + 1) * chunkSize
    
    return !(chunkRight < this.viewport.left || 
             chunkLeft > this.viewport.right ||
             chunkBottom < this.viewport.top ||
             chunkTop > this.viewport.bottom)
  }

  private isInViewport(pos: {x: number, y: number}, size?: {x: number, y: number}): boolean {
    const worldPos = this.screenToWorld(pos)
    const sizeX = size ? size.x / this.camera.zoom : 0
    const sizeY = size ? size.y / this.camera.zoom : 0
    
    return !(worldPos.x + sizeX < this.viewport.left ||
             worldPos.x > this.viewport.right ||
             worldPos.y + sizeY < this.viewport.top ||
             worldPos.y > this.viewport.bottom)
  }

  private screenToWorld(screenPos: {x: number, y: number}) {
    return {
      x: (screenPos.x - this.canvas.width / 2) / this.camera.zoom + this.camera.x,
      y: (screenPos.y - this.canvas.height / 2) / this.camera.zoom + this.camera.y
    }
  }

  private processRenderQueue() {
    // Sort render queue by depth (y-position for isometric-style depth)
    this.renderQueue.sort((a, b) => a.depth - b.depth)
    
    // Render sorted objects
    this.renderQueue.forEach(obj => {
      obj.render(this.ctx)
    })
  }

  private renderEffects() {
    this.effects.forEach((effect, index) => {
      effect.update()
      effect.render(this.ctx)
      
      if (effect.isComplete()) {
        this.effects.splice(index, 1)
      }
    })
  }

  private getBuildingColor(building: any) {
    const districtColors = {
      corporate: { fill: '#1a1a2e', outline: '#00ffff' },
      residential: { fill: '#2d2d44', outline: '#ffffff' },
      industrial: { fill: '#3d2914', outline: '#ff6b35' },
      underground: { fill: '#0f1419', outline: '#ff0080' },
      wasteland: { fill: '#2d1f1f', outline: '#ff4444' }
    }
    
    return districtColors[building.district as keyof typeof districtColors] || 
           { fill: '#333333', outline: '#666666' }
  }

  private drawBuildingDetails(pos: {x: number, y: number}, size: {x: number, y: number}, building: any) {
    if (size.x < 20 || size.y < 20) return // Too small to show details
    
    const windowColor = building.hackable ? '#ff0080' : '#ffff00'
    this.ctx.fillStyle = windowColor
    
    // Simple window pattern
    const windowSize = 3
    const windowSpacing = 8
    
    for (let x = pos.x + 5; x < pos.x + size.x - windowSize; x += windowSpacing) {
      for (let y = pos.y + 5; y < pos.y + size.y - windowSize; y += windowSpacing) {
        if (Math.random() > 0.3) { // Random windows
          this.ctx.fillRect(x, y, windowSize, windowSize)
        }
      }
    }
  }

  private drawSecurityIndicator(pos: {x: number, y: number}, level: number) {
    const barWidth = Math.min(level * 10, 50)
    const barHeight = 4
    
    // Background
    this.ctx.fillStyle = '#330000'
    this.ctx.fillRect(pos.x, pos.y - 8, 50, barHeight)
    
    // Security level bar
    const colors = ['#00ff00', '#ffff00', '#ff8800', '#ff0000', '#ff00ff']
    this.ctx.fillStyle = colors[Math.min(level - 1, colors.length - 1)]
    this.ctx.fillRect(pos.x, pos.y - 8, barWidth, barHeight)
    
    // Glowing effect for high security
    if (level >= 4) {
      this.ctx.save()
      this.ctx.shadowColor = this.ctx.fillStyle as string
      this.ctx.shadowBlur = 5
      this.ctx.fillRect(pos.x, pos.y - 8, barWidth, barHeight)
      this.ctx.restore()
    }
  }

  private drawScanLines() {
    this.ctx.save()
    this.ctx.globalAlpha = 0.03
    this.ctx.strokeStyle = '#00ffff'
    this.ctx.lineWidth = 1
    
    for (let y = 0; y < this.canvas.height; y += 4) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.canvas.width, y)
      this.ctx.stroke()
    }
    
    this.ctx.restore()
  }

  // Effect system
  addEffect(effect: VisualEffect) {
    this.effects.push(effect)
  }

  createMuzzleFlash(worldPos: {x: number, y: number}) {
    const screenPos = this.worldToScreen(worldPos)
    this.addEffect(new MuzzleFlashEffect(screenPos.x, screenPos.y))
  }

  createExplosion(worldPos: {x: number, y: number}) {
    const screenPos = this.worldToScreen(worldPos)
    this.addEffect(new ExplosionEffect(screenPos.x, screenPos.y))
  }
}

// Type definitions and effect classes
interface RenderObject {
  depth: number
  render(ctx: CanvasRenderingContext2D): void
}

abstract class VisualEffect {
  protected x: number
  protected y: number
  protected life: number
  protected maxLife: number

  constructor(x: number, y: number, maxLife: number = 1000) {
    this.x = x
    this.y = y
    this.life = 0
    this.maxLife = maxLife
  }

  update() {
    this.life += 16 // ~60fps
  }

  isComplete(): boolean {
    return this.life >= this.maxLife
  }

  abstract render(ctx: CanvasRenderingContext2D): void
}

class MuzzleFlashEffect extends VisualEffect {
  constructor(x: number, y: number) {
    super(x, y, 100) // Very short duration
  }

  render(ctx: CanvasRenderingContext2D) {
    const alpha = 1 - (this.life / this.maxLife)
    const size = 20 - (this.life / this.maxLife) * 10
    
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#ffff00'
    ctx.shadowColor = '#ffff00'
    ctx.shadowBlur = 20
    
    ctx.beginPath()
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.restore()
  }
}

class ExplosionEffect extends VisualEffect {
  private particles: {x: number, y: number, vx: number, vy: number, life: number}[] = []

  constructor(x: number, y: number) {
    super(x, y, 2000)
    
    // Create particles
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 0
      })
    }
  }

  update() {
    super.update()
    
    this.particles.forEach(particle => {
      particle.x += particle.vx
      particle.y += particle.vy
      particle.vx *= 0.95
      particle.vy *= 0.95
      particle.life += 16
    })
  }

  render(ctx: CanvasRenderingContext2D) {
    const alpha = Math.max(0, 1 - (this.life / this.maxLife))
    
    ctx.save()
    
    this.particles.forEach(particle => {
      const particleAlpha = Math.max(0, alpha - (particle.life / 1000))
      if (particleAlpha <= 0) return
      
      ctx.globalAlpha = particleAlpha
      ctx.fillStyle = '#ff4444'
      ctx.shadowColor = '#ff4444'
      ctx.shadowBlur = 10
      
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2)
      ctx.fill()
    })
    
    ctx.restore()
  }
}

