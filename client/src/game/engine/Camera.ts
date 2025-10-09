// Camera system for isometric rendering with smooth following
import { Vector2 } from '../utils/Vector2';

export interface CameraConfig {
  position?: Vector2;
  zoom?: number;
  followSpeed?: number;
  minZoom?: number;
  maxZoom?: number;
}

/**
 * Camera system with smooth following and viewport management
 */
export class Camera {
  public position: Vector2;
  public zoom: number;
  public followSpeed: number;
  public minZoom: number;
  public maxZoom: number;
  
  private targetPosition?: Vector2;
  private targetZoom?: number;

  constructor(config: CameraConfig = {}) {
    this.position = config.position?.clone() || new Vector2(0, 0);
    this.zoom = config.zoom || 1.0;
    this.followSpeed = config.followSpeed || 0.1;
    this.minZoom = config.minZoom || 0.1;
    this.maxZoom = config.maxZoom || 5.0;
  }

  /**
   * Set camera position directly (no smooth following)
   */
  setPosition(position: Vector2): void {
    this.position = position.clone();
    this.targetPosition = undefined;
  }

  /**
   * Set target position for smooth following
   */
  setTarget(position: Vector2): void {
    this.targetPosition = position.clone();
  }

  /**
   * Set zoom level with clamping
   */
  setZoom(zoom: number): void {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    this.targetZoom = undefined;
  }

  /**
   * Set target zoom for smooth zooming
   */
  setTargetZoom(zoom: number): void {
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
  }

  /**
   * Update camera position and zoom with smooth interpolation
   */
  update(deltaTime: number = 1): void {
    // Smooth position following
    if (this.targetPosition) {
      const diff = this.targetPosition.subtract(this.position);
      const movement = diff.multiply(this.followSpeed * deltaTime);
      
      // Stop following when close enough
      if (diff.magnitude < 0.01) {
        this.position = this.targetPosition.clone();
        this.targetPosition = undefined;
      } else {
        this.position = this.position.add(movement);
      }
    }

    // Smooth zoom
    if (this.targetZoom !== undefined) {
      const zoomDiff = this.targetZoom - this.zoom;
      const zoomMovement = zoomDiff * this.followSpeed * deltaTime;
      
      // Stop zooming when close enough
      if (Math.abs(zoomDiff) < 0.001) {
        this.zoom = this.targetZoom;
        this.targetZoom = undefined;
      } else {
        this.zoom += zoomMovement;
      }
    }
  }

  /**
   * Get current position
   */
  getPosition(): Vector2 {
    return this.position.clone();
  }

  /**
   * Get current zoom
   */
  getZoom(): number {
    return this.zoom;
  }

  /**
   * Check if camera is currently following a target
   */
  isFollowing(): boolean {
    return this.targetPosition !== undefined;
  }

  /**
   * Check if camera is currently zooming to a target
   */
  isZooming(): boolean {
    return this.targetZoom !== undefined;
  }

  /**
   * Stop all camera movement
   */
  stop(): void {
    this.targetPosition = undefined;
    this.targetZoom = undefined;
  }

  /**
   * Move camera by offset
   */
  move(offset: Vector2): void {
    this.position = this.position.add(offset);
    this.targetPosition = undefined;
  }

  /**
   * Zoom by factor
   */
  zoomBy(factor: number): void {
    this.setZoom(this.zoom * factor);
  }

  /**
   * Get camera bounds in world coordinates for a given canvas size
   */
  getWorldBounds(canvasWidth: number, canvasHeight: number, tileSize: number = 64): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    // Calculate how much world space is visible
    const halfWidth = (canvasWidth / 2) / this.zoom;
    const halfHeight = (canvasHeight / 2) / this.zoom;
    
    // Convert screen bounds to world bounds using inverse isometric transformation
    const screenToWorldScale = 2 / tileSize; // Inverse of tileSize/2 scaling
    
    return {
      minX: this.position.x - halfWidth * screenToWorldScale,
      maxX: this.position.x + halfWidth * screenToWorldScale,
      minY: this.position.y - halfHeight * screenToWorldScale,
      maxY: this.position.y + halfHeight * screenToWorldScale
    };
  }
}