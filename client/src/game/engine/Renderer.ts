// 2D Canvas renderer
export class Renderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private camera: { x: number; y: number; zoom: number } = { x: 0, y: 0, zoom: 1 }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.setupCanvas()
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
    this.ctx.fillStyle = '#0a0a0a'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  renderWorld(worldState: any) {
    if (!worldState) return

    // Draw cyberpunk grid
    this.drawGrid()
    
    // Draw world chunks
    if (worldState.chunks) {
      worldState.chunks.forEach((chunk: any) => {
        this.renderChunk(chunk)
      })
    }
  }

  renderPlayers(players: any[]) {
    if (!players) return

    players.forEach(player => {
      this.renderPlayer(player)
    })
  }

  renderUI() {
    // Render UI elements
    this.drawCrosshair()
  }

  private drawGrid() {
    const gridSize = 20 * this.camera.zoom
    const offsetX = this.camera.x % gridSize
    const offsetY = this.camera.y % gridSize

    this.ctx.strokeStyle = 'rgba(0, 255, 136, 0.1)'
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

    // Building body
    this.ctx.fillStyle = building.hackable ? '#ff0080' : '#333333'
    this.ctx.fillRect(screenPos.x, screenPos.y, screenSize.x, screenSize.y)

    // Building outline
    this.ctx.strokeStyle = building.hackable ? '#ff0080' : '#666666'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(screenPos.x, screenPos.y, screenSize.x, screenSize.y)

    // Security level indicator
    if (building.securityLevel > 0) {
      this.ctx.fillStyle = '#ff0000'
      this.ctx.fillRect(screenPos.x, screenPos.y - 5, building.securityLevel * 10, 3)
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

  private drawCrosshair() {
    const centerX = this.canvas.width / 2
    const centerY = this.canvas.height / 2

    this.ctx.strokeStyle = '#00ffff'
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.moveTo(centerX - 10, centerY)
    this.ctx.lineTo(centerX + 10, centerY)
    this.ctx.moveTo(centerX, centerY - 10)
    this.ctx.lineTo(centerX, centerY + 10)
    this.ctx.stroke()
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
  }
}


