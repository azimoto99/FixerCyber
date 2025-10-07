// Enhanced 2D Canvas renderer with cyberpunk styling
export class Renderer {
  public canvas: HTMLCanvasElement
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

  renderWorld(worldState: any, playerPosition?: {x: number, y: number}) {
    if (!worldState) return

    // Draw animated cyberpunk grid
    this.drawAnimatedGrid()
    
    // Draw world chunks (with viewport culling)
    if (worldState.chunks) {
      worldState.chunks.forEach((chunk: any) => {
        if (this.isChunkInViewport(chunk)) {
          this.renderChunk(chunk, playerPosition)
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

  renderProjectiles(projectiles: any[]) {
    if (!projectiles || projectiles.length === 0) return
    
    projectiles.forEach(projectile => {
      this.renderProjectile(projectile)
    })
  }
  
  private renderProjectile(projectile: any) {
    const screenPos = this.worldToScreen(projectile.position)
    const size = 4 * this.camera.zoom
    
    // Projectile trail effect
    this.ctx.save()
    this.ctx.shadowColor = this.getProjectileColor(projectile.weapon)
    this.ctx.shadowBlur = 10
    
    // Main projectile
    this.ctx.fillStyle = this.getProjectileColor(projectile.weapon)
    this.ctx.beginPath()
    this.ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2)
    this.ctx.fill()
    
    // Bright center
    this.ctx.fillStyle = '#ffffff'
    this.ctx.beginPath()
    this.ctx.arc(screenPos.x, screenPos.y, size / 2, 0, Math.PI * 2)
    this.ctx.fill()
    
    this.ctx.restore()
  }
  
  private getProjectileColor(weapon: string): string {
    const colors = {
      pistol: '#ffff00',
      rifle: '#ff6b35',
      smg: '#ff0080',
      cyber: '#00ffff'
    }
    return colors[weapon as keyof typeof colors] || '#ffffff'
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

  private renderChunk(chunk: any, playerPosition?: {x: number, y: number}) {
    if (!chunk.generatedData) return

    const { buildings, roads, npcs, infrastructure } = chunk.generatedData

    // Render roads first (behind everything)
    if (roads) {
      roads.forEach((road: any) => {
        this.renderRoad(road)
      })
    }

    // Render infrastructure (streetlights, signs, etc.)
    if (infrastructure) {
      infrastructure.forEach((item: any) => {
        this.renderInfrastructure(item)
      })
    }

    // Render buildings with 3D effect
    if (buildings) {
      buildings.forEach((building: any) => {
        this.renderBuilding3D(building, playerPosition)
      })
    }

    // Render NPCs
    if (npcs) {
      npcs.forEach((npc: any) => {
        this.renderNPC(npc, playerPosition)
      })
    }
  }


  // New 3D building rendering method
  private renderBuilding3D(building: any, playerPosition?: {x: number, y: number}) {
    const screenPos = this.worldToScreen(building.position)
    const screenSize = {
      x: building.size.x * this.camera.zoom,
      y: building.size.y * this.camera.zoom
    }
    
    // Check if player is near this building for interaction feedback
    let isNearby = false
    if (playerPosition) {
      const dx = playerPosition.x - (building.position.x + building.size.x / 2)
      const dy = playerPosition.y - (building.position.y + building.size.y / 2)
      const distance = Math.sqrt(dx * dx + dy * dy)
      isNearby = distance <= 50 // Within interaction range
    }
    
    if (!this.isInViewport(screenPos, screenSize)) return

    // Calculate 3D projection
    const height = (building.height || 40) * this.camera.zoom * 0.5
    const offsetX = height * 0.3
    const offsetY = height * 0.3

    // Render building with 3D effect
    const buildingColor = this.getBuildingColor(building)
    
    // Top face (isometric top)
    this.ctx.fillStyle = this.lightenColor(buildingColor.fill, 0.3)
    this.ctx.beginPath()
    this.ctx.moveTo(screenPos.x, screenPos.y - offsetY)
    this.ctx.lineTo(screenPos.x + screenSize.x, screenPos.y - offsetY)
    this.ctx.lineTo(screenPos.x + screenSize.x + offsetX, screenPos.y - offsetY - offsetX)
    this.ctx.lineTo(screenPos.x + offsetX, screenPos.y - offsetY - offsetX)
    this.ctx.closePath()
    this.ctx.fill()
    
    // Right face (side)
    this.ctx.fillStyle = this.darkenColor(buildingColor.fill, 0.2)
    this.ctx.beginPath()
    this.ctx.moveTo(screenPos.x + screenSize.x, screenPos.y - offsetY)
    this.ctx.lineTo(screenPos.x + screenSize.x + offsetX, screenPos.y - offsetY - offsetX)
    this.ctx.lineTo(screenPos.x + screenSize.x + offsetX, screenPos.y + screenSize.y - offsetY - offsetX)
    this.ctx.lineTo(screenPos.x + screenSize.x, screenPos.y + screenSize.y - offsetY)
    this.ctx.closePath()
    this.ctx.fill()
    
    // Front face (main face)
    this.ctx.fillStyle = buildingColor.fill
    this.ctx.fillRect(screenPos.x, screenPos.y - offsetY, screenSize.x, screenSize.y)
    
    // Add windows to the front face
    this.drawBuildingWindows3D(screenPos, screenSize, building, offsetY)
    
    // Building outline
    this.ctx.strokeStyle = buildingColor.outline
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(screenPos.x, screenPos.y - offsetY, screenSize.x, screenSize.y)
    
    // Hackable building glow effect
    if (building.hackable) {
      this.ctx.save()
      this.ctx.shadowColor = '#ff0080'
      this.ctx.shadowBlur = 15 + Math.sin(this.time * 0.003) * 8
      this.ctx.strokeStyle = '#ff0080'
      this.ctx.lineWidth = 3
      this.ctx.strokeRect(screenPos.x - 2, screenPos.y - offsetY - 2, screenSize.x + 4, screenSize.y + 4)
      this.ctx.restore()
    }
    
    // Building type label
    if (screenSize.x > 40 && screenSize.y > 40) {
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = `${Math.max(10, screenSize.y * 0.08)}px monospace`
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.shadowColor = '#000000'
      this.ctx.shadowBlur = 2
      
      const label = building.type || 'BUILDING'
      this.ctx.fillText(label.toUpperCase(), screenPos.x + screenSize.x / 2, screenPos.y - offsetY + screenSize.y / 2)
    }
    
    // Interaction feedback when nearby
    if (isNearby && (building.hackable || building.type === 'entrance')) {
      this.drawInteractionPrompt(
        { x: screenPos.x, y: screenPos.y - offsetY }, 
        screenSize, 
        building
      )
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

  private renderNPC(npc: any, playerPosition?: {x: number, y: number}) {
    const screenPos = this.worldToScreen(npc.position)
    const size = 10 * this.camera.zoom // Slightly bigger
    
    // Check if player is near this NPC for interaction feedback
    let isNearby = false
    if (playerPosition) {
      const dx = playerPosition.x - npc.position.x
      const dy = playerPosition.y - npc.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      isNearby = distance <= 40 // Within interaction range
    }

    // NPC body with better visibility
    this.ctx.fillStyle = this.getNPCColor(npc.type)
    this.ctx.beginPath()
    this.ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2)
    this.ctx.fill()

    // NPC outline - stronger for visibility
    this.ctx.strokeStyle = '#ffffff'
    this.ctx.lineWidth = 2
    this.ctx.stroke()
    
    // Interaction indicator when nearby
    if (isNearby) {
      this.ctx.strokeStyle = '#00ff00'
      this.ctx.lineWidth = 3
      this.ctx.beginPath()
      this.ctx.arc(screenPos.x, screenPos.y, size + 5, 0, Math.PI * 2)
      this.ctx.stroke()
    }
    
    // NPC type label
    if (size > 8) {
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = '10px monospace'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(npc.type.toUpperCase(), screenPos.x, screenPos.y - size - 8)
    }
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
      corporate: { 
        fill: '#2a3d66', 
        outline: '#00ffff', 
        innerBorder: '#4a6fa5' 
      },
      residential: { 
        fill: '#4a4a70', 
        outline: '#ffffff', 
        innerBorder: '#6a6a90' 
      },
      industrial: { 
        fill: '#663d1a', 
        outline: '#ff6b35', 
        innerBorder: '#996d4a' 
      },
      underground: { 
        fill: '#2a1f2a', 
        outline: '#ff0080', 
        innerBorder: '#4a3f4a' 
      },
      wasteland: { 
        fill: '#4d2f2f', 
        outline: '#ff4444', 
        innerBorder: '#6d4f4f' 
      }
    }
    
    return districtColors[building.district as keyof typeof districtColors] || 
           { fill: '#555555', outline: '#888888', innerBorder: '#777777' }
  }
  
  
  private drawInteractionPrompt(pos: {x: number, y: number}, size: {x: number, y: number}, building: any) {
    const centerX = pos.x + size.x / 2
    const promptY = pos.y - 15
    
    this.ctx.save()
    
    // Pulsing background
    const pulseAlpha = 0.5 + Math.sin(this.time * 0.005) * 0.3
    this.ctx.fillStyle = `rgba(0, 255, 0, ${pulseAlpha})`
    this.ctx.fillRect(centerX - 30, promptY - 8, 60, 16)
    
    // Interaction text
    this.ctx.fillStyle = '#000000'
    this.ctx.font = '12px monospace'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    
    const action = building.hackable ? '[E] HACK' : '[E] ENTER'
    this.ctx.fillText(action, centerX, promptY)
    
    this.ctx.restore()
  }
  
  // Infrastructure rendering
  private renderInfrastructure(item: any) {
    const screenPos = this.worldToScreen(item.position)
    
    if (!this.isInViewport(screenPos)) return
    
    switch (item.type) {
      case 'streetlight':
        this.renderStreetlight(screenPos, item)
        break
      case 'sign':
      case 'billboard':
        this.renderSign(screenPos, item)
        break
      case 'debris':
        this.renderDebris(screenPos, item)
        break
    }
  }
  
  private renderStreetlight(screenPos: {x: number, y: number}, light: any) {
    const height = (light.height || 20) * this.camera.zoom * 0.8
    
    // Streetlight pole
    this.ctx.strokeStyle = '#666666'
    this.ctx.lineWidth = 3 * this.camera.zoom
    this.ctx.beginPath()
    this.ctx.moveTo(screenPos.x, screenPos.y)
    this.ctx.lineTo(screenPos.x, screenPos.y - height)
    this.ctx.stroke()
    
    // Light fixture
    this.ctx.fillStyle = '#444444'
    this.ctx.fillRect(screenPos.x - 6, screenPos.y - height - 8, 12, 8)
    
    // Light glow
    if (light.lightColor) {
      this.ctx.save()
      this.ctx.globalAlpha = 0.3
      this.ctx.shadowColor = light.lightColor
      this.ctx.shadowBlur = 20
      this.ctx.fillStyle = light.lightColor
      this.ctx.beginPath()
      this.ctx.arc(screenPos.x, screenPos.y - height - 4, 8, 0, Math.PI * 2)
      this.ctx.fill()
      this.ctx.restore()
    }
  }
  
  private renderSign(screenPos: {x: number, y: number}, sign: any) {
    const width = (sign.size?.x || 30) * this.camera.zoom
    const height = (sign.size?.y || 15) * this.camera.zoom
    
    // Sign background
    this.ctx.fillStyle = sign.type === 'billboard' ? '#ff0080' : '#333333'
    this.ctx.fillRect(screenPos.x - width/2, screenPos.y - height/2, width, height)
    
    // Sign border
    this.ctx.strokeStyle = '#ffffff'
    this.ctx.lineWidth = 1
    this.ctx.strokeRect(screenPos.x - width/2, screenPos.y - height/2, width, height)
    
    // Sign text
    if (sign.text && width > 20) {
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = `${Math.max(8, height * 0.4)}px monospace`
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText(sign.text, screenPos.x, screenPos.y)
    }
  }
  
  private renderDebris(screenPos: {x: number, y: number}, debris: any) {
    const size = (debris.size || 4) * this.camera.zoom
    
    this.ctx.fillStyle = debris.debrisType === 'trash' ? '#444444' : '#666666'
    this.ctx.fillRect(screenPos.x - size/2, screenPos.y - size/2, size, size)
  }
  
  // 3D window rendering for buildings
  private drawBuildingWindows3D(pos: {x: number, y: number}, size: {x: number, y: number}, building: any, offsetY: number) {
    if (size.x < 30 || size.y < 30) return
    
    const windowColor = building.hackable ? '#ff0080' : '#ffff88'
    this.ctx.fillStyle = windowColor
    
    const windowSize = Math.max(2, 4 * this.camera.zoom)
    const windowSpacing = Math.max(8, 12 * this.camera.zoom)
    
    // Create window grid
    for (let x = pos.x + windowSpacing; x < pos.x + size.x - windowSize; x += windowSpacing) {
      for (let y = pos.y - offsetY + windowSpacing; y < pos.y - offsetY + size.y - windowSize; y += windowSpacing) {
        if (Math.random() > 0.2) { // Most windows are lit
          this.ctx.fillRect(x, y, windowSize, windowSize)
          
          // Add slight glow to windows
          if (building.district === 'corporate') {
            this.ctx.save()
            this.ctx.globalAlpha = 0.3
            this.ctx.shadowColor = windowColor
            this.ctx.shadowBlur = 3
            this.ctx.fillRect(x, y, windowSize, windowSize)
            this.ctx.restore()
          }
        }
      }
    }
  }
  
  // Color manipulation helpers
  private lightenColor(color: string, _amount: number): string {
    // Simple color lightening - in a full implementation this would use proper color parsing
    const colors = {
      '#2a3d66': '#4a5d86',
      '#4a4a70': '#6a6a90',
      '#663d1a': '#865d3a',
      '#2a1f2a': '#4a3f4a',
      '#4d2f2f': '#6d4f4f'
    }
    return colors[color as keyof typeof colors] || color
  }
  
  private darkenColor(color: string, _amount: number): string {
    // Simple color darkening
    const colors = {
      '#2a3d66': '#1a2d56',
      '#4a4a70': '#3a3a60',
      '#663d1a': '#562d0a',
      '#2a1f2a': '#1a0f1a',
      '#4d2f2f': '#3d1f1f'
    }
    return colors[color as keyof typeof colors] || color
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

