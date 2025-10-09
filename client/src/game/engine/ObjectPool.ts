// Object pooling system for performance optimization
import { Vector2 } from '../utils/Vector2';

export interface Poolable {
  reset(): void;
  isActive(): boolean;
  setActive(active: boolean): void;
}

/**
 * Generic object pool for reusing objects to reduce garbage collection
 */
export class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;
  private activeCount: number = 0;

  constructor(createFn: () => T, initialSize: number = 10, maxSize: number = 100, resetFn?: (obj: T) => void) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      const obj = this.createFn();
      obj.setActive(false);
      this.pool.push(obj);
    }
  }

  /**
   * Get an object from the pool
   */
  acquire(): T | null {
    // Find inactive object in pool
    for (const obj of this.pool) {
      if (!obj.isActive()) {
        obj.setActive(true);
        this.activeCount++;
        return obj;
      }
    }

    // Create new object if pool not at max capacity
    if (this.pool.length < this.maxSize) {
      const obj = this.createFn();
      obj.setActive(true);
      this.pool.push(obj);
      this.activeCount++;
      return obj;
    }

    // Pool is full and no inactive objects available
    return null;
  }

  /**
   * Return an object to the pool
   */
  release(obj: T): void {
    if (!obj.isActive()) return;

    obj.reset();
    if (this.resetFn) {
      this.resetFn(obj);
    }
    obj.setActive(false);
    this.activeCount--;
  }

  /**
   * Release all active objects
   */
  releaseAll(): void {
    this.pool.forEach(obj => {
      if (obj.isActive()) {
        this.release(obj);
      }
    });
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalSize: number;
    activeCount: number;
    inactiveCount: number;
    utilizationPercent: number;
  } {
    const inactiveCount = this.pool.length - this.activeCount;
    return {
      totalSize: this.pool.length,
      activeCount: this.activeCount,
      inactiveCount,
      utilizationPercent: this.pool.length > 0 ? (this.activeCount / this.pool.length) * 100 : 0
    };
  }

  /**
   * Clear the entire pool
   */
  clear(): void {
    this.pool = [];
    this.activeCount = 0;
  }

  /**
   * Resize the pool (useful for dynamic adjustment)
   */
  resize(newMaxSize: number): void {
    this.maxSize = newMaxSize;
    
    // If new size is smaller, remove excess inactive objects
    if (this.pool.length > newMaxSize) {
      const toRemove = this.pool.length - newMaxSize;
      let removed = 0;
      
      for (let i = this.pool.length - 1; i >= 0 && removed < toRemove; i--) {
        if (!this.pool[i].isActive()) {
          this.pool.splice(i, 1);
          removed++;
        }
      }
    }
  }
}

/**
 * Bullet object for pooling
 */
export class PooledBullet implements Poolable {
  public position: Vector2 = new Vector2();
  public velocity: Vector2 = new Vector2();
  public color: string = '#ffff00';
  public size: number = 2;
  public lifetime: number = 0;
  public maxLifetime: number = 3000; // 3 seconds
  private active: boolean = false;

  reset(): void {
    this.position.x = 0;
    this.position.y = 0;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.lifetime = 0;
    this.color = '#ffff00';
    this.size = 2;
    this.maxLifetime = 3000;
  }

  isActive(): boolean {
    return this.active;
  }

  setActive(active: boolean): void {
    this.active = active;
  }

  update(deltaTime: number): void {
    if (!this.active) return;

    this.position = this.position.add(this.velocity.multiply(deltaTime / 1000));
    this.lifetime += deltaTime;

    // Deactivate if lifetime exceeded
    if (this.lifetime >= this.maxLifetime) {
      this.setActive(false);
    }
  }

  initialize(position: Vector2, velocity: Vector2, color: string = '#ffff00', size: number = 2): void {
    this.position = position.clone();
    this.velocity = velocity.clone();
    this.color = color;
    this.size = size;
    this.lifetime = 0;
  }
}

/**
 * Effect particle object for pooling
 */
export class PooledEffect implements Poolable {
  public position: Vector2 = new Vector2();
  public velocity: Vector2 = new Vector2();
  public color: string = '#ffffff';
  public size: number = 4;
  public alpha: number = 1.0;
  public lifetime: number = 0;
  public maxLifetime: number = 1000; // 1 second
  public fadeOut: boolean = true;
  private active: boolean = false;

  reset(): void {
    this.position.x = 0;
    this.position.y = 0;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.lifetime = 0;
    this.alpha = 1.0;
    this.color = '#ffffff';
    this.size = 4;
    this.maxLifetime = 1000;
    this.fadeOut = true;
  }

  isActive(): boolean {
    return this.active;
  }

  setActive(active: boolean): void {
    this.active = active;
  }

  update(deltaTime: number): void {
    if (!this.active) return;

    this.position = this.position.add(this.velocity.multiply(deltaTime / 1000));
    this.lifetime += deltaTime;

    // Fade out over time
    if (this.fadeOut) {
      this.alpha = Math.max(0, 1 - (this.lifetime / this.maxLifetime));
    }

    // Deactivate if lifetime exceeded
    if (this.lifetime >= this.maxLifetime) {
      this.setActive(false);
    }
  }

  initialize(
    position: Vector2, 
    velocity: Vector2, 
    color: string = '#ffffff', 
    size: number = 4, 
    lifetime: number = 1000,
    fadeOut: boolean = true
  ): void {
    this.position = position.clone();
    this.velocity = velocity.clone();
    this.color = color;
    this.size = size;
    this.maxLifetime = lifetime;
    this.fadeOut = fadeOut;
    this.lifetime = 0;
    this.alpha = 1.0;
  }
}

/**
 * Pool manager for managing multiple object pools
 */
export class PoolManager {
  private pools: Map<string, ObjectPool<any>> = new Map();

  /**
   * Register a new pool
   */
  registerPool<T extends Poolable>(
    name: string, 
    createFn: () => T, 
    initialSize: number = 10, 
    maxSize: number = 100,
    resetFn?: (obj: T) => void
  ): void {
    this.pools.set(name, new ObjectPool(createFn, initialSize, maxSize, resetFn));
  }

  /**
   * Get a pool by name
   */
  getPool<T extends Poolable>(name: string): ObjectPool<T> | undefined {
    return this.pools.get(name);
  }

  /**
   * Acquire object from named pool
   */
  acquire<T extends Poolable>(poolName: string): T | null {
    const pool = this.pools.get(poolName);
    return pool ? pool.acquire() : null;
  }

  /**
   * Release object to named pool
   */
  release<T extends Poolable>(poolName: string, obj: T): void {
    const pool = this.pools.get(poolName);
    if (pool) {
      pool.release(obj);
    }
  }

  /**
   * Get statistics for all pools
   */
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    this.pools.forEach((pool, name) => {
      stats[name] = pool.getStats();
    });
    return stats;
  }

  /**
   * Clear all pools
   */
  clearAll(): void {
    this.pools.forEach(pool => pool.clear());
    this.pools.clear();
  }

  /**
   * Release all objects in all pools
   */
  releaseAll(): void {
    this.pools.forEach(pool => pool.releaseAll());
  }
}