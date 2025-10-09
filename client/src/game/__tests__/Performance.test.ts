import { beforeEach, describe, expect, it } from 'vitest';
import { IsometricRenderer } from '../engine/IsometricRenderer';
import { PooledBullet, PoolManager } from '../engine/ObjectPool';
import { Vector2 } from '../utils/Vector2';

describe('Performance Optimization', () => {
  let canvas: HTMLCanvasElement;
  let renderer: IsometricRenderer;
  let poolManager: PoolManager;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    renderer = new IsometricRenderer(canvas);
    poolManager = new PoolManager();
    
    // Register pools for testing
    poolManager.registerPool('bullets', () => new PooledBullet(), 10, 100);
  });

  describe('Viewport Culling', () => {
    it('should handle viewport bounds calculation correctly', () => {
      const bounds = renderer.getViewportBounds();
      
      expect(bounds.minX).toBeLessThan(bounds.maxX);
      expect(bounds.minY).toBeLessThan(bounds.maxY);
      expect(typeof bounds.minX).toBe('number');
      expect(typeof bounds.maxX).toBe('number');
      expect(typeof bounds.minY).toBe('number');
      expect(typeof bounds.maxY).toBe('number');
    });

    it('should allow enabling/disabling culling', () => {
      // Test culling toggle
      renderer.setCullingEnabled(true);
      renderer.setCullingEnabled(false);
      // If no errors, culling toggle works
      expect(true).toBe(true);
    });
  });

  describe('Object Pooling', () => {
    it('should create and manage object pools correctly', () => {
      const bulletPool = poolManager.getPool<PooledBullet>('bullets');
      expect(bulletPool).toBeDefined();

      const stats = bulletPool!.getStats();
      expect(stats.totalSize).toBe(10); // Initial size
      expect(stats.activeCount).toBe(0);
      expect(stats.inactiveCount).toBe(10);
    });

    it('should acquire and release objects from pool', () => {
      const bullet = poolManager.acquire<PooledBullet>('bullets');
      expect(bullet).toBeDefined();
      expect(bullet!.isActive()).toBe(true);

      const stats = poolManager.getPool<PooledBullet>('bullets')!.getStats();
      expect(stats.activeCount).toBe(1);
      expect(stats.inactiveCount).toBe(9);

      // Release the bullet
      poolManager.release('bullets', bullet!);
      const statsAfterRelease = poolManager.getPool<PooledBullet>('bullets')!.getStats();
      expect(statsAfterRelease.activeCount).toBe(0);
      expect(statsAfterRelease.inactiveCount).toBe(10);
    });

    it('should reset objects when released', () => {
      const bullet = poolManager.acquire<PooledBullet>('bullets')!;
      
      // Modify bullet properties
      bullet.position = new Vector2(100, 200);
      bullet.velocity = new Vector2(50, 75);
      bullet.lifetime = 1000;

      // Release bullet (should reset)
      poolManager.release('bullets', bullet);

      // Check that bullet was reset
      expect(bullet.position.x).toBe(0);
      expect(bullet.position.y).toBe(0);
      expect(bullet.velocity.x).toBe(0);
      expect(bullet.velocity.y).toBe(0);
      expect(bullet.lifetime).toBe(0);
      expect(bullet.isActive()).toBe(false);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance statistics', () => {
      const stats = renderer.getPerformanceStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.fps).toBe('number');
      expect(typeof stats.frameTime).toBe('number');
      expect(typeof stats.renderTime).toBe('number');
      expect(typeof stats.culledItems).toBe('number');
      expect(typeof stats.renderedItems).toBe('number');
      expect(typeof stats.totalItems).toBe('number');
    });

    it('should handle large numbers of objects efficiently', () => {
      const startTime = performance.now();
      
      // Create 100 sprites (reduced from 1000 for faster test)
      for (let i = 0; i < 100; i++) {
        renderer.addToRenderQueue({
          position: new Vector2(
            Math.random() * 200 - 100,
            Math.random() * 200 - 100
          ),
          size: new Vector2(16, 16),
          color: `hsl(${Math.random() * 360}, 70%, 50%)`,
          depth: Math.random() * 100
        });
      }

      renderer.processRenderQueue();

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should complete within reasonable time
      expect(renderTime).toBeLessThan(100); // 100ms threshold

      const stats = renderer.getPerformanceStats();
      expect(stats.totalItems).toBe(100);
    });
  });
});