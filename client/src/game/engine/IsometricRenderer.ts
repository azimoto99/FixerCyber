// Core isometric renderer with proper coordinate conversion
import { Vector2 } from '../utils/Vector2';
import { Camera } from './Camera';

export interface Sprite {
  position: Vector2;
  size: Vector2;
  color: string;
  depth: number;
  id?: string;
  layer?: RenderLayer;
  height?: number; // Height above ground for depth calculation
  alpha?: number; // Transparency (0-1)
  zIndex?: number; // Manual z-index override
}

export enum RenderLayer {
  GROUND = 0,
  OBJECTS = 1,
  CHARACTERS = 2,
  EFFECTS = 3,
  UI = 4
}

export interface RenderItem {
  depth: number;
  layer: RenderLayer;
  zIndex: number;
  alpha: number;
  render: () => void;
  id?: string;
  bounds?: ViewportBounds; // For culling optimization
}

export interface PerformanceStats {
  fps: number;
  frameTime: number;
  renderTime: number;
  culledItems: number;
  renderedItems: number;
  totalItems: number;
  memoryUsage?: number;
}

export interface CullingBounds {
  position: Vector2;
  size: Vector2;
}

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Core isometric renderer implementing proper 2:1 pixel ratio isometric projection
 * with coordinate conversion, camera system, and basic sprite rendering
 */
export class IsometricRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private tileSize: number = 64; // Base tile size for isometric projection
  private renderQueue: RenderItem[] = [];
  
  // Performance monitoring
  private performanceStats: PerformanceStats = {
    fps: 0,
    frameTime: 0,
    renderTime: 0,
    culledItems: 0,
    renderedItems: 0,
    totalItems: 0
  };
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private fpsUpdateTime: number = 0;
  
  // Culling optimization
  private cullingEnabled: boolean = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = context;

    // Initialize camera
    this.camera = new Camera({
      position: new Vector2(0, 0),
      zoom: 1.0,
      followSpeed: 0.1
    });

    this.setupRenderer();
  }

  private setupRenderer(): void {
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  /**
   * Convert world coordinates to isometric screen coordinates
   * Implements proper 2:1 pixel ratio isometric projection
   */
  worldToScreen(worldPos: Vector2): Vector2 {
    const cameraPos = this.camera.getPosition();
    const zoom = this.camera.getZoom();
    
    // Apply isometric transformation with 2:1 ratio
    const isoX = (worldPos.x - worldPos.y) * (this.tileSize / 2) * zoom;
    const isoY = (worldPos.x + worldPos.y) * (this.tileSize / 4) * zoom;

    // Apply camera offset
    const cameraIsoX = (cameraPos.x - cameraPos.y) * (this.tileSize / 2) * zoom;
    const cameraIsoY = (cameraPos.x + cameraPos.y) * (this.tileSize / 4) * zoom;

    return new Vector2(
      isoX + this.canvas.width / 2 - cameraIsoX,
      isoY + this.canvas.height / 2 - cameraIsoY
    );
  }

  /**
   * Convert screen coordinates to world coordinates
   * Used for mouse interaction and input handling
   */
  screenToWorld(screenPos: Vector2): Vector2 {
    const cameraPos = this.camera.getPosition();
    const zoom = this.camera.getZoom();
    
    // Apply camera offset
    const cameraIsoX = (cameraPos.x - cameraPos.y) * (this.tileSize / 2) * zoom;
    const cameraIsoY = (cameraPos.x + cameraPos.y) * (this.tileSize / 4) * zoom;

    const adjustedX = (screenPos.x - this.canvas.width / 2 + cameraIsoX) / zoom;
    const adjustedY = (screenPos.y - this.canvas.height / 2 + cameraIsoY) / zoom;

    // Convert from isometric back to world coordinates
    const worldX = (adjustedX / (this.tileSize / 2) + adjustedY / (this.tileSize / 4)) / 2;
    const worldY = (adjustedY / (this.tileSize / 4) - adjustedX / (this.tileSize / 2)) / 2;

    return new Vector2(worldX, worldY);
  }

  /**
   * Update camera position with smooth following
   */
  updateCamera(targetPosition?: Vector2, deltaTime: number = 1): void {
    if (targetPosition) {
      this.camera.setTarget(targetPosition);
    }
    this.camera.update(deltaTime);
  }

  /**
   * Set camera position directly
   */
  setCameraPosition(position: Vector2): void {
    this.camera.setPosition(position);
  }

  /**
   * Set camera zoom level
   */
  setCameraZoom(zoom: number): void {
    this.camera.setZoom(zoom);
  }

  /**
   * Get current camera position
   */
  getCameraPosition(): Vector2 {
    return this.camera.getPosition();
  }

  /**
   * Get current camera zoom
   */
  getCameraZoom(): number {
    return this.camera.getZoom();
  }

  /**
   * Calculate viewport bounds in world coordinates for culling
   */
  getViewportBounds(): ViewportBounds {
    const topLeft = this.screenToWorld(new Vector2(0, 0));
    const bottomRight = this.screenToWorld(new Vector2(this.canvas.width, this.canvas.height));
    
    // Add padding for smooth transitions
    const padding = 100 / this.camera.getZoom();
    
    return {
      minX: Math.min(topLeft.x, bottomRight.x) - padding,
      maxX: Math.max(topLeft.x, bottomRight.x) + padding,
      minY: Math.min(topLeft.y, bottomRight.y) - padding,
      maxY: Math.max(topLeft.y, bottomRight.y) + padding
    };
  }

  /**
   * Check if a position is within the viewport bounds
   */
  isInViewport(position: Vector2, bounds?: ViewportBounds): boolean {
    const viewBounds = bounds || this.getViewportBounds();
    return position.x >= viewBounds.minX && 
           position.x <= viewBounds.maxX && 
           position.y >= viewBounds.minY && 
           position.y <= viewBounds.maxY;
  }

  /**
   * Check if a sprite with bounds is within the viewport (for culling)
   */
  isSpriteInViewport(sprite: Sprite, viewBounds?: ViewportBounds): boolean {
    if (!this.cullingEnabled) return true;
    
    const bounds = viewBounds || this.getViewportBounds();
    const spriteSize = sprite.size || new Vector2(32, 32);
    const halfSize = spriteSize.multiply(0.5);
    
    // Check if sprite bounds intersect with viewport bounds
    const spriteMinX = sprite.position.x - halfSize.x;
    const spriteMaxX = sprite.position.x + halfSize.x;
    const spriteMinY = sprite.position.y - halfSize.y;
    const spriteMaxY = sprite.position.y + halfSize.y;
    
    return !(spriteMaxX < bounds.minX || 
             spriteMinX > bounds.maxX || 
             spriteMaxY < bounds.minY || 
             spriteMinY > bounds.maxY);
  }

  /**
   * Enable or disable viewport culling
   */
  setCullingEnabled(enabled: boolean): void {
    this.cullingEnabled = enabled;
  }

  /**
   * Set culling padding for smoother transitions
   */
  setCullingPadding(_padding: number): void {
    // Padding is now handled directly in getViewportBounds()
  }

  /**
   * Clear the canvas and render queue
   */
  clear(): void {
    // Clear canvas with dark background
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Clear render queue
    this.renderQueue = [];
  }

  /**
   * Calculate depth based on Y-position and height for proper isometric sorting
   */
  private calculateDepth(position: Vector2, height: number = 0): number {
    // In isometric view, objects further down (higher Y) and higher up (higher height) 
    // should be rendered later (on top)
    return position.y + height * 0.1; // Height contributes less to depth than Y position
  }

  /**
   * Add sprite to render queue with enhanced depth sorting and layering
   */
  addToRenderQueue(sprite: Sprite): void {
    const layer = sprite.layer ?? RenderLayer.OBJECTS;
    const height = sprite.height ?? 0;
    const alpha = sprite.alpha ?? 1.0;
    const zIndex = sprite.zIndex ?? 0;
    
    // Calculate depth based on position and height
    const calculatedDepth = this.calculateDepth(sprite.position, height);
    
    // Use provided depth or calculated depth
    const finalDepth = sprite.depth !== undefined ? sprite.depth : calculatedDepth;
    
    this.renderQueue.push({
      depth: finalDepth,
      layer: layer,
      zIndex: zIndex,
      alpha: alpha,
      render: () => this.renderSprite(sprite),
      id: sprite.id
    });
  }

  /**
   * Add a custom render item to the queue
   */
  addRenderItem(item: Omit<RenderItem, 'render'> & { render: () => void }): void {
    this.renderQueue.push(item);
  }

  /**
   * Add render item by layer for organized rendering
   */
  addToLayer(layer: RenderLayer, depth: number, renderFunc: () => void, options: {
    alpha?: number;
    zIndex?: number;
    id?: string;
  } = {}): void {
    this.renderQueue.push({
      depth,
      layer,
      zIndex: options.zIndex ?? 0,
      alpha: options.alpha ?? 1.0,
      render: renderFunc,
      id: options.id
    });
  }

  /**
   * Render a sprite with isometric alignment and height support
   */
  private renderSprite(sprite: Sprite): void {
    const basePos = sprite.position;
    const height = sprite.height ?? 0;
    
    // Calculate position with height offset
    const renderPos = new Vector2(basePos.x, basePos.y - height);
    const screenPos = this.worldToScreen(renderPos);
    const size = sprite.size.multiply(this.camera.getZoom());

    this.ctx.save();
    this.ctx.fillStyle = sprite.color;
    
    // Apply alpha if specified (note: alpha is handled by processRenderQueue)
    if (sprite.alpha !== undefined && sprite.alpha < 1.0) {
      this.ctx.globalAlpha = sprite.alpha;
    }
    
    // Draw isometric-aligned rectangle
    this.ctx.fillRect(
      screenPos.x - size.x / 2,
      screenPos.y - size.y / 2,
      size.x,
      size.y
    );
    
    // Draw height indicator for debugging (if height > 0)
    if (height > 0) {
      const baseScreenPos = this.worldToScreen(basePos);
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = 1;
      
      // Use dashed line if available, otherwise solid line
      if (typeof this.ctx.setLineDash === 'function') {
        this.ctx.setLineDash([2, 2]);
      }
      
      this.ctx.beginPath();
      this.ctx.moveTo(baseScreenPos.x, baseScreenPos.y);
      this.ctx.lineTo(screenPos.x, screenPos.y);
      this.ctx.stroke();
      
      // Reset line dash if available
      if (typeof this.ctx.setLineDash === 'function') {
        this.ctx.setLineDash([]);
      }
    }
    
    this.ctx.restore();
  }

  /**
   * Process render queue with enhanced depth sorting, layering, and viewport culling
   */
  processRenderQueue(): void {
    const renderStartTime = performance.now();
    
    // Update performance stats
    this.performanceStats.totalItems = this.renderQueue.length;
    
    // Apply viewport culling if enabled
    let itemsToRender = this.renderQueue;
    if (this.cullingEnabled) {
      // For now, render all items since we don't have bounds info for custom render items
      // In a real implementation, you'd store bounds with each render item
      itemsToRender = this.renderQueue; // TODO: Implement proper culling for render items
      
      this.performanceStats.culledItems = this.renderQueue.length - itemsToRender.length;
    } else {
      this.performanceStats.culledItems = 0;
    }
    
    this.performanceStats.renderedItems = itemsToRender.length;
    
    // Sort by layer first, then by zIndex, then by depth (back to front)
    itemsToRender.sort((a, b) => {
      // Primary sort: layer (ground first, UI last)
      if (a.layer !== b.layer) {
        return a.layer - b.layer;
      }
      
      // Secondary sort: zIndex (lower values render first)
      if (a.zIndex !== b.zIndex) {
        return a.zIndex - b.zIndex;
      }
      
      // Tertiary sort: depth (back to front for proper isometric ordering)
      return a.depth - b.depth;
    });
    
    // Render all queued items with proper alpha blending
    itemsToRender.forEach(item => {
      this.ctx.save();
      
      // Apply alpha blending if needed
      if (item.alpha < 1.0) {
        this.ctx.globalAlpha = item.alpha;
      }
      
      // Render the item
      item.render();
      
      this.ctx.restore();
    });
    
    // Update render time
    this.performanceStats.renderTime = performance.now() - renderStartTime;
    
    // Clear queue after rendering
    this.renderQueue = [];
  }

  /**
   * Process render queue by layers for more control
   */
  processRenderQueueByLayers(): void {
    // Group items by layer
    const layerGroups = new Map<RenderLayer, RenderItem[]>();
    
    this.renderQueue.forEach(item => {
      if (!layerGroups.has(item.layer)) {
        layerGroups.set(item.layer, []);
      }
      layerGroups.get(item.layer)!.push(item);
    });
    
    // Process each layer in order
    const layerOrder = [
      RenderLayer.GROUND,
      RenderLayer.OBJECTS,
      RenderLayer.CHARACTERS,
      RenderLayer.EFFECTS,
      RenderLayer.UI
    ];
    
    layerOrder.forEach(layer => {
      const items = layerGroups.get(layer);
      if (!items) return;
      
      // Sort items within layer by zIndex then depth
      items.sort((a, b) => {
        if (a.zIndex !== b.zIndex) {
          return a.zIndex - b.zIndex;
        }
        return a.depth - b.depth;
      });
      
      // Render items in this layer
      items.forEach(item => {
        this.ctx.save();
        
        if (item.alpha < 1.0) {
          this.ctx.globalAlpha = item.alpha;
        }
        
        item.render();
        
        this.ctx.restore();
      });
    });
    
    // Clear queue after rendering
    this.renderQueue = [];
  }

  /**
   * Update performance statistics and FPS counter
   */
  updatePerformanceStats(): void {
    const currentTime = performance.now();
    
    // Calculate frame time
    if (this.lastFrameTime > 0) {
      this.performanceStats.frameTime = currentTime - this.lastFrameTime;
    }
    
    this.lastFrameTime = currentTime;
    this.frameCount++;
    
    // Update FPS every second
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.performanceStats.fps = Math.round((this.frameCount * 1000) / (currentTime - this.fpsUpdateTime));
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
      
      // Update memory usage if available
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        this.performanceStats.memoryUsage = memInfo.usedJSHeapSize / (1024 * 1024); // MB
      }
    }
  }

  /**
   * Get current performance statistics
   */
  getPerformanceStats(): PerformanceStats {
    return { ...this.performanceStats };
  }

  /**
   * Get render statistics for debugging
   */
  getRenderStats(): {
    totalItems: number;
    itemsByLayer: Record<string, number>;
    itemsByAlpha: { opaque: number; transparent: number };
  } {
    const stats = {
      totalItems: this.renderQueue.length,
      itemsByLayer: {} as Record<string, number>,
      itemsByAlpha: { opaque: 0, transparent: 0 }
    };
    
    this.renderQueue.forEach(item => {
      // Count by layer
      const layerName = RenderLayer[item.layer];
      stats.itemsByLayer[layerName] = (stats.itemsByLayer[layerName] || 0) + 1;
      
      // Count by alpha
      if (item.alpha >= 1.0) {
        stats.itemsByAlpha.opaque++;
      } else {
        stats.itemsByAlpha.transparent++;
      }
    });
    
    return stats;
  }

  /**
   * Render performance overlay for debugging
   */
  renderPerformanceOverlay(): void {
    const stats = this.getPerformanceStats();
    const padding = 10;
    const lineHeight = 16;
    let y = padding;

    this.ctx.save();
    
    // Semi-transparent background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(padding, padding, 200, 120);
    
    // Text styling
    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'left';
    
    // Performance metrics
    y += lineHeight;
    this.ctx.fillText(`FPS: ${stats.fps}`, padding + 5, y);
    
    y += lineHeight;
    this.ctx.fillText(`Frame: ${stats.frameTime.toFixed(2)}ms`, padding + 5, y);
    
    y += lineHeight;
    this.ctx.fillText(`Render: ${stats.renderTime.toFixed(2)}ms`, padding + 5, y);
    
    y += lineHeight;
    this.ctx.fillText(`Items: ${stats.renderedItems}/${stats.totalItems}`, padding + 5, y);
    
    y += lineHeight;
    this.ctx.fillText(`Culled: ${stats.culledItems}`, padding + 5, y);
    
    if (stats.memoryUsage !== undefined) {
      y += lineHeight;
      this.ctx.fillText(`Memory: ${stats.memoryUsage.toFixed(1)}MB`, padding + 5, y);
    }
    
    this.ctx.restore();
  }

  /**
   * Render a simple isometric tile for testing
   */
  renderTile(worldPos: Vector2, color: string = '#404040'): void {
    const screenPos = this.worldToScreen(worldPos);
    const tileWidth = this.tileSize * this.camera.getZoom();
    const tileHeight = (this.tileSize / 2) * this.camera.getZoom();

    this.ctx.save();
    this.ctx.fillStyle = color;
    
    // Draw diamond-shaped isometric tile
    this.ctx.beginPath();
    this.ctx.moveTo(screenPos.x, screenPos.y - tileHeight / 2);
    this.ctx.lineTo(screenPos.x + tileWidth / 2, screenPos.y);
    this.ctx.lineTo(screenPos.x, screenPos.y + tileHeight / 2);
    this.ctx.lineTo(screenPos.x - tileWidth / 2, screenPos.y);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Add border for visibility
    this.ctx.strokeStyle = '#606060';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  /**
   * Render grid for debugging and visualization
   */
  renderGrid(gridSize: number = 10, color: string = '#202020'): void {
    const bounds = this.getViewportBounds();
    
    for (let x = Math.floor(bounds.minX / gridSize) * gridSize; x <= bounds.maxX; x += gridSize) {
      for (let y = Math.floor(bounds.minY / gridSize) * gridSize; y <= bounds.maxY; y += gridSize) {
        this.renderTile(new Vector2(x, y), color);
      }
    }
  }

  /**
   * Get canvas dimensions
   */
  getCanvasSize(): Vector2 {
    return new Vector2(this.canvas.width, this.canvas.height);
  }

  /**
   * Resize canvas and update internal state
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.setupRenderer();
  }
}