import { describe, expect, it } from 'vitest';
import { IsometricRenderer, Sprite } from '../engine/IsometricRenderer';
import { Vector2 } from '../utils/Vector2';

describe('IsometricRenderer Demo', () => {
  it('should demonstrate basic isometric rendering functionality', () => {
    // Create a canvas for testing
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    const renderer = new IsometricRenderer(canvas);
    
    // Test coordinate conversion with various points
    const testPoints = [
      new Vector2(0, 0),    // Origin
      new Vector2(1, 0),    // Right
      new Vector2(0, 1),    // Down
      new Vector2(1, 1),    // Diagonal
      new Vector2(-1, -1),  // Negative diagonal
    ];
    
    console.log('=== Isometric Coordinate Conversion Demo ===');
    testPoints.forEach(worldPos => {
      const screenPos = renderer.worldToScreen(worldPos);
      const backToWorld = renderer.screenToWorld(screenPos);
      
      console.log(`World: (${worldPos.x}, ${worldPos.y}) -> Screen: (${screenPos.x.toFixed(1)}, ${screenPos.y.toFixed(1)}) -> Back: (${backToWorld.x.toFixed(3)}, ${backToWorld.y.toFixed(3)})`);
      
      // Verify round-trip accuracy
      expect(backToWorld.x).toBeCloseTo(worldPos.x, 5);
      expect(backToWorld.y).toBeCloseTo(worldPos.y, 5);
    });
    
    // Test camera movement
    console.log('\n=== Camera Movement Demo ===');
    const originalCameraPos = renderer.getCameraPosition();
    console.log(`Initial camera position: (${originalCameraPos.x}, ${originalCameraPos.y})`);
    
    renderer.setCameraPosition(new Vector2(5, 5));
    const newCameraPos = renderer.getCameraPosition();
    console.log(`New camera position: (${newCameraPos.x}, ${newCameraPos.y})`);
    
    // Test that world origin now appears at different screen position
    const originScreenPos = renderer.worldToScreen(new Vector2(0, 0));
    console.log(`World origin (0,0) now appears at screen: (${originScreenPos.x.toFixed(1)}, ${originScreenPos.y.toFixed(1)})`);
    
    // Test zoom
    console.log('\n=== Zoom Demo ===');
    renderer.setCameraPosition(new Vector2(0, 0)); // Reset camera
    renderer.setCameraZoom(2.0);
    
    const zoomedScreenPos = renderer.worldToScreen(new Vector2(1, 0));
    console.log(`With 2x zoom, world (1,0) appears at screen: (${zoomedScreenPos.x.toFixed(1)}, ${zoomedScreenPos.y.toFixed(1)})`);
    
    // Test sprite rendering (just verify it doesn't crash)
    console.log('\n=== Sprite Rendering Demo ===');
    const testSprites: Sprite[] = [
      {
        position: new Vector2(0, 0),
        size: new Vector2(32, 32),
        color: '#ff0000',
        depth: 0,
        id: 'center'
      },
      {
        position: new Vector2(2, 0),
        size: new Vector2(24, 24),
        color: '#00ff00',
        depth: 1,
        id: 'right'
      },
      {
        position: new Vector2(0, 2),
        size: new Vector2(24, 24),
        color: '#0000ff',
        depth: 2,
        id: 'down'
      }
    ];
    
    renderer.clear();
    testSprites.forEach(sprite => {
      renderer.addToRenderQueue(sprite);
      console.log(`Added sprite '${sprite.id}' at world (${sprite.position.x}, ${sprite.position.y}) with depth ${sprite.depth}`);
    });
    
    // Process render queue (should not throw)
    expect(() => renderer.processRenderQueue()).not.toThrow();
    console.log('Successfully processed render queue with depth sorting');
    
    // Test viewport bounds
    console.log('\n=== Viewport Bounds Demo ===');
    const bounds = renderer.getViewportBounds();
    console.log(`Viewport bounds: X(${bounds.minX.toFixed(2)} to ${bounds.maxX.toFixed(2)}), Y(${bounds.minY.toFixed(2)} to ${bounds.maxY.toFixed(2)})`);
    
    // Test if various positions are in viewport
    const testPositions = [
      new Vector2(0, 0),
      new Vector2(bounds.minX + 1, bounds.minY + 1),
      new Vector2(bounds.maxX - 1, bounds.maxY - 1),
      new Vector2(1000, 1000) // Should be outside
    ];
    
    testPositions.forEach(pos => {
      const inViewport = renderer.isInViewport(pos, bounds);
      console.log(`Position (${pos.x}, ${pos.y}) is ${inViewport ? 'IN' : 'OUT OF'} viewport`);
    });
    
    console.log('\n=== Demo Complete ===');
  });
  
  it('should demonstrate proper 2:1 isometric ratio', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const renderer = new IsometricRenderer(canvas);
    
    // Test the 2:1 ratio by checking how unit movements in world space
    // translate to screen space movements
    const origin = renderer.worldToScreen(new Vector2(0, 0));
    const rightOne = renderer.worldToScreen(new Vector2(1, 0));
    const downOne = renderer.worldToScreen(new Vector2(0, 1));
    
    const rightMovement = rightOne.subtract(origin);
    const downMovement = downOne.subtract(origin);
    
    console.log('\n=== 2:1 Isometric Ratio Verification ===');
    console.log(`Moving right by 1 world unit: screen delta (${rightMovement.x.toFixed(1)}, ${rightMovement.y.toFixed(1)})`);
    console.log(`Moving down by 1 world unit: screen delta (${downMovement.x.toFixed(1)}, ${downMovement.y.toFixed(1)})`);
    
    // In proper isometric projection:
    // - Moving right (1,0) should move screen by (+tileSize/2, +tileSize/4)
    // - Moving down (0,1) should move screen by (-tileSize/2, +tileSize/4)
    const expectedRightX = 32; // tileSize/2 = 64/2
    const expectedRightY = 16; // tileSize/4 = 64/4
    const expectedDownX = -32;
    const expectedDownY = 16;
    
    expect(rightMovement.x).toBeCloseTo(expectedRightX, 1);
    expect(rightMovement.y).toBeCloseTo(expectedRightY, 1);
    expect(downMovement.x).toBeCloseTo(expectedDownX, 1);
    expect(downMovement.y).toBeCloseTo(expectedDownY, 1);
    
    // Verify the 2:1 ratio: horizontal movement should be twice the vertical movement
    const horizontalDistance = Math.abs(rightMovement.x);
    const verticalDistance = Math.abs(rightMovement.y);
    const ratio = horizontalDistance / verticalDistance;
    
    console.log(`Horizontal:Vertical ratio: ${ratio.toFixed(2)}:1`);
    expect(ratio).toBeCloseTo(2.0, 1);
    
    console.log('✓ 2:1 isometric ratio verified');
  });
});