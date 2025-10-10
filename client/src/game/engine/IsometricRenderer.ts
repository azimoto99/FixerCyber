// Isometric renderer for Diablo-style gameplay
export interface IsometricTile {
  x: number;
  y: number;
  z: number;
  type: 'ground' | 'wall' | 'building' | 'object' | 'decoration';
  texture: string;
  walkable: boolean;
  interactive?: boolean;
  id?: string;
}

export interface IsometricObject {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  type: string;
  color: string;
  castShadow: boolean;
  interactive?: boolean;
  id?: string;
}

export interface LightSource {
  x: number;
  y: number;
  z: number;
  intensity: number;
  color: string;
  radius: number;
}

export class IsometricRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: { x: number; y: number; zoom: number } = { x: 0, y: 0, zoom: 2.7 };
  private tileSize = 64;
  // private renderQueue: { depth: number; render: () => void }[] = [];
  // private _lightSources: LightSource[] = [];
  private shadowCanvas: HTMLCanvasElement;
  private shadowCtx: CanvasRenderingContext2D;
  private fogCanvas: HTMLCanvasElement;
  // private _fogCtx: CanvasRenderingContext2D;
  // private _fogEnabled: boolean = true;
  // private _fogDensity: number = 0.6;
  // private _fogRadius: number = 220;
  
  // Performance monitoring
  private performanceStats = {
    fps: 0,
    frameTime: 0,
    renderTime: 0,
    culledItems: 0,
    renderedItems: 0,
    totalItems: 0
  };
  private lastFrameTime = 0;
  private frameCount = 0;
  private lastFpsUpdate = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.shadowCanvas = document.createElement('canvas');
    this.shadowCanvas.width = canvas.width;
    this.shadowCanvas.height = canvas.height;
    this.shadowCtx = this.shadowCanvas.getContext('2d')!;
    this.fogCanvas = document.createElement('canvas');
    this.fogCanvas.width = canvas.width;
    this.fogCanvas.height = canvas.height;
    // this._fogCtx = this.fogCanvas.getContext('2d')!;
    this.setupRenderer();
  }
  private setupRenderer() {
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  // Converts world tile coords to isometric screen coords
  private worldToIso(worldX: number, worldY: number, worldZ: number = 0): { x: number, y: number } {
    const isoX = (worldX - worldY) * (this.tileSize / 2) * this.camera.zoom;
    const isoY = (worldX + worldY) * (this.tileSize / 4) * this.camera.zoom - (worldZ * this.tileSize / 2) * this.camera.zoom;
    const camIsoX = (this.camera.x - this.camera.y) * (this.tileSize / 2) * this.camera.zoom;
    const camIsoY = (this.camera.x + this.camera.y) * (this.tileSize / 4) * this.camera.zoom;
    return {
      x: isoX + this.canvas.width / 2 - camIsoX,
      y: isoY + this.canvas.height / 2 - camIsoY
    };
  }

  // Convert screen coords to world coords (centered, isometric)
  screenToWorld(screenX: number, screenY: number): { x: number, y: number } {
    const camIsoX = (this.camera.x - this.camera.y) * (this.tileSize / 2) * this.camera.zoom;
    const camIsoY = (this.camera.x + this.camera.y) * (this.tileSize / 4) * this.camera.zoom;
    const adjustedX = (screenX - this.canvas.width / 2 + camIsoX) / this.camera.zoom;
    const adjustedY = (screenY - this.canvas.height / 2 + camIsoY) / this.camera.zoom;
    const worldTileX = (adjustedX / (this.tileSize / 2) + adjustedY / (this.tileSize / 4)) / 2;
    const worldTileY = (adjustedY / (this.tileSize / 4) - adjustedX / (this.tileSize / 2)) / 2;
    return { x: worldTileX * 50, y: worldTileY * 50 };
  }

  clear() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(1, '#1a1a2e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // this.renderQueue = [];
    this.shadowCtx.clearRect(0, 0, this.shadowCanvas.width, this.shadowCanvas.height);
  }


  private renderGroundTiles(chunks: any[], viewBounds: any) {
    chunks.forEach(chunk => {
      if (!this.isChunkInView(chunk, viewBounds)) return;
      const chunkSize = 1000;
      const tilesPerChunk = 20;
      const tileWorldSize = chunkSize / tilesPerChunk;
      
      // Batch render tiles for better performance
      this.ctx.save();
      
      for (let tileX = 0; tileX < tilesPerChunk; tileX++) {
        for (let tileY = 0; tileY < tilesPerChunk; tileY++) {
          const worldX = chunk.x * chunkSize + tileX * tileWorldSize;
          const worldY = chunk.y * chunkSize + tileY * tileWorldSize;
          this.renderGroundTile(worldX / tileWorldSize, worldY / tileWorldSize, this.getGroundType(tileX, tileY, chunk));
        }
      }
      
      this.ctx.restore();
    });
  }

  private renderGroundTile(tileX: number, tileY: number, groundType: string) {
    const screenPos = this.worldToIso(tileX, tileY, 0);
    const tileWidth = this.tileSize * this.camera.zoom;
    const tileHeight = (this.tileSize / 2) * this.camera.zoom;
    
    this.ctx.save();
    
    // Base color based on ground type
    let baseColor = '#31313e'; // Default
    let borderColor = '#404040';
    
    switch (groundType) {
      case 'street':
        baseColor = '#2a2a2a';
        borderColor = '#333333';
        break;
      case 'sidewalk':
        baseColor = '#3a3a4a';
        borderColor = '#4a4a5a';
        break;
      case 'concrete':
        baseColor = '#4a4a5a';
        borderColor = '#5a5a6a';
        break;
      case 'grass':
        baseColor = '#2d4a2d';
        borderColor = '#3d5a3d';
        break;
    }
    
    // Draw isometric diamond tile
    this.ctx.fillStyle = baseColor;
    this.ctx.beginPath();
    this.ctx.moveTo(screenPos.x, screenPos.y - tileHeight/2);
    this.ctx.lineTo(screenPos.x + tileWidth/2, screenPos.y);
    this.ctx.lineTo(screenPos.x, screenPos.y + tileHeight/2);
    this.ctx.lineTo(screenPos.x - tileWidth/2, screenPos.y);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Add subtle border
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 0.5;
    this.ctx.beginPath();
    this.ctx.moveTo(screenPos.x, screenPos.y - tileHeight/2);
    this.ctx.lineTo(screenPos.x + tileWidth/2, screenPos.y);
    this.ctx.lineTo(screenPos.x, screenPos.y + tileHeight/2);
    this.ctx.lineTo(screenPos.x - tileWidth/2, screenPos.y);
    this.ctx.closePath();
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  private getGroundType(tileX: number, tileY: number, chunk: any): string {
    const tileMap = chunk.generatedData?.tileMap || chunk.tileMap;
    if (tileMap && tileMap[tileY] && tileMap[tileY][tileX]) return tileMap[tileY][tileX];
    if (chunk.generatedData?.roads) return tileX % 2 === 0 ? 'street' : 'sidewalk';
    return 'concrete';
  }

  // private _processChunkForRendering(chunk: any, viewBounds: any, _playerPosition?: { x: number, y: number }) {
  //   const { buildings, _npcs, _infrastructure, _loot } = chunk.generatedData || {};
  //   if (buildings && Array.isArray(buildings)) {
  //     buildings.forEach((building: any) => {
  //       if (this.isInViewBounds({ x: building.position?.x ?? building.x, y: building.position?.y ?? building.y }, viewBounds)) {
  //         const depth = (building.position?.y ?? building.y ?? 0) + (building.size?.y ?? building.height ?? 40);
  //         this.addToRenderQueue(depth, () => this.renderBuilding3D(building, _playerPosition));
  //       }
  //     });
  //   }
  //   // TODO: Render infrastructure, NPCs, loot with similar culling
  // }

  // private addToRenderQueue(depth: number, renderFunc: () => void) {
  //   this.renderQueue.push({ depth, render: renderFunc });
  // }

  // private _processRenderQueue() {
  //   this.renderQueue.sort((a, b) => a.depth - b.depth);
  //   this.renderQueue.forEach(item => item.render());
  // }

  // private renderBuilding3D(building: any, _playerPosition?: { x: number, y: number }) {
  //   const bx = building.position?.x ?? building.x ?? 0;
  //   const by = building.position?.y ?? building.y ?? 0;
  //   const bw = building.size?.x ?? building.width ?? 40;
  //   const bd = building.size?.y ?? building.height ?? 40;
  //   const baseWorldX = bx / 50;
  //   const baseWorldY = by / 50;
  //   const baseWorldZ = 0;
  //   const basePos = this.worldToIso(baseWorldX, baseWorldY, baseWorldZ);
  //   const buildingWidth = (bw / 50) * this.tileSize * this.camera.zoom;
  //   const buildingDepth = (bd / 50) * this.tileSize * this.camera.zoom;
  //   this.ctx.save();
  //   this.ctx.fillStyle = '#29294b';
  //   this.ctx.beginPath();
  //   this.ctx.moveTo(basePos.x, basePos.y);
  //   this.ctx.lineTo(basePos.x + buildingWidth / 2, basePos.y + buildingDepth / 4);
  //   this.ctx.lineTo(basePos.x, basePos.y + buildingDepth / 2);
  //   this.ctx.lineTo(basePos.x - buildingWidth / 2, basePos.y + buildingDepth / 4);
  //   this.ctx.closePath();
  //   this.ctx.fill();
  //   this.ctx.restore();
  // }


  renderPlayer(player: any) {
    if (!player || !player.position) return;
    const tileX = player.position.x / 50;
    const tileY = player.position.y / 50;
    const screenPos = this.worldToIso(tileX, tileY, 0);
    
    this.ctx.save();
    
    // Player body (larger, more visible)
    this.ctx.fillStyle = '#42fff5';
    this.ctx.shadowColor = '#42fff5';
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, 15, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Player outline
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, 15, 0, Math.PI * 2);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  renderWithLighting() {
    // Place holder for lighting post-process. Could add neon or fog overlays here.
  }

  renderFogOfWar(_playerPosition?: { x: number; y: number }) { /* No-op for now */ }
  renderLighting() { /* No-op for now */ }
  clearLights() { /* this._lightSources = []; */ }
  updateFrameStats() { }

  getViewBounds() {
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.canvas.width, this.canvas.height);
    const margin = 500;
    return {
      left: topLeft.x - margin,
      right: bottomRight.x + margin,
      top: topLeft.y - margin,
      bottom: bottomRight.y + margin,
    };
  }
  isChunkInView(chunk: any, viewBounds: any): boolean {
    const chunkSize = 1000;
    const chunkLeft = chunk.x * chunkSize;
    const chunkRight = (chunk.x + 1) * chunkSize;
    const chunkTop = chunk.y * chunkSize;
    const chunkBottom = (chunk.y + 1) * chunkSize;
    return !(chunkRight < viewBounds.left ||
             chunkLeft > viewBounds.right ||
             chunkBottom < viewBounds.top ||
             chunkTop > viewBounds.bottom);
  }
  isInViewBounds(obj: any, viewBounds: any): boolean {
    return obj.x >= viewBounds.left && obj.x <= viewBounds.right &&
           obj.y >= viewBounds.top && obj.y <= viewBounds.bottom;
  }

  setCamera(x: number, y: number, zoom: number) {
    this.camera.x = x;
    this.camera.y = y;
    this.camera.zoom = Math.max(0.5, Math.min(4, zoom));
    console.log(`Renderer: Camera set to (${x}, ${y}) with zoom ${zoom}`);
  }

  getCamera() { return { ...this.camera }; }

  // Missing methods that GameEngine expects
  worldToScreen(worldPos: { x: number, y: number }): { x: number, y: number } {
    return this.worldToIso(worldPos.x, worldPos.y, 0);
  }

  setCameraPosition(position: { x: number, y: number }) {
    this.camera.x = position.x;
    this.camera.y = position.y;
    console.log(`Camera position set to: (${position.x}, ${position.y})`);
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.shadowCanvas.width = width;
    this.shadowCanvas.height = height;
    this.fogCanvas.width = width;
    this.fogCanvas.height = height;
  }

  // Missing methods that GameEngine expects
  renderProjectiles(projectiles: any[]) {
    if (!projectiles || projectiles.length === 0) return

    this.ctx.save()
    
    projectiles.forEach(projectile => {
      if (!projectile || !projectile.position) return
      
      const screenPos = this.worldToIso(projectile.position.x, projectile.position.y, 0)
      
      // Don't render if off-screen
      if (!this.isInViewBounds({ x: projectile.position.x, y: projectile.position.y }, { left: 0, right: this.canvas.width, top: 0, bottom: this.canvas.height })) return
      
      this.ctx.save()
      
      // Projectile trail effect
      this.ctx.strokeStyle = '#ff4444'
      this.ctx.lineWidth = 2
      this.ctx.shadowColor = '#ff4444'
      this.ctx.shadowBlur = 8
      
      this.ctx.beginPath()
      this.ctx.arc(screenPos.x, screenPos.y, 3, 0, Math.PI * 2)
      this.ctx.fillStyle = '#ff6666'
      this.ctx.fill()
      this.ctx.stroke()
      
      this.ctx.restore()
    })
    
    this.ctx.restore()
  }

  setCameraTarget(target: any) {
    if (!target) return
    
    // Smooth camera following
    const targetX = target.x || target.position?.x || 0
    const targetY = target.y || target.position?.y || 0
    
    // Coordinates are already in tile units from GameEngine
    const tileX = targetX
    const tileY = targetY
    
    // Update camera position
    this.camera.x = tileX
    this.camera.y = tileY
    
    console.log(`Camera target set to: (${tileX}, ${tileY})`)
  }

  updateCameraSystem(_deltaTime: number) {
    // Update camera system - this can be expanded for smooth following
    // For now, just ensure camera is properly positioned
    this.updateCamera()
  }

  // Performance monitoring methods
  updatePerformanceStats() {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    
    this.frameCount++;
    this.performanceStats.frameTime = deltaTime;
    
    // Update FPS every second
    if (currentTime - this.lastFpsUpdate >= 1000) {
      this.performanceStats.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
    }
  }

  getPerformanceStats() {
    return { ...this.performanceStats };
  }

  resetPerformanceStats() {
    this.performanceStats.culledItems = 0;
    this.performanceStats.renderedItems = 0;
    this.performanceStats.totalItems = 0;
  }

  // Enhanced camera update method
  private updateCamera() {
    // Reset canvas context to identity
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    
    // No additional transformations needed - worldToIso handles camera positioning
    // This method is kept for compatibility but doesn't apply transformations
  }

  // Method to render the complete game world
  renderWorld(chunks: any[], buildings: any[], infrastructure: any[], npcs: any[], loot: any[]) {
    this.ctx.save()
    
    // Camera transformation is already applied by updateCamera()
    
    // Render ground tiles
    this.renderGroundTiles(chunks, { left: 0, right: this.canvas.width, top: 0, bottom: this.canvas.height })
    
    // Render buildings
    if (buildings && buildings.length > 0) {
      buildings.forEach(building => {
        if (building && building.position) {
          this.renderBuildingItem(building)
        }
      })
    }
    
    // Render infrastructure
    if (infrastructure && infrastructure.length > 0) {
      infrastructure.forEach(item => {
        if (item && item.position) {
          this.renderInfrastructureItem(item)
        }
      })
    }
    
    // Render NPCs
    if (npcs && npcs.length > 0) {
      npcs.forEach(npc => {
        if (npc && npc.position) {
          this.renderNPCItem(npc)
        }
      })
    }
    
    // Render loot
    if (loot && loot.length > 0) {
      loot.forEach(item => {
        if (item && item.position) {
          this.renderLootItem(item)
        }
      })
    }
    
    this.ctx.restore()
  }

  // Method to render players
  renderPlayersList(players: any[]) {
    if (!players || players.length === 0) return
    
    this.ctx.save()
    // Camera transformation is already applied by updateCamera()
    
    players.forEach(player => {
      if (player && player.position) {
        this.renderPlayer(player)
      }
    })
    
    this.ctx.restore()
  }

  // Alias for GameEngine compatibility
  renderPlayers(players: any[]) {
    this.renderPlayersList(players);
  }

  // Enhanced render method that GameEngine calls
  render(worldData: any) {
    const renderStartTime = performance.now();
    
    try {
      // Update performance stats
      this.updatePerformanceStats();
      this.resetPerformanceStats();
      
      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      
      // Apply camera transformation
      this.updateCamera()
      
      // Render world if data is provided
      if (worldData) {
        this.renderWorld(
          worldData.chunks || [],
          worldData.buildings || [],
          worldData.infrastructure || [],
          worldData.npcs || [],
          worldData.loot || []
        )
        
        // Render players
        if (worldData.players) {
          this.renderPlayersList(worldData.players)
        }
        
        // Render projectiles
        if (worldData.projectiles) {
          this.renderProjectiles(worldData.projectiles)
        }
      }
      
      // Render atmospheric effects
      this.renderCyberpunkAtmosphere()
      
      // Update render time
      this.performanceStats.renderTime = performance.now() - renderStartTime;
      
    } catch (error) {
      console.error('IsometricRenderer: Error in render:', error)
    }
  }

  // Missing rendering methods
  renderBuildingItem(building: any) {
    if (!building || !building.position) return
    
    const screenPos = this.worldToIso(building.position.x, building.position.y, 0)
    
    // Don't render if off-screen
    if (!this.isInViewBounds({ x: building.position.x, y: building.position.y }, { left: 0, right: this.canvas.width, top: 0, bottom: this.canvas.height })) return
    
    this.ctx.save()
    
    const width = 40
    const height = 30
    const depth = 20
    
    // Building base (isometric diamond)
    this.ctx.fillStyle = building.color || '#444444'
    this.ctx.beginPath()
    this.ctx.moveTo(screenPos.x, screenPos.y - height/2)
    this.ctx.lineTo(screenPos.x + width/2, screenPos.y)
    this.ctx.lineTo(screenPos.x, screenPos.y + height/2)
    this.ctx.lineTo(screenPos.x - width/2, screenPos.y)
    this.ctx.closePath()
    this.ctx.fill()
    
    // Building top (isometric roof)
    this.ctx.fillStyle = building.color || '#555555'
    this.ctx.beginPath()
    this.ctx.moveTo(screenPos.x, screenPos.y - height/2 - depth)
    this.ctx.lineTo(screenPos.x + width/2, screenPos.y - depth)
    this.ctx.lineTo(screenPos.x, screenPos.y + height/2 - depth)
    this.ctx.lineTo(screenPos.x - width/2, screenPos.y - depth)
    this.ctx.closePath()
    this.ctx.fill()
    
    // Building outline
    this.ctx.strokeStyle = '#777777'
    this.ctx.lineWidth = 1
    this.ctx.beginPath()
    this.ctx.moveTo(screenPos.x, screenPos.y - height/2)
    this.ctx.lineTo(screenPos.x + width/2, screenPos.y)
    this.ctx.lineTo(screenPos.x, screenPos.y + height/2)
    this.ctx.lineTo(screenPos.x - width/2, screenPos.y)
    this.ctx.closePath()
    this.ctx.stroke()
    
    this.ctx.restore()
  }

  renderInfrastructureItem(item: any) {
    if (!item || !item.position) return
    
    const screenPos = this.worldToIso(item.position.x, item.position.y, 0)
    
    // Don't render if off-screen
    if (!this.isInViewBounds({ x: item.position.x, y: item.position.y }, { left: 0, right: this.canvas.width, top: 0, bottom: this.canvas.height })) return
    
    this.ctx.save()
    
    // Render different infrastructure types
    if (item.type === 'streetlight') {
      // Street light pole
      this.ctx.strokeStyle = '#666666'
      this.ctx.lineWidth = 3
      this.ctx.beginPath()
      this.ctx.moveTo(screenPos.x, screenPos.y)
      this.ctx.lineTo(screenPos.x, screenPos.y - 20)
      this.ctx.stroke()
      
      // Light
      this.ctx.fillStyle = '#ffff88'
      this.ctx.shadowColor = '#ffff88'
      this.ctx.shadowBlur = 8
      this.ctx.beginPath()
      this.ctx.arc(screenPos.x, screenPos.y - 20, 4, 0, Math.PI * 2)
      this.ctx.fill()
    } else if (item.type === 'sign') {
      // Street sign
      this.ctx.fillStyle = '#444444'
      this.ctx.fillRect(screenPos.x - 8, screenPos.y - 12, 16, 8)
      this.ctx.strokeStyle = '#666666'
      this.ctx.lineWidth = 1
      this.ctx.strokeRect(screenPos.x - 8, screenPos.y - 12, 16, 8)
    } else {
      // Default infrastructure
      this.ctx.fillStyle = item.color || '#444444'
      this.ctx.fillRect(screenPos.x - 4, screenPos.y - 4, 8, 8)
    }
    
    this.ctx.restore()
  }

  renderNPCItem(npc: any) {
    if (!npc || !npc.position) return
    
    const screenPos = this.worldToIso(npc.position.x, npc.position.y, 0)
    
    // Don't render if off-screen
    if (!this.isInViewBounds({ x: npc.position.x, y: npc.position.y }, { left: 0, right: this.canvas.width, top: 0, bottom: this.canvas.height })) return
    
    this.ctx.save()
    
    // NPC character
    this.ctx.fillStyle = npc.color || '#888888'
    this.ctx.beginPath()
    this.ctx.arc(screenPos.x, screenPos.y, 8, 0, Math.PI * 2)
    this.ctx.fill()
    
    // NPC outline
    this.ctx.strokeStyle = '#666666'
    this.ctx.lineWidth = 1
    this.ctx.stroke()
    
    this.ctx.restore()
  }

  renderLootItem(item: any) {
    if (!item || !item.position) return
    
    const screenPos = this.worldToIso(item.position.x, item.position.y, 0)
    
    // Don't render if off-screen
    if (!this.isInViewBounds({ x: item.position.x, y: item.position.y }, { left: 0, right: this.canvas.width, top: 0, bottom: this.canvas.height })) return
    
    this.ctx.save()
    
    // Loot item with glow effect
    this.ctx.shadowColor = '#00ff00'
    this.ctx.shadowBlur = 8
    this.ctx.fillStyle = item.color || '#00ff00'
    this.ctx.fillRect(screenPos.x - 4, screenPos.y - 4, 8, 8)
    
    this.ctx.restore()
  }

  renderCyberpunkAtmosphere() {
    // Add atmospheric effects like fog, rain, etc.
    this.ctx.save()
    
    // Simple fog effect
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2
    )
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)')
    
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    
    this.ctx.restore()
  }
}
