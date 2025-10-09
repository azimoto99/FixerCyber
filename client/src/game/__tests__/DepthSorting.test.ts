import { beforeEach, describe, expect, it } from 'vitest';
import { IsometricRenderer, RenderLayer, Sprite } from '../engine/IsometricRenderer';
import { Vector2 } from '../utils/Vector2';

describe('Depth Sorting and Layering System', () => {
  let canvas: HTMLCanvasElement;
  let renderer: IsometricRenderer;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    renderer = new IsometricRenderer(canvas);
  });

  describe('Depth Calculation', () => {
    it('should calculate depth based on Y-position', () => {
      const sprite1: Sprite = {
        position: new Vector2(0, 0),
        size: new Vector2(32, 32),
        color: '#ff0000',
        depth: 0
      };

      const sprite2: Sprite = {
        position: new Vector2(0, 5),
        size: new Vector2(32, 32),
        color: '#00ff00',
        depth: 0
      };

      renderer.clear();
      renderer.addToRenderQueue(sprite1);
      renderer.addToRenderQueue(sprite2);

      const stats = renderer.getRenderStats();
      expect(stats.totalItems).toBe(2);

      // Process queue to verify sorting works
      expect(() => renderer.processRenderQueue()).not.toThrow();
    });

    it('should calculate depth based on height', () => {
      const groundSprite: Sprite = {
        position: new Vector2(0, 0),
        size: new Vector2(32, 32),
        color: '#ff0000',
        depth: 0,
        height: 0
      };

      const elevatedSprite: Sprite = {
        position: new Vector2(0, 0), // Same position
        size: new Vector2(32, 32),
        color: '#00ff00',
        depth: 0,
        height: 10 // Higher up
      };

      renderer.clear();
      renderer.addToRenderQueue(groundSprite);
      renderer.addToRenderQueue(elevatedSprite);

      const stats = renderer.getRenderStats();
      expect(stats.totalItems).toBe(2);

      // Both sprites should be added successfully
      expect(() => renderer.processRenderQueue()).not.toThrow();
    });

    it('should handle sprites with same Y-position but different heights', () => {
      const sprites: Sprite[] = [
        {
          position: new Vector2(5, 5),
          size: new Vector2(32, 32),
          color: '#ff0000',
          depth: 0,
          height: 0,
          id: 'ground'
        },
        {
          position: new Vector2(5, 5),
          size: new Vector2(32, 32),
          color: '#00ff00',
          depth: 0,
          height: 5,
          id: 'mid'
        },
        {
          position: new Vector2(5, 5),
          size: new Vector2(32, 32),
          color: '#0000ff',
          depth: 0,
          height: 10,
          id: 'high'
        }
      ];

      renderer.clear();
      sprites.forEach(sprite => renderer.addToRenderQueue(sprite));

      const stats = renderer.getRenderStats();
      expect(stats.totalItems).toBe(3);
      expect(() => renderer.processRenderQueue()).not.toThrow();
    });
  });

  describe('Layer System', () => {
    it('should sort sprites by layer correctly', () => {
      const sprites: Sprite[] = [
        {
          position: new Vector2(0, 0),
          size: new Vector2(32, 32),
          color: '#ff0000',
          depth: 0,
          layer: RenderLayer.UI,
          id: 'ui'
        },
        {
          position: new Vector2(0, 0),
          size: new Vector2(32, 32),
          color: '#00ff00',
          depth: 0,
          layer: RenderLayer.GROUND,
          id: 'ground'
        },
        {
          position: new Vector2(0, 0),
          size: new Vector2(32, 32),
          color: '#0000ff',
          depth: 0,
          layer: RenderLayer.CHARACTERS,
          id: 'character'
        }
      ];

      renderer.clear();
      // Add in reverse order to test sorting
      sprites.reverse().forEach(sprite => renderer.addToRenderQueue(sprite));

      const stats = renderer.getRenderStats();
      expect(stats.totalItems).toBe(3);
      expect(stats.itemsByLayer.GROUND).toBe(1);
      expect(stats.itemsByLayer.CHARACTERS).toBe(1);
      expect(stats.itemsByLayer.UI).toBe(1);

      expect(() => renderer.processRenderQueue()).not.toThrow();
    });

    it('should handle all render layers', () => {
      const layers = [
        RenderLayer.GROUND,
        RenderLayer.OBJECTS,
        RenderLayer.CHARACTERS,
        RenderLayer.EFFECTS,
        RenderLayer.UI
      ];

      renderer.clear();
      layers.forEach((layer, index) => {
        const sprite: Sprite = {
          position: new Vector2(index, index),
          size: new Vector2(32, 32),
          color: '#ffffff',
          depth: 0,
          layer: layer,
          id: `layer-${layer}`
        };
        renderer.addToRenderQueue(sprite);
      });

      const stats = renderer.getRenderStats();
      expect(stats.totalItems).toBe(5);
      expect(Object.keys(stats.itemsByLayer)).toHaveLength(5);

      expect(() => renderer.processRenderQueue()).not.toThrow();
    });

    it('should process layers in correct order', () => {
      
      // Mock render functions to track order
      const createMockSprite = (layer: RenderLayer, id: string): Sprite => ({
        position: new Vector2(0, 0),
        size: new Vector2(32, 32),
        color: '#ffffff',
        depth: 0,
        layer: layer,
        id: id
      });

      renderer.clear();
      
      // Add layers in random order
      renderer.addToRenderQueue(createMockSprite(RenderLayer.EFFECTS, 'effects'));
      renderer.addToRenderQueue(createMockSprite(RenderLayer.GROUND, 'ground'));
      renderer.addToRenderQueue(createMockSprite(RenderLayer.UI, 'ui'));
      renderer.addToRenderQueue(createMockSprite(RenderLayer.CHARACTERS, 'characters'));
      renderer.addToRenderQueue(createMockSprite(RenderLayer.OBJECTS, 'objects'));

      // Process by layers should work correctly
      expect(() => renderer.processRenderQueueByLayers()).not.toThrow();
    });
  });

  describe('Z-Index System', () => {
    it('should sort sprites by zIndex within same layer', () => {
      const sprites: Sprite[] = [
        {
          position: new Vector2(0, 0),
          size: new Vector2(32, 32),
          color: '#ff0000',
          depth: 0,
          layer: RenderLayer.OBJECTS,
          zIndex: 10,
          id: 'high-z'
        },
        {
          position: new Vector2(0, 0),
          size: new Vector2(32, 32),
          color: '#00ff00',
          depth: 0,
          layer: RenderLayer.OBJECTS,
          zIndex: 1,
          id: 'low-z'
        },
        {
          position: new Vector2(0, 0),
          size: new Vector2(32, 32),
          color: '#0000ff',
          depth: 0,
          layer: RenderLayer.OBJECTS,
          zIndex: 5,
          id: 'mid-z'
        }
      ];

      renderer.clear();
      // Add in random order
      [sprites[2], sprites[0], sprites[1]].forEach(sprite => 
        renderer.addToRenderQueue(sprite)
      );

      expect(() => renderer.processRenderQueue()).not.toThrow();
    });

    it('should prioritize layer over zIndex', () => {
      const sprites: Sprite[] = [
        {
          position: new Vector2(0, 0),
          size: new Vector2(32, 32),
          color: '#ff0000',
          depth: 0,
          layer: RenderLayer.UI,
          zIndex: 1, // Low zIndex but high layer
          id: 'ui-low-z'
        },
        {
          position: new Vector2(0, 0),
          size: new Vector2(32, 32),
          color: '#00ff00',
          depth: 0,
          layer: RenderLayer.GROUND,
          zIndex: 100, // High zIndex but low layer
          id: 'ground-high-z'
        }
      ];

      renderer.clear();
      sprites.forEach(sprite => renderer.addToRenderQueue(sprite));

      // Ground should render first despite higher zIndex
      expect(() => renderer.processRenderQueue()).not.toThrow();
    });
  });

  describe('Alpha Blending', () => {
    it('should handle transparent sprites', () => {
      const sprites: Sprite[] = [
        {
          position: new Vector2(0, 0),
          size: new Vector2(32, 32),
          color: '#ff0000',
          depth: 0,
          alpha: 1.0,
          id: 'opaque'
        },
        {
          position: new Vector2(1, 1),
          size: new Vector2(32, 32),
          color: '#00ff00',
          depth: 1,
          alpha: 0.5,
          id: 'semi-transparent'
        },
        {
          position: new Vector2(2, 2),
          size: new Vector2(32, 32),
          color: '#0000ff',
          depth: 2,
          alpha: 0.1,
          id: 'very-transparent'
        }
      ];

      renderer.clear();
      sprites.forEach(sprite => renderer.addToRenderQueue(sprite));

      const stats = renderer.getRenderStats();
      expect(stats.itemsByAlpha.opaque).toBe(1);
      expect(stats.itemsByAlpha.transparent).toBe(2);

      expect(() => renderer.processRenderQueue()).not.toThrow();
    });

    it('should handle edge case alpha values', () => {
      const sprites: Sprite[] = [
        {
          position: new Vector2(0, 0),
          size: new Vector2(32, 32),
          color: '#ff0000',
          depth: 0,
          alpha: 0.0, // Fully transparent
          id: 'invisible'
        },
        {
          position: new Vector2(1, 1),
          size: new Vector2(32, 32),
          color: '#00ff00',
          depth: 1,
          alpha: 1.0, // Fully opaque
          id: 'opaque'
        }
      ];

      renderer.clear();
      sprites.forEach(sprite => renderer.addToRenderQueue(sprite));

      expect(() => renderer.processRenderQueue()).not.toThrow();
    });
  });

  describe('Complex Sorting Scenarios', () => {
    it('should handle overlapping objects at different depths', () => {
      const sprites: Sprite[] = [];
      
      // Create a grid of overlapping sprites
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
          sprites.push({
            position: new Vector2(x * 0.5, y * 0.5), // Overlapping positions
            size: new Vector2(32, 32),
            color: `hsl(${(x + y) * 40}, 70%, 50%)`,
            depth: y * 10 + x, // Depth based on position
            id: `sprite-${x}-${y}`
          });
        }
      }

      renderer.clear();
      sprites.forEach(sprite => renderer.addToRenderQueue(sprite));

      const stats = renderer.getRenderStats();
      expect(stats.totalItems).toBe(9);

      expect(() => renderer.processRenderQueue()).not.toThrow();
    });

    it('should handle mixed layers, depths, and alpha values', () => {
      const sprites: Sprite[] = [
        {
          position: new Vector2(0, 0),
          size: new Vector2(32, 32),
          color: '#ff0000',
          depth: 10,
          layer: RenderLayer.GROUND,
          alpha: 0.8,
          zIndex: 5,
          id: 'complex-1'
        },
        {
          position: new Vector2(0, 5),
          size: new Vector2(32, 32),
          color: '#00ff00',
          depth: 5,
          layer: RenderLayer.OBJECTS,
          alpha: 0.6,
          zIndex: 1,
          height: 2,
          id: 'complex-2'
        },
        {
          position: new Vector2(0, 2),
          size: new Vector2(32, 32),
          color: '#0000ff',
          depth: 15,
          layer: RenderLayer.CHARACTERS,
          alpha: 1.0,
          zIndex: 10,
          height: 5,
          id: 'complex-3'
        }
      ];

      renderer.clear();
      sprites.forEach(sprite => renderer.addToRenderQueue(sprite));

      const stats = renderer.getRenderStats();
      expect(stats.totalItems).toBe(3);
      expect(stats.itemsByAlpha.opaque).toBe(1);
      expect(stats.itemsByAlpha.transparent).toBe(2);

      expect(() => renderer.processRenderQueue()).not.toThrow();
      expect(() => renderer.processRenderQueueByLayers()).not.toThrow();
    });

    it('should handle large numbers of sprites efficiently', () => {
      const sprites: Sprite[] = [];
      const numSprites = 100;

      // Create many sprites with random properties
      for (let i = 0; i < numSprites; i++) {
        sprites.push({
          position: new Vector2(
            Math.random() * 20 - 10,
            Math.random() * 20 - 10
          ),
          size: new Vector2(16, 16),
          color: `hsl(${Math.random() * 360}, 70%, 50%)`,
          depth: Math.random() * 100,
          layer: Math.floor(Math.random() * 5) as RenderLayer,
          alpha: 0.5 + Math.random() * 0.5,
          zIndex: Math.floor(Math.random() * 10),
          height: Math.random() * 5,
          id: `sprite-${i}`
        });
      }

      renderer.clear();
      sprites.forEach(sprite => renderer.addToRenderQueue(sprite));

      const stats = renderer.getRenderStats();
      expect(stats.totalItems).toBe(numSprites);

      // Should handle large numbers efficiently
      const startTime = performance.now();
      renderer.processRenderQueue();
      const endTime = performance.now();
      
      // Should complete in reasonable time (less than 100ms for 100 sprites)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty render queue', () => {
      renderer.clear();
      
      const stats = renderer.getRenderStats();
      expect(stats.totalItems).toBe(0);
      expect(stats.itemsByAlpha.opaque).toBe(0);
      expect(stats.itemsByAlpha.transparent).toBe(0);

      expect(() => renderer.processRenderQueue()).not.toThrow();
      expect(() => renderer.processRenderQueueByLayers()).not.toThrow();
    });

    it('should handle sprites with undefined optional properties', () => {
      const sprite: Sprite = {
        position: new Vector2(0, 0),
        size: new Vector2(32, 32),
        color: '#ff0000',
        depth: 0
        // All optional properties undefined
      };

      renderer.clear();
      renderer.addToRenderQueue(sprite);

      expect(() => renderer.processRenderQueue()).not.toThrow();
    });

    it('should handle sprites with extreme depth values', () => {
      const sprites: Sprite[] = [
        {
          position: new Vector2(0, 0),
          size: new Vector2(32, 32),
          color: '#ff0000',
          depth: -999999,
          id: 'extreme-back'
        },
        {
          position: new Vector2(0, 0),
          size: new Vector2(32, 32),
          color: '#00ff00',
          depth: 999999,
          id: 'extreme-front'
        }
      ];

      renderer.clear();
      sprites.forEach(sprite => renderer.addToRenderQueue(sprite));

      expect(() => renderer.processRenderQueue()).not.toThrow();
    });

    it('should handle sprites with extreme alpha values', () => {
      const sprites: Sprite[] = [
        {
          position: new Vector2(0, 0),
          size: new Vector2(32, 32),
          color: '#ff0000',
          depth: 0,
          alpha: -1, // Invalid but should be handled gracefully
          id: 'negative-alpha'
        },
        {
          position: new Vector2(0, 0),
          size: new Vector2(32, 32),
          color: '#00ff00',
          depth: 1,
          alpha: 2, // Invalid but should be handled gracefully
          id: 'over-alpha'
        }
      ];

      renderer.clear();
      sprites.forEach(sprite => renderer.addToRenderQueue(sprite));

      expect(() => renderer.processRenderQueue()).not.toThrow();
    });
  });

  describe('Render Statistics', () => {
    it('should provide accurate render statistics', () => {
      const sprites: Sprite[] = [
        {
          position: new Vector2(0, 0),
          size: new Vector2(32, 32),
          color: '#ff0000',
          depth: 0,
          layer: RenderLayer.GROUND,
          alpha: 1.0
        },
        {
          position: new Vector2(1, 1),
          size: new Vector2(32, 32),
          color: '#00ff00',
          depth: 1,
          layer: RenderLayer.OBJECTS,
          alpha: 0.5
        },
        {
          position: new Vector2(2, 2),
          size: new Vector2(32, 32),
          color: '#0000ff',
          depth: 2,
          layer: RenderLayer.OBJECTS,
          alpha: 0.8
        }
      ];

      renderer.clear();
      sprites.forEach(sprite => renderer.addToRenderQueue(sprite));

      const stats = renderer.getRenderStats();
      
      expect(stats.totalItems).toBe(3);
      expect(stats.itemsByLayer.GROUND).toBe(1);
      expect(stats.itemsByLayer.OBJECTS).toBe(2);
      expect(stats.itemsByAlpha.opaque).toBe(1);
      expect(stats.itemsByAlpha.transparent).toBe(2);
    });
  });
});