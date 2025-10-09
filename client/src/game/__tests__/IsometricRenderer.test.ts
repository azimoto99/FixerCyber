import { beforeEach, describe, expect, it } from 'vitest';
import { IsometricRenderer, Sprite } from '../engine/IsometricRenderer';
import { Vector2 } from '../utils/Vector2';

describe('IsometricRenderer', () => {
  let canvas: HTMLCanvasElement;
  let renderer: IsometricRenderer;

  beforeEach(() => {
    // Create a mock canvas for testing
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    renderer = new IsometricRenderer(canvas);
  });

  describe('Coordinate Conversion', () => {
    it('should convert world origin to screen center', () => {
      const worldOrigin = new Vector2(0, 0);
      const screenPos = renderer.worldToScreen(worldOrigin);
      
      expect(screenPos.x).toBeCloseTo(400, 1); // Canvas width / 2
      expect(screenPos.y).toBeCloseTo(300, 1); // Canvas height / 2
    });

    it('should convert screen center back to world origin', () => {
      const screenCenter = new Vector2(400, 300);
      const worldPos = renderer.screenToWorld(screenCenter);
      
      expect(worldPos.x).toBeCloseTo(0, 5);
      expect(worldPos.y).toBeCloseTo(0, 5);
    });

    it('should maintain proper 2:1 isometric ratio', () => {
      // Test point at (1, 0) in world coordinates
      const worldPos1 = new Vector2(1, 0);
      const screenPos1 = renderer.worldToScreen(worldPos1);
      
      // Test point at (0, 1) in world coordinates
      const worldPos2 = new Vector2(0, 1);
      const screenPos2 = renderer.worldToScreen(worldPos2);
      
      // In isometric projection, moving 1 unit in X should move screen position by tileSize/2 in X
      // and tileSize/4 in Y
      const expectedXDiff = 32; // tileSize/2 = 64/2 = 32
      const expectedYDiff = 16; // tileSize/4 = 64/4 = 16
      
      expect(screenPos1.x - 400).toBeCloseTo(expectedXDiff, 1);
      expect(screenPos1.y - 300).toBeCloseTo(expectedYDiff, 1);
      
      expect(screenPos2.x - 400).toBeCloseTo(-expectedXDiff, 1);
      expect(screenPos2.y - 300).toBeCloseTo(expectedYDiff, 1);
    });

    it('should handle coordinate conversion with camera offset', () => {
      // Move camera to (10, 10)
      renderer.setCameraPosition(new Vector2(10, 10));
      
      const worldPos = new Vector2(10, 10);
      const screenPos = renderer.worldToScreen(worldPos);
      
      // Point at camera position should be at screen center
      expect(screenPos.x).toBeCloseTo(400, 1);
      expect(screenPos.y).toBeCloseTo(300, 1);
    });

    it('should handle coordinate conversion with zoom', () => {
      renderer.setCameraZoom(2.0);
      
      const worldPos = new Vector2(1, 0);
      const screenPos = renderer.worldToScreen(worldPos);
      
      // With 2x zoom, distances should be doubled
      const expectedXDiff = 64; // 32 * 2
      const expectedYDiff = 32; // 16 * 2
      
      expect(screenPos.x - 400).toBeCloseTo(expectedXDiff, 1);
      expect(screenPos.y - 300).toBeCloseTo(expectedYDiff, 1);
    });

    it('should be reversible (world -> screen -> world)', () => {
      const originalWorld = new Vector2(5, -3);
      const screenPos = renderer.worldToScreen(originalWorld);
      const convertedWorld = renderer.screenToWorld(screenPos);
      
      expect(convertedWorld.x).toBeCloseTo(originalWorld.x, 5);
      expect(convertedWorld.y).toBeCloseTo(originalWorld.y, 5);
    });

    it('should be reversible with camera offset and zoom', () => {
      renderer.setCameraPosition(new Vector2(7, -2));
      renderer.setCameraZoom(1.5);
      
      const originalWorld = new Vector2(12, 8);
      const screenPos = renderer.worldToScreen(originalWorld);
      const convertedWorld = renderer.screenToWorld(screenPos);
      
      expect(convertedWorld.x).toBeCloseTo(originalWorld.x, 5);
      expect(convertedWorld.y).toBeCloseTo(originalWorld.y, 5);
    });
  });

  describe('Camera System', () => {
    it('should initialize camera at origin', () => {
      const cameraPos = renderer.getCameraPosition();
      expect(cameraPos.x).toBe(0);
      expect(cameraPos.y).toBe(0);
      expect(renderer.getCameraZoom()).toBe(1.0);
    });

    it('should set camera position directly', () => {
      const newPos = new Vector2(10, 20);
      renderer.setCameraPosition(newPos);
      
      const cameraPos = renderer.getCameraPosition();
      expect(cameraPos.x).toBe(10);
      expect(cameraPos.y).toBe(20);
    });

    it('should clamp zoom to reasonable bounds', () => {
      renderer.setCameraZoom(0.05); // Too small
      expect(renderer.getCameraZoom()).toBe(0.1);
      
      renderer.setCameraZoom(10); // Too large
      expect(renderer.getCameraZoom()).toBe(5.0);
      
      renderer.setCameraZoom(2.0); // Valid
      expect(renderer.getCameraZoom()).toBe(2.0);
    });

    it('should update camera with smooth following', () => {
      const initialPos = new Vector2(0, 0);
      const targetPos = new Vector2(10, 10);
      
      renderer.setCameraPosition(initialPos);
      renderer.updateCamera(targetPos);
      
      const cameraPos = renderer.getCameraPosition();
      
      // Camera should move towards target but not reach it immediately
      expect(cameraPos.x).toBeGreaterThan(0);
      expect(cameraPos.x).toBeLessThan(10);
      expect(cameraPos.y).toBeGreaterThan(0);
      expect(cameraPos.y).toBeLessThan(10);
    });
  });

  describe('Viewport Management', () => {
    it('should calculate viewport bounds correctly', () => {
      const bounds = renderer.getViewportBounds();
      
      expect(bounds.minX).toBeLessThan(bounds.maxX);
      expect(bounds.minY).toBeLessThan(bounds.maxY);
      
      // Bounds should be centered around camera position (0, 0)
      expect(bounds.minX).toBeLessThan(0);
      expect(bounds.maxX).toBeGreaterThan(0);
      expect(bounds.minY).toBeLessThan(0);
      expect(bounds.maxY).toBeGreaterThan(0);
    });

    it('should check if position is in viewport', () => {
      const bounds = renderer.getViewportBounds();
      
      // Position at origin should be in viewport
      expect(renderer.isInViewport(new Vector2(0, 0), bounds)).toBe(true);
      
      // Position far outside should not be in viewport
      expect(renderer.isInViewport(new Vector2(1000, 1000), bounds)).toBe(false);
    });

    it('should adjust viewport bounds with camera movement', () => {
      const initialBounds = renderer.getViewportBounds();
      
      renderer.setCameraPosition(new Vector2(50, 50));
      const movedBounds = renderer.getViewportBounds();
      
      // Bounds should shift with camera
      expect(movedBounds.minX).toBeGreaterThan(initialBounds.minX);
      expect(movedBounds.maxX).toBeGreaterThan(initialBounds.maxX);
      expect(movedBounds.minY).toBeGreaterThan(initialBounds.minY);
      expect(movedBounds.maxY).toBeGreaterThan(initialBounds.maxY);
    });

    it('should adjust viewport bounds with zoom', () => {
      const initialBounds = renderer.getViewportBounds();
      
      renderer.setCameraZoom(2.0);
      const zoomedBounds = renderer.getViewportBounds();
      
      // Higher zoom should result in smaller viewport bounds
      const initialWidth = initialBounds.maxX - initialBounds.minX;
      const zoomedWidth = zoomedBounds.maxX - zoomedBounds.minX;
      
      expect(zoomedWidth).toBeLessThan(initialWidth);
    });
  });

  describe('Sprite Rendering', () => {
    it('should add sprites to render queue', () => {
      const sprite: Sprite = {
        position: new Vector2(0, 0),
        size: new Vector2(32, 32),
        color: '#ff0000',
        depth: 0
      };
      
      renderer.clear();
      renderer.addToRenderQueue(sprite);
      
      // Should not throw when processing render queue
      expect(() => renderer.processRenderQueue()).not.toThrow();
    });

    it('should sort sprites by depth', () => {
      const sprite1: Sprite = {
        position: new Vector2(0, 0),
        size: new Vector2(32, 32),
        color: '#ff0000',
        depth: 10
      };
      
      const sprite2: Sprite = {
        position: new Vector2(1, 1),
        size: new Vector2(32, 32),
        color: '#00ff00',
        depth: 5
      };
      
      renderer.clear();
      renderer.addToRenderQueue(sprite1);
      renderer.addToRenderQueue(sprite2);
      
      // Should not throw when processing render queue with depth sorting
      expect(() => renderer.processRenderQueue()).not.toThrow();
    });
  });

  describe('Canvas Management', () => {
    it('should get canvas size correctly', () => {
      const size = renderer.getCanvasSize();
      expect(size.x).toBe(800);
      expect(size.y).toBe(600);
    });

    it('should resize canvas', () => {
      renderer.resize(1024, 768);
      
      const size = renderer.getCanvasSize();
      expect(size.x).toBe(1024);
      expect(size.y).toBe(768);
    });

    it('should clear canvas without errors', () => {
      expect(() => renderer.clear()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme coordinate values', () => {
      const extremePos = new Vector2(999999, -999999);
      
      expect(() => {
        const screenPos = renderer.worldToScreen(extremePos);
        renderer.screenToWorld(screenPos);
      }).not.toThrow();
    });

    it('should handle zero zoom gracefully', () => {
      renderer.setCameraZoom(0);
      expect(renderer.getCameraZoom()).toBe(0.1); // Should be clamped to minimum
    });

    it('should handle negative coordinates', () => {
      const negativePos = new Vector2(-10, -20);
      const screenPos = renderer.worldToScreen(negativePos);
      const convertedBack = renderer.screenToWorld(screenPos);
      
      expect(convertedBack.x).toBeCloseTo(negativePos.x, 5);
      expect(convertedBack.y).toBeCloseTo(negativePos.y, 5);
    });
  });
});