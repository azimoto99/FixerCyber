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
  private camera: { x: number; y: number; zoom: number } = { x: 0, y: 0, zoom: 2 }
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
    
    // Ground tile colors based on type
    const colors = {
      street: '#2a2a2a',
      sidewalk: '#3a3a3a',
      grass: '#1a3a1a',
      concrete: '#4a4a4a',
      dirt: '#3a2a1a',
      building: '#2f2f2f',
      door: '#5a4a3a' // slightly warmer brown to stand out
    }
    
    this.ctx.fillStyle = colors[groundType as keyof typeof colors] || colors.concrete
    
    // Draw isometric tile
    this.ctx.beginPath()
    this.ctx.moveTo(screenPos.x, screenPos.y)
    this.ctx.lineTo(screenPos.x + tileWidth / 2, screenPos.y + tileHeight / 2)
    this.ctx.lineTo(screenPos.x, screenPos.y + tileHeight)
    this.ctx.lineTo(screenPos.x - tileWidth / 2, screenPos.y + tileHeight / 2)
    this.ctx.closePath()
    this.ctx.fill()
    
    // Add subtle tile outline only for non-street
    if (groundType !== 'street') {
      this.ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      this.ctx.lineWidth = 0.5
      this.ctx.stroke()
    }
    
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

    // Default ground types
    if (Math.random() < 0.1) return 'grass'
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
    const { buildings, npcs, infrastructure } = chunk.generatedData

    // Add buildings to render queue
    if (buildings) {
      buildings.forEach((building: any) => {
        if (this.isInViewBounds(building, viewBounds)) {
          const depth = building.y + building.height // Depth sorting by bottom edge
          this.addToRenderQueue(depth, () => this.renderBuilding3D(building, playerPosition))
        }
      })
    }

    // Add infrastructure (street lights, etc.)
    if (infrastructure) {
      infrastructure.forEach((item: any) => {
        if (this.isInViewBounds(item, viewBounds)) {
          const depth = item.y
          this.addToRenderQueue(depth, () => this.renderInfrastructure3D(item))
        }
      })
    }

    // Add NPCs to render queue
    if (npcs) {
      npcs.forEach((npc: any) => {
        if (this.isInViewBounds(npc, viewBounds)) {
          const depth = npc.y
          this.addToRenderQueue(depth, () => this.renderNPC3D(npc))
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

    // Building color based on type and interactability
    const isNearPlayer = playerPosition && 
      Math.abs(bx - playerPosition.x) < 100 && 
      Math.abs(by - playerPosition.y) < 100

    let buildingColor = this.getBuildingColor(building.type)
    if (building.interactive && isNearPlayer) {
      buildingColor = this.lightenColor(buildingColor)
    }

    // Draw building walls (isometric cube effect)
    this.drawBuildingWalls(basePos, topPos, buildingWidth, buildingDepth, buildingColor, h3d)
    
    // Add windows and details
    this.drawBuildingWindows3D(basePos, { x: buildingWidth, y: buildingDepth }, building, h3d)
    
    // Add neon signs for interactive buildings
    if (building.interactive) {
      this.drawNeonSign(basePos, buildingWidth, building.type)
    }

    this.ctx.restore()
  }

  private drawBuildingWalls(basePos: any, topPos: any, width: number, depth: number, color: string, _height: number) {
    // Left wall
    this.ctx.fillStyle = this.darkenColor(color)
    this.ctx.beginPath()
    this.ctx.moveTo(basePos.x - width / 2, basePos.y)
    this.ctx.lineTo(topPos.x - width / 2, topPos.y)
    this.ctx.lineTo(topPos.x, topPos.y - depth / 4)
    this.ctx.lineTo(basePos.x, basePos.y - depth / 4)
    this.ctx.closePath()
    this.ctx.fill()

    // Right wall
    this.ctx.fillStyle = this.darkenColor(color, 0.8)
    this.ctx.beginPath()
    this.ctx.moveTo(basePos.x, basePos.y - depth / 4)
    this.ctx.lineTo(topPos.x, topPos.y - depth / 4)
    this.ctx.lineTo(topPos.x + width / 2, topPos.y)
    this.ctx.lineTo(basePos.x + width / 2, basePos.y)
    this.ctx.closePath()
    this.ctx.fill()

    // Top face
    this.ctx.fillStyle = color
    this.ctx.beginPath()
    this.ctx.moveTo(topPos.x - width / 2, topPos.y)
    this.ctx.lineTo(topPos.x, topPos.y - depth / 4)
    this.ctx.lineTo(topPos.x + width / 2, topPos.y)
    this.ctx.lineTo(topPos.x, topPos.y + depth / 4)
    this.ctx.closePath()
    this.ctx.fill()

    // Add building outline
    this.ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    this.ctx.lineWidth = 1
    this.ctx.stroke()
  }

  private drawBuildingWindows3D(basePos: any, size: any, building: any, height: number) {
    if (size.x < 40 || size.y < 40) return

    const windowSize = 6 * this.camera.zoom
    const windowSpacing = 12 * this.camera.zoom
    
    // Windows on left wall
    for (let y = 0; y < height * 10; y += windowSpacing) {
      for (let x = -size.x / 4; x < size.x / 4; x += windowSpacing) {
        const isLit = Math.random() > 0.4
        const windowColor = isLit ? (building.hackable ? '#ff6600' : '#ffdd00') : '#1a1a1a'
        
        this.ctx.fillStyle = windowColor
        this.ctx.fillRect(
          basePos.x + x - windowSize / 2,
          basePos.y - y - windowSize / 2,
          windowSize,
          windowSize / 2
        )

        if (isLit) {
          // Add glow effect for lit windows
          this.ctx.shadowColor = windowColor
          this.ctx.shadowBlur = 4
          this.ctx.fillRect(
            basePos.x + x - windowSize / 2,
            basePos.y - y - windowSize / 2,
            windowSize,
            windowSize / 2
          )
          this.ctx.shadowBlur = 0
        }
      }
    }
  }

  private drawNeonSign(basePos: any, buildingWidth: number, buildingType: string) {
    const signs = {
      shop: '$ SHOP $',
      safehouse: '◊ SAFE ◊',
      hack: '◊ HACK ◊',
      mission: '! JOBS !',
      bar: '♦ BAR ♦'
    }

    const signText = signs[buildingType as keyof typeof signs] || '◊ ??? ◊'
    
    this.ctx.save()
    this.ctx.font = `${8 * this.camera.zoom}px monospace`
    this.ctx.textAlign = 'center'
    
    // Neon glow effect
    this.ctx.shadowColor = '#00ffff'
    this.ctx.shadowBlur = 10
    this.ctx.fillStyle = '#00ffff'
    
    this.ctx.fillText(
      signText,
      basePos.x,
      basePos.y - buildingWidth / 2 - 20 * this.camera.zoom
    )
    
    this.ctx.restore()
  }

  private renderInfrastructure3D(item: any) {
    if (item.type === 'streetlight') {
      this.renderStreetlight3D(item)
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
    const screenPos = this.worldToIso(npc.x / 50, npc.y / 50, 0)
    
    this.ctx.save()
    
    // Simple NPC representation
    const size = 8 * this.camera.zoom
    this.ctx.fillStyle = npc.hostile ? '#ff4444' : '#44ff44'
    this.ctx.beginPath()
    this.ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2)
    this.ctx.fill()
    
    // Name tag
    if (npc.name) {
      this.ctx.font = `${6 * this.camera.zoom}px monospace`
      this.ctx.textAlign = 'center'
      this.ctx.fillStyle = '#ffffff'
      this.ctx.fillText(npc.name, screenPos.x, screenPos.y - size - 5)
    }
    
    this.ctx.restore()
  }

  renderPlayers(players: any[]) {
    if (!players) return

    players.forEach(p => this.renderPlayer(p))
  }

  renderPlayer(player: any) {
    if (!player || !player.position) return

    const screenPos = this.worldToIso(player.position.x / 50, player.position.y / 50, 0)
    const depth = player.position.y // For depth sorting

    this.addToRenderQueue(depth, () => {
      this.ctx.save()
      
      // Player character (cyberpunk style)
      const size = 12 * this.camera.zoom
      
      // Body
      this.ctx.fillStyle = '#00aaff'
      this.ctx.beginPath()
      this.ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Cyber glow effect
      this.ctx.shadowColor = '#00aaff'
      this.ctx.shadowBlur = 10
      this.ctx.fillStyle = '#ffffff'
      this.ctx.beginPath()
      this.ctx.arc(screenPos.x, screenPos.y, size / 2, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Player name
      this.ctx.shadowBlur = 0
      this.ctx.font = `${8 * this.camera.zoom}px monospace`
      this.ctx.textAlign = 'center'
      this.ctx.fillStyle = '#ffffff'
      this.ctx.fillText(player.username || 'Player', screenPos.x, screenPos.y - size - 8)
      
      // Health bar
      const barWidth = 20 * this.camera.zoom
      const barHeight = 3 * this.camera.zoom
      const healthPercent = (player.health || 100) / 100
      
      this.ctx.fillStyle = '#444444'
      this.ctx.fillRect(screenPos.x - barWidth / 2, screenPos.y + size + 5, barWidth, barHeight)
      
      this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000'
      this.ctx.fillRect(screenPos.x - barWidth / 2, screenPos.y + size + 5, barWidth * healthPercent, barHeight)
      
      this.ctx.restore()
    })
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
    this.ctx.globalCompositeOperation = 'screen'
    
    this.lightSources.forEach(light => {
      const screenPos = this.worldToIso(light.x / 50, light.y / 50, light.z / 50)
      const radius = light.radius * this.camera.zoom
      
      const gradient = this.ctx.createRadialGradient(
        screenPos.x, screenPos.y, 0,
        screenPos.x, screenPos.y, radius
      )
      
      gradient.addColorStop(0, `${light.color}${Math.floor(light.intensity * 255).toString(16).padStart(2, '0')}`)
      gradient.addColorStop(1, `${light.color}00`)
      
      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2)
      this.ctx.fill()
    })
    
    this.ctx.restore()
  }

  private clearLights() {
    this.lightSources = []
  }

  // Utility methods
  private getViewBounds() {
    const topLeft = this.screenToWorld(0, 0)
    const bottomRight = this.screenToWorld(this.canvas.width, this.canvas.height)
    
    return {
      left: topLeft.x - 5,
      right: bottomRight.x + 5,
      top: topLeft.y - 5,
      bottom: bottomRight.y + 5
    }
  }

  private isChunkInView(chunk: any, viewBounds: any): boolean {
    const chunkSize = 20 // tiles
    return !(chunk.x * chunkSize > viewBounds.right ||
             (chunk.x + 1) * chunkSize < viewBounds.left ||
             chunk.y * chunkSize > viewBounds.bottom ||
             (chunk.y + 1) * chunkSize < viewBounds.top)
  }

  private isInViewBounds(obj: any, viewBounds: any): boolean {
    const objTileX = obj.x / 50
    const objTileY = obj.y / 50
    
    return objTileX >= viewBounds.left && objTileX <= viewBounds.right &&
           objTileY >= viewBounds.top && objTileY <= viewBounds.bottom
  }

  private getBuildingColor(type: string): string {
    const colors = {
      residential: '#4a4a70',
      commercial: '#6a4a4a',
      industrial: '#4a6a4a',
      shop: '#4a4a6a',
      safehouse: '#6a6a4a',
      hack: '#4a6a6a',
      mission: '#6a4a6a'
    }
    return colors[type as keyof typeof colors] || '#4a4a4a'
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
    // Store camera center in world tile units
    this.camera.x = x / 50
    this.camera.y = y / 50
    this.camera.zoom = Math.max(0.5, Math.min(4, zoom))
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