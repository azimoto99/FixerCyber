// Isometric renderer for Diablo-style gameplay
export interface IsometricTile {
  x: number
  y: number
  z: number
  type: 'ground' | 'wall' | 'building' | 'object' | 'decoration'
  texture: string
  walkable: boolean
  interactive?: boolean
  id?: string
}

export interface IsometricObject {
  x: number
  y: number
  z: number
  width: number
  height: number
  depth: number
  type: string
  color: string
  castShadow: boolean
  interactive?: boolean
  id?: string
}

export interface LightSource {
  x: number
  y: number
  z: number
  intensity: number
  color: string
  radius: number
}

export class IsometricRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private camera: { x: number; y: number; zoom: number } = { x: 0, y: 0, zoom: 1.5 }
  private tileSize = 64 // Base tile size in pixels
  private renderQueue: { depth: number; render: () => void }[] = []
  private lightSources: LightSource[] = []
  private shadowCanvas: HTMLCanvasElement
  private shadowCtx: CanvasRenderingContext2D

  // Fog of war
  private fogCanvas: HTMLCanvasElement
  private fogCtx: CanvasRenderingContext2D
  private fogEnabled: boolean = true
  private fogDensity: number = 0.6 // 0-1 darkness
  private fogRadius: number = 220 // base reveal radius in world pixels

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    
    // Create shadow canvas for pre-rendering shadows
    this.shadowCanvas = document.createElement('canvas')
    this.shadowCanvas.width = canvas.width
    this.shadowCanvas.height = canvas.height
    this.shadowCtx = this.shadowCanvas.getContext('2d')!

    // Fog canvas
    this.fogCanvas = document.createElement('canvas')
    this.fogCanvas.width = canvas.width
    this.fogCanvas.height = canvas.height
    this.fogCtx = this.fogCanvas.getContext('2d')!
    
    this.setupRenderer()
  }

  private setupRenderer() {
    this.ctx.imageSmoothingEnabled = false
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
  }

  // Convert world coordinates to isometric screen coordinates
  private worldToIso(worldX: number, worldY: number, worldZ: number = 0): { x: number, y: number } {
    const isoX = (worldX - worldY) * (this.tileSize / 2) * this.camera.zoom
    const isoY = (worldX + worldY) * (this.tileSize / 4) * this.camera.zoom - (worldZ * this.tileSize / 2) * this.camera.zoom

    // Compute camera offset in iso space using camera's world coords (stored in tile units)
    const camIsoX = (this.camera.x - this.camera.y) * (this.tileSize / 2) * this.camera.zoom
    const camIsoY = (this.camera.x + this.camera.y) * (this.tileSize / 4) * this.camera.zoom
    
    return {
      x: isoX + this.canvas.width / 2 - camIsoX,
      y: isoY + this.canvas.height / 2 - camIsoY
    }
  }

  // Convert screen coordinates to world coordinates (for mouse interaction)
  screenToWorld(screenX: number, screenY: number): { x: number, y: number } {
    // Adjust for camera offset (camera is stored in world tile units)
    const camIsoX = (this.camera.x - this.camera.y) * (this.tileSize / 2) * this.camera.zoom
    const camIsoY = (this.camera.x + this.camera.y) * (this.tileSize / 4) * this.camera.zoom

    const adjustedX = (screenX - this.canvas.width / 2 + camIsoX) / this.camera.zoom
    const adjustedY = (screenY - this.canvas.height / 2 + camIsoY) / this.camera.zoom

    // Convert from isometric back to world tile coordinates
    const worldTileX = (adjustedX / (this.tileSize / 2) + adjustedY / (this.tileSize / 4)) / 2
    const worldTileY = (adjustedY / (this.tileSize / 4) - adjustedX / (this.tileSize / 2)) / 2

    // Convert to world pixels (50 world pixels per tile)
    return {
      x: worldTileX * 50,
      y: worldTileY * 50
    }
  }

  clear() {
    // Dark cyberpunk sky
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height)
    gradient.addColorStop(0, '#0a0a0a') // Very dark at top
    gradient.addColorStop(1, '#1a1a2e') // Dark purple at bottom
    
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Clear render queue
    this.renderQueue = []
    
    // Clear shadow canvas
    this.shadowCtx.clearRect(0, 0, this.shadowCanvas.width, this.shadowCanvas.height)
  }

  // Add object to render queue with depth sorting
  private addToRenderQueue(depth: number, renderFunc: () => void) {
    this.renderQueue.push({ depth, render: renderFunc })
  }

  // Process render queue (sort by depth, then render)
  private processRenderQueue() {
    // Sort by depth (back to front)
    this.renderQueue.sort((a, b) => a.depth - b.depth)
    
    // Render shadows first
    this.renderShadows()
    
    // Then render all objects
    this.renderQueue.forEach(item => item.render())
  }

  renderWorld(worldState: any, playerPosition?: { x: number, y: number }) {
    if (!worldState || !worldState.chunks) return

    // Calculate visible area for culling
    const viewBounds = this.getViewBounds()

    // Render ground tiles first
    this.renderGroundTiles(worldState.chunks, viewBounds)
    
    // Add world objects to render queue
    worldState.chunks.forEach((chunk: any) => {
      if (chunk.generatedData) {
        this.processChunkForRendering(chunk, viewBounds, playerPosition)
      }
    })

    // Process all queued renders
    this.processRenderQueue()

    // Lighting pass (emissive)
    this.renderLighting()

    // Fog of war pass (overlay)
    this.renderFogOfWar(playerPosition)

    // Clear per-frame lights
    this.clearLights()
  }

  private renderGroundTiles(chunks: any[], viewBounds: any) {
    chunks.forEach(chunk => {
      if (!this.isChunkInView(chunk, viewBounds)) return
      
      const chunkSize = 1000 // World units
      const tilesPerChunk = 20 // 20x20 tiles per chunk
      const tileWorldSize = chunkSize / tilesPerChunk
      
      for (let tileX = 0; tileX < tilesPerChunk; tileX++) {
        for (let tileY = 0; tileY < tilesPerChunk; tileY++) {
          const worldX = chunk.x * chunkSize + tileX * tileWorldSize
          const worldY = chunk.y * chunkSize + tileY * tileWorldSize
          
          this.renderGroundTile(worldX / tileWorldSize, worldY / tileWorldSize, this.getGroundType(tileX, tileY, chunk))
        }
      }
    })
  }

  private renderGroundTile(tileX: number, tileY: number, groundType: string) {
    const screenPos = this.worldToIso(tileX, tileY, 0)
    const tileWidth = this.tileSize * this.camera.zoom
    const tileHeight = (this.tileSize / 2) * this.camera.zoom

    this.ctx.save()
    
    // Enhanced cyberpunk tile colors with gradients
    const tileConfigs = {
      street: {
        baseColor: '#2a2a2f',
        highlightColor: '#3a3a45',
        pattern: 'asphalt',
        hasGlow: true,
        glowColor: 'rgba(255, 255, 100, 0.08)'
      },
      sidewalk: {
        baseColor: '#3a3a45',
        highlightColor: '#45455a',
        pattern: 'concrete',
        hasGlow: true,
        glowColor: 'rgba(0, 255, 255, 0.1)'
      },
      grass: {
        baseColor: '#1a2a1a',
        highlightColor: '#2a3a2a',
        pattern: 'organic',
        hasGlow: false
      },
      concrete: {
        baseColor: '#404050',
        highlightColor: '#505065',
        pattern: 'tech',
        hasGlow: true,
        glowColor: 'rgba(100, 150, 255, 0.05)'
      },
      dirt: {
        baseColor: '#3a2a1a',
        highlightColor: '#4a3a2a',
        pattern: 'rough',
        hasGlow: false
      },
      building: {
        baseColor: '#0a0a0a',
        highlightColor: '#1a1a1a',
        pattern: 'metal',
        hasGlow: false
      },
      door: {
        baseColor: '#5a4a3a',
        highlightColor: '#6a5a4a',
        pattern: 'tech',
        hasGlow: true,
        glowColor: 'rgba(255, 200, 0, 0.3)'
      }
    }
    
    const config = tileConfigs[groundType as keyof typeof tileConfigs] || tileConfigs.concrete
    
    // Draw isometric tile with gradient for depth
    const gradient = this.ctx.createLinearGradient(
      screenPos.x - tileWidth / 2,
      screenPos.y,
      screenPos.x + tileWidth / 2,
      screenPos.y + tileHeight
    )
    gradient.addColorStop(0, config.highlightColor)
    gradient.addColorStop(1, config.baseColor)
    
    this.ctx.fillStyle = gradient
    
    // Draw main tile
    this.ctx.beginPath()
    this.ctx.moveTo(screenPos.x, screenPos.y)
    this.ctx.lineTo(screenPos.x + tileWidth / 2, screenPos.y + tileHeight / 2)
    this.ctx.lineTo(screenPos.x, screenPos.y + tileHeight)
    this.ctx.lineTo(screenPos.x - tileWidth / 2, screenPos.y + tileHeight / 2)
    this.ctx.closePath()
    this.ctx.fill()
    
    // Add surface patterns for visual interest
    if (config.pattern === 'asphalt' && groundType === 'street') {
      // Road markings
      if (Math.abs(tileX % 4) < 1) {
        this.ctx.strokeStyle = 'rgba(255, 255, 100, 0.3)'
        this.ctx.lineWidth = 2 * this.camera.zoom
        this.ctx.setLineDash([10 * this.camera.zoom, 10 * this.camera.zoom])
        this.ctx.beginPath()
        this.ctx.moveTo(screenPos.x - tileWidth / 4, screenPos.y + tileHeight / 4)
        this.ctx.lineTo(screenPos.x + tileWidth / 4, screenPos.y + tileHeight * 3 / 4)
        this.ctx.stroke()
        this.ctx.setLineDash([])
      }
    } else if (config.pattern === 'concrete') {
      // Concrete cracks - use tile position for deterministic rendering
      const shouldHaveCrack = ((tileX * 7 + tileY * 13) % 10) === 0
      if (shouldHaveCrack) {
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
        this.ctx.lineWidth = 0.5 * this.camera.zoom
        this.ctx.beginPath()
        this.ctx.moveTo(screenPos.x - tileWidth / 3, screenPos.y + tileHeight / 3)
        this.ctx.lineTo(screenPos.x + tileWidth / 4, screenPos.y + tileHeight * 2 / 3)
        this.ctx.stroke()
      }
    } else if (config.pattern === 'tech') {
      // Tech panel lines
      this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)'
      this.ctx.lineWidth = 0.5 * this.camera.zoom
      this.ctx.beginPath()
      this.ctx.moveTo(screenPos.x - tileWidth / 3, screenPos.y + tileHeight / 2)
      this.ctx.lineTo(screenPos.x + tileWidth / 3, screenPos.y + tileHeight / 2)
      this.ctx.stroke()
    }
    
    // Add neon glow for certain tiles
    if (config.hasGlow && 'glowColor' in config) {
      this.ctx.shadowColor = config.glowColor as string
      this.ctx.shadowBlur = 10 * this.camera.zoom
      this.ctx.strokeStyle = config.glowColor as string
      this.ctx.lineWidth = 1
      this.ctx.stroke()
      this.ctx.shadowBlur = 0
    }
    
    // Tile edges for depth
    this.ctx.strokeStyle = 'rgba(100, 100, 120, 0.2)'
    this.ctx.lineWidth = 0.5
    this.ctx.stroke()
    
    this.ctx.restore()
  }

  private getGroundType(tileX: number, tileY: number, chunk: any): string {
    // Prefer precomputed tile map if available
    const tileMap = chunk.generatedData?.tileMap || chunk.tileMap
    if (tileMap && tileMap[tileY] && tileMap[tileY][tileX]) {
      return tileMap[tileY][tileX]
    }

    // Fallback: heuristic from roads
    if (chunk.generatedData?.roads) {
      for (const road of chunk.generatedData.roads) {
        const roadDistance = this.getDistanceToRoad(tileX * 50, tileY * 50, road)
        if (roadDistance < 30) return 'street'
        if (roadDistance < 50) return 'sidewalk'
      }
    }

    // Default ground types - use deterministic pattern
    const tileHash = (chunk.x * 1000 + chunk.y * 100 + tileX * 10 + tileY) % 10
    if (tileHash === 0) return 'grass'
    return 'concrete'
  }

  private getDistanceToRoad(x: number, y: number, road: any): number {
    // Simplified distance calculation to road
    if (!road.points || road.points.length === 0) return 1000
    
    let minDistance = 1000
    road.points.forEach((point: any) => {
      const dx = x - point.x
      const dy = y - point.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      minDistance = Math.min(minDistance, distance)
    })
    
    return minDistance
  }

  private processChunkForRendering(chunk: any, viewBounds: any, playerPosition?: { x: number, y: number }) {
    const { buildings, npcs, infrastructure, loot } = chunk.generatedData

    // Add buildings to render queue
    if (buildings && Array.isArray(buildings)) {
      buildings.forEach((building: any) => {
        const bx = building.position?.x ?? building.x ?? 0
        const by = building.position?.y ?? building.y ?? 0
        const objPos = { x: bx, y: by }
        if (this.isInViewBounds(objPos, viewBounds)) {
          const depth = by + (building.size?.y ?? building.height ?? 40)
          this.addToRenderQueue(depth, () => this.renderBuilding3D(building, playerPosition))
        }
      })
    }

    // Add infrastructure (street lights, etc.)
    if (infrastructure && Array.isArray(infrastructure)) {
      infrastructure.forEach((item: any) => {
        const ix = item.position?.x ?? item.x ?? 0
        const iy = item.position?.y ?? item.y ?? 0
        const objPos = { x: ix, y: iy }
        if (this.isInViewBounds(objPos, viewBounds)) {
          const depth = iy
          this.addToRenderQueue(depth, () => this.renderInfrastructure3D(item))
        }
      })
    }

    // Add NPCs to render queue
    if (npcs && Array.isArray(npcs)) {
      npcs.forEach((npc: any) => {
        const nx = npc.position?.x ?? npc.x ?? 0
        const ny = npc.position?.y ?? npc.y ?? 0
        const objPos = { x: nx, y: ny }
        if (this.isInViewBounds(objPos, viewBounds)) {
          const depth = ny
          this.addToRenderQueue(depth, () => this.renderNPC3D(npc))
        }
      })
    }

    // Add loot items
    if (loot && Array.isArray(loot)) {
      loot.forEach((item: any) => {
        const lx = item.position?.x ?? item.x ?? 0
        const ly = item.position?.y ?? item.y ?? 0
        const objPos = { x: lx, y: ly }
        if (this.isInViewBounds(objPos, viewBounds)) {
          const depth = ly
          this.addToRenderQueue(depth, () => this.renderLootItem(item))
        }
      })
    }
  }

  private renderBuilding3D(building: any, playerPosition?: { x: number, y: number }) {
    // Support both legacy and new building shapes
    const bx = (building.position?.x ?? building.x ?? 0)
    const by = (building.position?.y ?? building.y ?? 0)
    const bw = (building.size?.x ?? building.width ?? 40)
    const bd = (building.size?.y ?? building.height ?? 40)
    const h3d = Math.max(2, (building.height ?? 30) / 25) // tiles high

    const baseWorldX = bx / 50 // Convert to tile coordinates
    const baseWorldY = by / 50
    const baseWorldZ = 0

    // Building base
    const basePos = this.worldToIso(baseWorldX, baseWorldY, baseWorldZ)
    const topPos = this.worldToIso(baseWorldX, baseWorldY, h3d)
    
    const buildingWidth = (bw / 50) * this.tileSize * this.camera.zoom
    const buildingDepth = (bd / 50) * this.tileSize * this.camera.zoom

    this.ctx.save()

    // Building proximity for interactivity
    const isNearPlayer = playerPosition && 
      Math.abs(bx - playerPosition.x) < 100 && 
      Math.abs(by - playerPosition.y) < 100

    // Enhanced building colors based on district/type
    const buildingConfigs = {
      tower: {
        baseColor: '#1a1a2e',
        accentColor: '#00ffff',
        windowColor: '#00aaff',
        glowIntensity: 0.8
      },
      office: {
        baseColor: '#2a2a3e',
        accentColor: '#ff00ff',
        windowColor: '#aa88ff',
        glowIntensity: 0.6
      },
      apartment: {
        baseColor: '#3a2a2a',
        accentColor: '#ffaa00',
        windowColor: '#ffdd88',
        glowIntensity: 0.4
      },
      warehouse: {
        baseColor: '#2a3a2a',
        accentColor: '#88ff00',
        windowColor: '#aaffaa',
        glowIntensity: 0.3
      },
      club: {
        baseColor: '#4a1a4a',
        accentColor: '#ff00ff',
        windowColor: '#ff88ff',
        glowIntensity: 1.0
      }
    }

    const config = buildingConfigs[building.type as keyof typeof buildingConfigs] || {
      baseColor: '#2a2a2a',
      accentColor: '#00ffff',
      windowColor: '#88aaff',
      glowIntensity: 0.5
    }

    // Highlight interactive buildings
    if (building.interactive && isNearPlayer) {
      config.glowIntensity *= 1.5
    }

    // Draw building base (floor)
    this.ctx.fillStyle = config.baseColor
    this.ctx.beginPath()
    this.ctx.moveTo(basePos.x, basePos.y)
    this.ctx.lineTo(basePos.x + buildingWidth / 2, basePos.y + buildingDepth / 4)
    this.ctx.lineTo(basePos.x, basePos.y + buildingDepth / 2)
    this.ctx.lineTo(basePos.x - buildingWidth / 2, basePos.y + buildingDepth / 4)
    this.ctx.closePath()
    this.ctx.fill()
    
    // Left wall
    this.ctx.fillStyle = this.darkenColor(config.baseColor, 0.8)
    this.ctx.beginPath()
    this.ctx.moveTo(basePos.x - buildingWidth / 2, basePos.y + buildingDepth / 4)
    this.ctx.lineTo(basePos.x - buildingWidth / 2, topPos.y + buildingDepth / 4)
    this.ctx.lineTo(topPos.x, topPos.y)
    this.ctx.lineTo(basePos.x, basePos.y)
    this.ctx.closePath()
    this.ctx.fill()
    
    // Right wall (lighter)
    this.ctx.fillStyle = config.baseColor
    this.ctx.beginPath()
    this.ctx.moveTo(basePos.x + buildingWidth / 2, basePos.y + buildingDepth / 4)
    this.ctx.lineTo(basePos.x + buildingWidth / 2, topPos.y + buildingDepth / 4)
    this.ctx.lineTo(topPos.x, topPos.y)
    this.ctx.lineTo(basePos.x, basePos.y)
    this.ctx.closePath()
    this.ctx.fill()
    
    // Building roof/top
    this.ctx.fillStyle = this.lightenColor(config.baseColor, 1.2)
    this.ctx.beginPath()
    this.ctx.moveTo(topPos.x, topPos.y)
    this.ctx.lineTo(topPos.x + buildingWidth / 2, topPos.y + buildingDepth / 4)
    this.ctx.lineTo(topPos.x, topPos.y + buildingDepth / 2)
    this.ctx.lineTo(topPos.x - buildingWidth / 2, topPos.y + buildingDepth / 4)
    this.ctx.closePath()
    this.ctx.fill()
    
    // Neon accent lines on edges
    this.ctx.strokeStyle = config.accentColor
    this.ctx.lineWidth = 1.5 * this.camera.zoom
    this.ctx.shadowColor = config.accentColor
    this.ctx.shadowBlur = 10 * this.camera.zoom * config.glowIntensity
    this.ctx.beginPath()
    this.ctx.moveTo(basePos.x, basePos.y)
    this.ctx.lineTo(topPos.x, topPos.y)
    this.ctx.moveTo(basePos.x + buildingWidth / 2, basePos.y + buildingDepth / 4)
    this.ctx.lineTo(topPos.x + buildingWidth / 2, topPos.y + buildingDepth / 4)
    this.ctx.stroke()
    this.ctx.shadowBlur = 0
    
    // Add windows
    const windowRows = Math.max(2, Math.floor(h3d / 0.5))
    const windowCols = Math.max(2, Math.floor(buildingWidth / (30 * this.camera.zoom)))
    
    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        const t = (row + 1) / (windowRows + 1)
        const windowY = basePos.y + (topPos.y - basePos.y) * t
        const windowX = basePos.x - buildingWidth / 3 + (col * buildingWidth / windowCols)
        
        // Window glow
        const windowLit = Math.random() > 0.3 // 70% of windows are lit
        if (windowLit) {
          this.ctx.fillStyle = config.windowColor
          this.ctx.shadowColor = config.windowColor
          this.ctx.shadowBlur = 5 * this.camera.zoom * config.glowIntensity
          this.ctx.fillRect(windowX, windowY, 3 * this.camera.zoom, 4 * this.camera.zoom)
          this.ctx.shadowBlur = 0
        }
      }
    }
    
    // Add neon edge lighting
    this.drawBuildingEdgeLighting(basePos, topPos, buildingWidth, buildingDepth, config)
    
    // Interactive building indicator
    if (building.interactive) {
      this.drawInteractiveIndicator(basePos, buildingWidth, buildingDepth, isNearPlayer || false)
    }

    this.ctx.restore()
  }





  private drawBuildingEdgeLighting(basePos: any, topPos: any, width: number, depth: number, config: any) {
    this.ctx.strokeStyle = config.accentColor
    this.ctx.lineWidth = 2
    this.ctx.shadowColor = config.accentColor
    this.ctx.shadowBlur = 10 * config.glowIntensity
    this.ctx.globalAlpha = 0.8
    
    // Vertical edges
    this.ctx.beginPath()
    this.ctx.moveTo(basePos.x - width / 2, basePos.y)
    this.ctx.lineTo(topPos.x - width / 2, topPos.y)
    this.ctx.moveTo(basePos.x + width / 2, basePos.y)
    this.ctx.lineTo(topPos.x + width / 2, topPos.y)
    this.ctx.moveTo(basePos.x, basePos.y - depth / 4)
    this.ctx.lineTo(topPos.x, topPos.y - depth / 4)
    this.ctx.stroke()
    
    this.ctx.shadowBlur = 0
    this.ctx.globalAlpha = 1
  }

  private drawInteractiveIndicator(basePos: any, width: number, depth: number, isNear: boolean) {
    if (!isNear) return
    
    const pulse = Math.sin(Date.now() * 0.002) * 0.3 + 0.7 // Slower, less intense
    
    this.ctx.save()
    this.ctx.strokeStyle = '#00ff00'
    this.ctx.lineWidth = 3
    this.ctx.globalAlpha = pulse
    this.ctx.shadowColor = '#00ff00'
    this.ctx.shadowBlur = 20
    
    // Draw glowing base outline
    this.ctx.beginPath()
    this.ctx.moveTo(basePos.x - width / 2, basePos.y)
    this.ctx.lineTo(basePos.x, basePos.y - depth / 4)
    this.ctx.lineTo(basePos.x + width / 2, basePos.y)
    this.ctx.lineTo(basePos.x, basePos.y + depth / 4)
    this.ctx.closePath()
    this.ctx.stroke()
    
    // Interactive text
    this.ctx.font = `${10 * this.camera.zoom}px monospace`
    this.ctx.textAlign = 'center'
    this.ctx.fillStyle = '#00ff00'
    this.ctx.fillText('[E] ENTER', basePos.x, basePos.y + depth / 2 + 20)
    
    this.ctx.restore()
  }



  private renderInfrastructure3D(item: any) {
    if (!item || !item.position) return
    
    const screenPos = this.worldToIso(item.position.x / 50, item.position.y / 50, 0)
    
    this.ctx.save()
    
    switch (item.type) {
      case 'streetlight':
        this.renderEnhancedStreetlight(screenPos, item)
        break
      case 'sign':
        this.renderNeonStreetSign(screenPos, item)
        break
      case 'billboard':
        this.renderHologramBillboard(screenPos, item)
        break
      case 'debris':
        this.renderUrbanDebris(screenPos, item)
        break
      default:
        // Fallback to simple streetlight
        this.renderStreetlight3D(item)
    }
    
    this.ctx.restore()
  }

  private renderEnhancedStreetlight(screenPos: any, light: any) {
    const height = (light.height || 15) * this.camera.zoom
    const poleWidth = 2 * this.camera.zoom
    
    // Light pole with gradient
    const poleGradient = this.ctx.createLinearGradient(
      screenPos.x, screenPos.y,
      screenPos.x, screenPos.y - height
    )
    poleGradient.addColorStop(0, '#2a2a3a')
    poleGradient.addColorStop(0.5, '#3a3a4a')
    poleGradient.addColorStop(1, '#4a4a5a')
    
    this.ctx.fillStyle = poleGradient
    this.ctx.fillRect(screenPos.x - poleWidth / 2, screenPos.y - height, poleWidth, height)
    
    // Tech details
    this.ctx.strokeStyle = light.lightColor || '#00ffff'
    this.ctx.lineWidth = 0.5 * this.camera.zoom
    this.ctx.globalAlpha = 0.6
    for (let i = 0; i < 3; i++) {
      const y = screenPos.y - height * (0.2 + i * 0.3)
      this.ctx.beginPath()
      this.ctx.moveTo(screenPos.x - poleWidth / 2, y)
      this.ctx.lineTo(screenPos.x + poleWidth / 2, y)
      this.ctx.stroke()
    }
    this.ctx.globalAlpha = 1
    
    // Light fixture
    const lightColor = light.lightColor || '#ffee88'
    this.ctx.fillStyle = lightColor
    this.ctx.shadowColor = lightColor
    this.ctx.shadowBlur = 20 * this.camera.zoom
    this.ctx.beginPath()
    this.ctx.arc(screenPos.x, screenPos.y - height, 6 * this.camera.zoom, 0, Math.PI * 2)
    this.ctx.fill()
    
    // Light pool on ground
    const poolGradient = this.ctx.createRadialGradient(
      screenPos.x, screenPos.y,
      0,
      screenPos.x, screenPos.y,
      30 * this.camera.zoom
    )
    poolGradient.addColorStop(0, `${lightColor}33`)
    poolGradient.addColorStop(0.5, `${lightColor}1a`)
    poolGradient.addColorStop(1, 'transparent')
    
    this.ctx.shadowBlur = 0
    this.ctx.fillStyle = poolGradient
    this.ctx.beginPath()
    this.ctx.ellipse(screenPos.x, screenPos.y, 30 * this.camera.zoom, 15 * this.camera.zoom, 0, 0, Math.PI * 2)
    this.ctx.fill()
    
    // Add to light sources
    this.lightSources.push({
      x: light.position.x,
      y: light.position.y,
      z: light.height || 15,
      intensity: 0.8,
      color: lightColor,
      radius: 150
    })
  }

  private renderNeonStreetSign(screenPos: any, sign: any) {
    const width = (sign.size?.x || 30) * this.camera.zoom
    const height = (sign.size?.y || 15) * this.camera.zoom
    const text = sign.text || 'NEON CITY'
    
    // Sign backing
    this.ctx.fillStyle = '#1a1a2a'
    this.ctx.fillRect(screenPos.x - width / 2, screenPos.y - height, width, height)
    
    // Neon effect
    const neonColors = ['#ff00ff', '#00ffff', '#ffff00']
    const signColor = neonColors[Math.abs(text.charCodeAt(0)) % 3]
    
    this.ctx.strokeStyle = signColor
    this.ctx.lineWidth = 2 * this.camera.zoom
    this.ctx.shadowColor = signColor
    this.ctx.shadowBlur = 15 * this.camera.zoom
    this.ctx.strokeRect(screenPos.x - width / 2 + 2, screenPos.y - height + 2, width - 4, height - 4)
    
    // Neon text
    this.ctx.font = `bold ${6 * this.camera.zoom}px monospace`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillStyle = signColor
    this.ctx.fillText(text, screenPos.x, screenPos.y - height / 2)
    
    this.ctx.shadowBlur = 0
  }

  private renderHologramBillboard(screenPos: any, billboard: any) {
    const width = (billboard.size?.x || 40) * this.camera.zoom
    const height = (billboard.size?.y || 30) * this.camera.zoom
    const time = Date.now() * 0.001
    
    // Holographic display
    const hologramGradient = this.ctx.createLinearGradient(
      screenPos.x - width / 2, screenPos.y - height,
      screenPos.x + width / 2, screenPos.y
    )
    hologramGradient.addColorStop(0, 'rgba(0, 255, 255, 0.2)')
    hologramGradient.addColorStop(0.5, 'rgba(255, 0, 255, 0.3)')
    hologramGradient.addColorStop(1, 'rgba(0, 255, 255, 0.2)')
    
    this.ctx.fillStyle = hologramGradient
    this.ctx.fillRect(screenPos.x - width / 2, screenPos.y - height, width, height)
    
    // Scanlines
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    this.ctx.lineWidth = 0.5 * this.camera.zoom
    for (let y = 0; y < height; y += 3 * this.camera.zoom) {
      const offset = Math.sin(time + y * 0.1) * 2
      this.ctx.beginPath()
      this.ctx.moveTo(screenPos.x - width / 2 + offset, screenPos.y - height + y)
      this.ctx.lineTo(screenPos.x + width / 2 + offset, screenPos.y - height + y)
      this.ctx.stroke()
    }
    
    // Holographic text
    this.ctx.font = `${8 * this.camera.zoom}px monospace`
    this.ctx.textAlign = 'center'
    this.ctx.fillStyle = '#00ffff'
    this.ctx.shadowColor = '#00ffff'
    this.ctx.shadowBlur = 10 * this.camera.zoom
    this.ctx.globalAlpha = 0.9 + Math.sin(time * 1) * 0.1 // Less flickering
    this.ctx.fillText(billboard.text || 'CYBER CORP', screenPos.x, screenPos.y - height / 2)
    this.ctx.globalAlpha = 1
    this.ctx.shadowBlur = 0
  }

  private renderUrbanDebris(screenPos: any, debris: any) {
    const size = (debris.size || 4) * this.camera.zoom
    const type = debris.debrisType || 'trash'
    
    if (type === 'trash') {
      // Trash and waste
      this.ctx.fillStyle = '#2a2a2a'
      this.ctx.fillRect(screenPos.x - size, screenPos.y - size / 2, size * 2, size)
      
      // Toxic glow
      if (Math.random() < 0.3) {
        this.ctx.fillStyle = '#00ff00'
        this.ctx.shadowColor = '#00ff00'
        this.ctx.shadowBlur = 5 * this.camera.zoom
        this.ctx.fillRect(screenPos.x, screenPos.y - size / 4, size / 3, size / 4)
        this.ctx.shadowBlur = 0
      }
    } else {
      // Scrap metal
      this.ctx.fillStyle = '#3a3a4a'
      this.ctx.beginPath()
      this.ctx.moveTo(screenPos.x - size, screenPos.y)
      this.ctx.lineTo(screenPos.x + size / 2, screenPos.y - size / 2)
      this.ctx.lineTo(screenPos.x + size, screenPos.y)
      this.ctx.lineTo(screenPos.x, screenPos.y + size / 3)
      this.ctx.closePath()
      this.ctx.fill()
    }
  }

  private renderStreetlight3D(light: any) {
    const basePos = this.worldToIso(light.x / 50, light.y / 50, 0)
    const topPos = this.worldToIso(light.x / 50, light.y / 50, 3)
    
    this.ctx.save()
    
    // Light pole
    this.ctx.strokeStyle = '#666666'
    this.ctx.lineWidth = 3 * this.camera.zoom
    this.ctx.beginPath()
    this.ctx.moveTo(basePos.x, basePos.y)
    this.ctx.lineTo(topPos.x, topPos.y)
    this.ctx.stroke()
    
    // Light source
    this.ctx.fillStyle = '#ffee88'
    this.ctx.shadowColor = '#ffee88'
    this.ctx.shadowBlur = 15
    this.ctx.beginPath()
    this.ctx.arc(topPos.x, topPos.y, 6 * this.camera.zoom, 0, Math.PI * 2)
    this.ctx.fill()
    
    this.ctx.restore()

    // Add to light sources for lighting calculations
    this.lightSources.push({
      x: light.x,
      y: light.y,
      z: 150, // Height in world units
      intensity: 0.8,
      color: '#ffee88',
      radius: 200
    })
  }

  private renderNPC3D(npc: any) {
    const nx = npc.position?.x ?? npc.x ?? 0
    const ny = npc.position?.y ?? npc.y ?? 0
    const screenPos = this.worldToIso(nx / 50, ny / 50, 0)
    
    this.ctx.save()
    
    // NPC body with cyberpunk style
    const size = 10 * this.camera.zoom
    
    // Shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    this.ctx.beginPath()
    this.ctx.ellipse(screenPos.x, screenPos.y + size, size * 0.8, size * 0.4, 0, 0, Math.PI * 2)
    this.ctx.fill()
    
    // NPC body color based on type
    const npcColors = {
      guard: '#4444ff',
      civilian: '#44ff44',
      fixer: '#ff44ff',
      thug: '#ff4444',
      scavenger: '#ffaa44',
      default: '#aaaaaa'
    }
    
    const npcColor = npcColors[npc.type as keyof typeof npcColors] || npcColors.default
    
    // Body
    this.ctx.fillStyle = npcColor
    this.ctx.beginPath()
    this.ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2)
    this.ctx.fill()
    
    // Outline
    this.ctx.strokeStyle = '#ffffff'
    this.ctx.lineWidth = 1.5 * this.camera.zoom
    this.ctx.stroke()
    
    // Faction indicator
    if (npc.faction) {
      this.ctx.fillStyle = npc.faction === 'hostile' ? '#ff0000' : '#00ff00'
      this.ctx.beginPath()
      this.ctx.arc(screenPos.x, screenPos.y - size - 5, 2 * this.camera.zoom, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    // Name/Type tag
    this.ctx.font = `${7 * this.camera.zoom}px monospace`
    this.ctx.textAlign = 'center'
    this.ctx.fillStyle = '#ffffff'
    this.ctx.fillText(npc.type?.toUpperCase() || 'NPC', screenPos.x, screenPos.y - size - 10)
    
    // Health bar if damaged
    if (npc.health < 100) {
      const barWidth = 20 * this.camera.zoom
      const barHeight = 2 * this.camera.zoom
      const healthPercent = npc.health / 100
      
      this.ctx.fillStyle = '#333333'
      this.ctx.fillRect(screenPos.x - barWidth / 2, screenPos.y + size + 5, barWidth, barHeight)
      
      this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : '#ff0000'
      this.ctx.fillRect(screenPos.x - barWidth / 2, screenPos.y + size + 5, barWidth * healthPercent, barHeight)
    }
    
    this.ctx.restore()
  }

  private renderLootItem(item: any) {
    const lx = item.position?.x ?? item.x ?? 0
    const ly = item.position?.y ?? item.y ?? 0
    const screenPos = this.worldToIso(lx / 50, ly / 50, 0)
    
    this.ctx.save()
    
    // Loot glow effect
    const pulse = Math.sin(Date.now() * 0.002) * 0.2 + 0.8 // Slower, less intense
    const size = 6 * this.camera.zoom
    
    // Rarity colors
    const rarityColors = {
      common: '#888888',
      uncommon: '#44ff44',
      rare: '#4444ff',
      epic: '#ff44ff',
      legendary: '#ffaa00'
    }
    
    const itemColor = rarityColors[item.rarity as keyof typeof rarityColors] || rarityColors.common
    
    // Glow effect
    this.ctx.shadowColor = itemColor
    this.ctx.shadowBlur = 15 * this.camera.zoom * pulse
    
    // Item icon (diamond shape)
    this.ctx.fillStyle = itemColor
    this.ctx.beginPath()
    this.ctx.moveTo(screenPos.x, screenPos.y - size)
    this.ctx.lineTo(screenPos.x + size, screenPos.y)
    this.ctx.lineTo(screenPos.x, screenPos.y + size)
    this.ctx.lineTo(screenPos.x - size, screenPos.y)
    this.ctx.closePath()
    this.ctx.fill()
    
    // Inner highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    this.ctx.beginPath()
    this.ctx.moveTo(screenPos.x, screenPos.y - size / 2)
    this.ctx.lineTo(screenPos.x + size / 2, screenPos.y)
    this.ctx.lineTo(screenPos.x, screenPos.y + size / 2)
    this.ctx.lineTo(screenPos.x - size / 2, screenPos.y)
    this.ctx.closePath()
    this.ctx.fill()
    
    // Item name on hover (always show for now)
    this.ctx.shadowBlur = 0
    this.ctx.font = `${6 * this.camera.zoom}px monospace`
    this.ctx.textAlign = 'center'
    this.ctx.fillStyle = '#ffffff'
    this.ctx.fillText(item.name || 'Item', screenPos.x, screenPos.y - size - 5)
    
    this.ctx.restore()
  }

  renderPlayers(players: any[]) {
    if (!players || players.length === 0) {
      console.log('IsometricRenderer: No players to render')
      return
    }

    console.log(`IsometricRenderer: Rendering ${players.length} player(s)`, players.map(p => ({id: p.id, pos: p.position})))
    // Render players directly, not in queue (they need to render last/on top)
    players.forEach(p => this.renderPlayer(p))
  }

  renderPlayer(player: any) {
    if (!player || !player.position) return

    // Convert world coordinates to tile coordinates (50 pixels per tile)
    const tileX = player.position.x / 50
    const tileY = player.position.y / 50
    const screenPos = this.worldToIso(tileX, tileY, 0)
    
    console.log(`Rendering player at world (${player.position.x}, ${player.position.y}) -> tile (${tileX}, ${tileY}) -> screen (${screenPos.x}, ${screenPos.y})`)
    
    // Render player directly instead of queueing
    this.ctx.save()
    
    // Enhanced isometric cyberpunk character
    const scale = this.camera.zoom
    const bodyHeight = 24 * scale
    const bodyWidth = 16 * scale
    
    // Calculate player facing direction (if available)
    const direction = player.direction || { x: 0, y: 1 } // Default facing south
    const isFlipped = direction.x < 0
    
    // Shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    this.ctx.beginPath()
    this.ctx.ellipse(screenPos.x, screenPos.y + bodyHeight / 3, bodyWidth / 2, bodyWidth / 4, 0, 0, Math.PI * 2)
    this.ctx.fill()
      
      // Legs (cyber pants)
      const legOffset = 3 * scale
      this.ctx.fillStyle = '#1a1a2e'
      // Left leg
      this.ctx.fillRect(screenPos.x - legOffset - 2 * scale, screenPos.y, 4 * scale, 10 * scale)
      // Right leg  
      this.ctx.fillRect(screenPos.x + legOffset - 2 * scale, screenPos.y + 2 * scale, 4 * scale, 8 * scale)
      
      // Cyber boots with neon trim
      this.ctx.fillStyle = '#2a2a3a'
      this.ctx.fillRect(screenPos.x - legOffset - 2.5 * scale, screenPos.y + 8 * scale, 5 * scale, 4 * scale)
      this.ctx.fillRect(screenPos.x + legOffset - 2.5 * scale, screenPos.y + 8 * scale, 5 * scale, 4 * scale)
      // Neon boot trim
      this.ctx.fillStyle = '#00ffff'
      this.ctx.fillRect(screenPos.x - legOffset - 2 * scale, screenPos.y + 10 * scale, 4 * scale, 1 * scale)
      this.ctx.fillRect(screenPos.x + legOffset - 2 * scale, screenPos.y + 10 * scale, 4 * scale, 1 * scale)
      
      // Body/Torso (cyberpunk jacket)
      const jacketGradient = this.ctx.createLinearGradient(
        screenPos.x - bodyWidth / 2,
        screenPos.y - bodyHeight / 3,
        screenPos.x + bodyWidth / 2,
        screenPos.y + bodyHeight / 4
      )
      jacketGradient.addColorStop(0, '#2a3a4a')
      jacketGradient.addColorStop(0.5, '#1a2a3a')
      jacketGradient.addColorStop(1, '#0a1a2a')
      
      this.ctx.fillStyle = jacketGradient
      this.ctx.beginPath()
      this.ctx.moveTo(screenPos.x - bodyWidth / 3, screenPos.y)
      this.ctx.lineTo(screenPos.x - bodyWidth / 2, screenPos.y - bodyHeight / 4)
      this.ctx.lineTo(screenPos.x - bodyWidth / 3, screenPos.y - bodyHeight / 2)
      this.ctx.lineTo(screenPos.x + bodyWidth / 3, screenPos.y - bodyHeight / 2)
      this.ctx.lineTo(screenPos.x + bodyWidth / 2, screenPos.y - bodyHeight / 4)
      this.ctx.lineTo(screenPos.x + bodyWidth / 3, screenPos.y)
      this.ctx.closePath()
      this.ctx.fill()
      
      // Jacket neon accents
      this.ctx.strokeStyle = '#00ffff'
      this.ctx.lineWidth = 1 * scale
      this.ctx.shadowColor = '#00ffff'
      this.ctx.shadowBlur = 5 * scale
      this.ctx.beginPath()
      this.ctx.moveTo(screenPos.x - bodyWidth / 3, screenPos.y - bodyHeight / 3)
      this.ctx.lineTo(screenPos.x - bodyWidth / 3, screenPos.y)
      this.ctx.moveTo(screenPos.x + bodyWidth / 3, screenPos.y - bodyHeight / 3)
      this.ctx.lineTo(screenPos.x + bodyWidth / 3, screenPos.y)
      this.ctx.stroke()
      this.ctx.shadowBlur = 0
      
      // Arms
      const armOffset = isFlipped ? -1 : 1
      this.ctx.fillStyle = '#2a3a4a'
      // Left arm
      this.ctx.save()
      this.ctx.translate(screenPos.x - bodyWidth / 2.5, screenPos.y - bodyHeight / 3)
      this.ctx.rotate(-0.3 * armOffset)
      this.ctx.fillRect(0, 0, 3 * scale, 10 * scale)
      this.ctx.restore()
      // Right arm (with weapon)
      this.ctx.save()
      this.ctx.translate(screenPos.x + bodyWidth / 2.5, screenPos.y - bodyHeight / 3)
      this.ctx.rotate(0.5 * armOffset)
      this.ctx.fillRect(-3 * scale, 0, 3 * scale, 10 * scale)
      // Cyber weapon in hand
      this.ctx.fillStyle = '#4a4a5a'
      this.ctx.fillRect(-2 * scale, 8 * scale, 4 * scale, 6 * scale)
      // Weapon glow
      this.ctx.fillStyle = '#ff4444'
      this.ctx.shadowColor = '#ff4444'
      this.ctx.shadowBlur = 8 * scale
      this.ctx.fillRect(-1 * scale, 10 * scale, 2 * scale, 2 * scale)
      this.ctx.restore()
      
      // Head
      this.ctx.shadowBlur = 0
      this.ctx.fillStyle = '#d4a574'
      this.ctx.beginPath()
      this.ctx.arc(screenPos.x, screenPos.y - bodyHeight / 1.8, 5 * scale, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Cyberpunk hair/visor
      this.ctx.fillStyle = '#1a1a1a'
      this.ctx.beginPath()
      this.ctx.arc(screenPos.x, screenPos.y - bodyHeight / 1.8, 5 * scale, Math.PI * 1.2, Math.PI * 2.2)
      this.ctx.fill()
      
      // Cyber visor/eyes
      this.ctx.fillStyle = '#00ffff'
      this.ctx.shadowColor = '#00ffff'
      this.ctx.shadowBlur = 10 * scale
      this.ctx.fillRect(screenPos.x - 4 * scale, screenPos.y - bodyHeight / 1.8 - scale, 8 * scale, 2 * scale)
      this.ctx.fillStyle = '#ffffff'
      this.ctx.fillRect(screenPos.x - 3 * scale, screenPos.y - bodyHeight / 1.8 - 0.5 * scale, 6 * scale, 1 * scale)
      this.ctx.shadowBlur = 0
      
      // Player outline glow for visibility
      this.ctx.strokeStyle = '#00ffff'
      this.ctx.lineWidth = 1.5 * scale
      this.ctx.globalAlpha = 0.5
      this.ctx.shadowColor = '#00ffff'
      this.ctx.shadowBlur = 15 * scale
      this.ctx.beginPath()
      this.ctx.moveTo(screenPos.x - bodyWidth / 2, screenPos.y + bodyHeight / 3)
      this.ctx.lineTo(screenPos.x - bodyWidth / 2, screenPos.y - bodyHeight / 2)
      this.ctx.lineTo(screenPos.x + bodyWidth / 2, screenPos.y - bodyHeight / 2)
      this.ctx.lineTo(screenPos.x + bodyWidth / 2, screenPos.y + bodyHeight / 3)
      this.ctx.stroke()
      this.ctx.globalAlpha = 1
      this.ctx.shadowBlur = 0
      
      // Player name tag
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      const nameWidth = (player.username?.length || 6) * 4 * scale
      this.ctx.fillRect(screenPos.x - nameWidth / 2, screenPos.y - bodyHeight - 12 * scale, nameWidth, 10 * scale)
      
      this.ctx.font = `${7 * scale}px monospace`
      this.ctx.textAlign = 'center'
      this.ctx.fillStyle = '#00ff88'
      this.ctx.fillText(player.username || 'Player', screenPos.x, screenPos.y - bodyHeight - 5 * scale)
      
      // Health bar
      const barWidth = 30 * scale
      const barHeight = 3 * scale
      const healthPercent = (player.health || 100) / 100
      
      // Health bar background
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      this.ctx.fillRect(screenPos.x - barWidth / 2, screenPos.y + bodyHeight / 2 + 5 * scale, barWidth, barHeight)
      
      // Health bar fill
      const healthColor = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000'
      this.ctx.fillStyle = healthColor
      this.ctx.fillRect(screenPos.x - barWidth / 2, screenPos.y + bodyHeight / 2 + 5 * scale, barWidth * healthPercent, barHeight)
      
      // Health bar border
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      this.ctx.lineWidth = 0.5 * scale
      this.ctx.strokeRect(screenPos.x - barWidth / 2, screenPos.y + bodyHeight / 2 + 5 * scale, barWidth, barHeight)
    
    this.ctx.restore()
  }

  renderProjectiles(projectiles: any[]) {
    if (!projectiles || projectiles.length === 0) return

    projectiles.forEach((projectile: any) => {
      const screenPos = this.worldToIso(projectile.position.x / 50, projectile.position.y / 50, 0)
      const size = 4 * this.camera.zoom

      this.ctx.save()
      const color = '#ffff80'
      this.ctx.shadowColor = color
      this.ctx.shadowBlur = 8
      this.ctx.fillStyle = color
      this.ctx.beginPath()
      this.ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2)
      this.ctx.fill()
      this.ctx.restore()
    })
  }

  createMuzzleFlash(worldPos: { x: number, y: number }) {
    // Add a short-lived light source at the world position
    this.lightSources.push({
      x: worldPos.x,
      y: worldPos.y,
      z: 50,
      intensity: 1,
      color: '#ffffaa',
      radius: 80
    })
  }

  createExplosion(worldPos: { x: number, y: number }) {
    // Add a stronger light source for explosion
    this.lightSources.push({
      x: worldPos.x,
      y: worldPos.y,
      z: 0,
      intensity: 1,
      color: '#ff6600',
      radius: 200
    })
  }

  public worldToScreen(worldPos: { x: number, y: number, z?: number }): { x: number, y: number } {
    const z = worldPos.z || 0
    return this.worldToIso(worldPos.x / 50, worldPos.y / 50, z / 50)
  }

  public addLight(light: LightSource) {
    this.lightSources.push(light)
  }

  // Fog of War
  private renderFogOfWar(playerPosition?: { x: number, y: number }) {
    if (!this.fogEnabled || !playerPosition) return

    // Reset fog canvas
    this.fogCtx.clearRect(0, 0, this.fogCanvas.width, this.fogCanvas.height)

    // Base darkness layer
    this.fogCtx.globalCompositeOperation = 'source-over'
    this.fogCtx.fillStyle = `rgba(0,0,0,${this.fogDensity})`
    this.fogCtx.fillRect(0, 0, this.fogCanvas.width, this.fogCanvas.height)

    // Reveal around player
    const playerScreen = this.worldToIso(playerPosition.x / 50, playerPosition.y / 50, 0)
    const playerRadius = Math.max(120, this.fogRadius) * this.camera.zoom

    const playerGrad = this.fogCtx.createRadialGradient(
      playerScreen.x, playerScreen.y, playerRadius * 0.3,
      playerScreen.x, playerScreen.y, playerRadius
    )
    playerGrad.addColorStop(0, 'rgba(255,255,255,1)')
    playerGrad.addColorStop(1, 'rgba(255,255,255,0)')

    this.fogCtx.globalCompositeOperation = 'destination-out'
    this.fogCtx.fillStyle = playerGrad
    this.fogCtx.beginPath()
    this.fogCtx.arc(playerScreen.x, playerScreen.y, playerRadius, 0, Math.PI * 2)
    this.fogCtx.fill()

    // Reveal around lights (smaller than actual light radius)
    this.lightSources.forEach(light => {
      const screenPos = this.worldToIso(light.x / 50, light.y / 50, light.z / 50)
      const r = Math.max(60, light.radius * 0.6) * this.camera.zoom
      const grad = this.fogCtx.createRadialGradient(
        screenPos.x, screenPos.y, r * 0.3,
        screenPos.x, screenPos.y, r
      )
      grad.addColorStop(0, `rgba(255,255,255,${Math.min(1, light.intensity + 0.2)})`)
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      this.fogCtx.fillStyle = grad
      this.fogCtx.beginPath()
      this.fogCtx.arc(screenPos.x, screenPos.y, r, 0, Math.PI * 2)
      this.fogCtx.fill()
    })

    // Composite fog onto main canvas (darken)
    this.ctx.save()
    this.ctx.globalCompositeOperation = 'multiply'
    this.ctx.drawImage(this.fogCanvas, 0, 0)
    this.ctx.restore()
  }

  setFogEnabled(enabled: boolean) {
    this.fogEnabled = enabled
  }

  setFogParams(density: number, radius: number) {
    this.fogDensity = Math.max(0, Math.min(1, density))
    this.fogRadius = Math.max(50, radius)
  }

  // Lighting and shadow systems
  private renderShadows() {
    // Pre-render shadows to shadow canvas
    this.shadowCtx.fillStyle = 'rgba(0,0,0,0.6)'
    this.shadowCtx.fillRect(0, 0, this.shadowCanvas.width, this.shadowCanvas.height)
  }

  private renderLighting() {
    this.ctx.save()
    
    // First: Apply ambient cyberpunk atmosphere
    this.ctx.globalCompositeOperation = 'multiply'
    const ambientGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height)
    ambientGradient.addColorStop(0, 'rgba(20, 10, 40, 0.7)') // Dark purple top
    ambientGradient.addColorStop(0.5, 'rgba(30, 15, 50, 0.5)')
    ambientGradient.addColorStop(1, 'rgba(40, 20, 60, 0.3)') // Lighter bottom
    this.ctx.fillStyle = ambientGradient
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Second: Additive neon light sources
    this.ctx.globalCompositeOperation = 'screen'
    
    this.lightSources.forEach(light => {
      const screenPos = this.worldToIso(light.x / 50, light.y / 50, light.z / 50)
      const radius = light.radius * this.camera.zoom
      
      // Multi-layer glow for neon effect
      for (let layer = 0; layer < 2; layer++) {
        const layerRadius = radius * (1 + layer * 0.5)
        const layerAlpha = light.intensity * (1 - layer * 0.4)
        
        const gradient = this.ctx.createRadialGradient(
          screenPos.x, screenPos.y, 0,
          screenPos.x, screenPos.y, layerRadius
        )
        
        // Create color with proper alpha blending
        const alpha1 = Math.floor(layerAlpha * 200).toString(16).padStart(2, '0')
        const alpha2 = Math.floor(layerAlpha * 100).toString(16).padStart(2, '0')
        const alpha3 = Math.floor(layerAlpha * 30).toString(16).padStart(2, '0')
        
        gradient.addColorStop(0, `${light.color}${alpha1}`)
        gradient.addColorStop(0.5, `${light.color}${alpha2}`)
        gradient.addColorStop(1, `${light.color}${alpha3}`)
        
        this.ctx.fillStyle = gradient
        this.ctx.beginPath()
        this.ctx.arc(screenPos.x, screenPos.y, layerRadius, 0, Math.PI * 2)
        this.ctx.fill()
      }
      
      // Bright core for strong lights
      if (light.intensity > 0.7) {
        this.ctx.fillStyle = `rgba(255, 255, 255, ${light.intensity * 0.2})`
        this.ctx.beginPath()
        this.ctx.arc(screenPos.x, screenPos.y, 3 * this.camera.zoom, 0, Math.PI * 2)
        this.ctx.fill()
      }
    })
    
    // Third: Atmospheric effects
    this.renderCyberpunkAtmosphere()
    
    this.ctx.restore()
  }

  private renderCyberpunkAtmosphere() {
    const time = Date.now() * 0.00005 // Slower animation
    
    // Subtle animated mist
    this.ctx.globalCompositeOperation = 'screen'
    this.ctx.globalAlpha = 0.05 // Less intense
    
    const mistGradient = this.ctx.createLinearGradient(
      0, this.canvas.height * (0.5 + Math.sin(time) * 0.1),
      this.canvas.width, this.canvas.height
    )
    mistGradient.addColorStop(0, 'rgba(100, 200, 255, 0.1)')
    mistGradient.addColorStop(0.5, 'rgba(255, 100, 200, 0.05)')
    mistGradient.addColorStop(1, 'rgba(200, 100, 255, 0.1)')
    
    this.ctx.fillStyle = mistGradient
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Animated rain/ash particles
    this.ctx.globalAlpha = 0.4
    this.ctx.fillStyle = 'rgba(150, 180, 200, 0.6)'
    for (let i = 0; i < 30; i++) {
      const x = (i * 37 + time * 150) % this.canvas.width
      const y = (i * 53 + time * 300) % this.canvas.height
      this.ctx.fillRect(x, y, 1, 3)
    }
    
    this.ctx.globalAlpha = 1
  }

  private clearLights() {
    this.lightSources = []
  }

  // Utility methods
  private getViewBounds() {
    const topLeft = this.screenToWorld(0, 0)
    const bottomRight = this.screenToWorld(this.canvas.width, this.canvas.height)
    
    // Expand view bounds significantly to prevent culling issues
    const margin = 500 // pixels of margin
    return {
      left: topLeft.x - margin,
      right: bottomRight.x + margin,
      top: topLeft.y - margin,
      bottom: bottomRight.y + margin
    }
  }

  private isChunkInView(chunk: any, viewBounds: any): boolean {
    const chunkSize = 1000 // world units per chunk
    const chunkLeft = chunk.x * chunkSize
    const chunkRight = (chunk.x + 1) * chunkSize
    const chunkTop = chunk.y * chunkSize
    const chunkBottom = (chunk.y + 1) * chunkSize
    
    return !(chunkRight < viewBounds.left ||
             chunkLeft > viewBounds.right ||
             chunkBottom < viewBounds.top ||
             chunkTop > viewBounds.bottom)
  }

  private isInViewBounds(obj: any, viewBounds: any): boolean {
    // obj.x and obj.y are already in world pixels
    return obj.x >= viewBounds.left && obj.x <= viewBounds.right &&
           obj.y >= viewBounds.top && obj.y <= viewBounds.bottom
  }


  private lightenColor(color: string, _factor: number = 1.3): string {
    // Simple color lightening
    const colors = {
      '#4a4a70': '#6a6a90',
      '#6a4a4a': '#8a6a6a',
      '#4a6a4a': '#6a8a6a',
      '#4a4a6a': '#6a6a8a'
    }
    return colors[color as keyof typeof colors] || color
  }

  private darkenColor(color: string, _factor: number = 0.7): string {
    // Simple color darkening
    const colors = {
      '#4a4a70': '#3a3a60',
      '#6a4a4a': '#5a3a3a',
      '#4a6a4a': '#3a5a3a',
      '#4a4a6a': '#3a3a5a'
    }
    return colors[color as keyof typeof colors] || color
  }

  // Camera controls
  setCamera(x: number, y: number, zoom: number) {
    // Store camera center in world tile units (x, y are already in tile coordinates)
    this.camera.x = x
    this.camera.y = y
    this.camera.zoom = Math.max(0.5, Math.min(4, zoom))
    console.log(`Renderer: Camera set to (${x}, ${y}) with zoom ${zoom}`)
  }

  getCamera() {
    return { ...this.camera }
  }

  // Resize handling
  resize(width: number, height: number) {
    this.canvas.width = width
    this.canvas.height = height
    this.shadowCanvas.width = width
    this.shadowCanvas.height = height
    this.fogCanvas.width = width
    this.fogCanvas.height = height
  }
}