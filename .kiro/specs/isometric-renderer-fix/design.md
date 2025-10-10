# Design Document

## Overview

The IsometricRenderer is a critical component of the cyberpunk roguelike game that handles all visual rendering in isometric perspective. The current implementation is corrupted with duplicate code, syntax errors, and missing functionality. This design outlines a complete rebuild that provides robust rendering capabilities, performance optimization, and seamless integration with existing game systems.

The renderer will serve as the central rendering hub, managing sprite rendering, depth sorting, coordinate transformations, performance tracking, and lighting integration. It must handle the complex requirements of an isometric view while maintaining smooth performance even with hundreds of sprites.

## Architecture

### Core Components

**IsometricRenderer Class**

- Main renderer class that orchestrates all rendering operations
- Manages canvas context, camera integration, and render queue
- Provides coordinate transformation between world and screen space
- Handles performance monitoring and optimization

**Render Queue System**

- Manages all renderable items with proper depth sorting
- Supports multiple render layers (GROUND, OBJECTS, CHARACTERS, EFFECTS, UI)
- Implements efficient sorting algorithms for optimal performance
- Provides frustum culling to skip off-screen items

**Performance Monitor**

- Tracks FPS, frame time, render time, and memory usage
- Monitors culled vs rendered item counts
- Provides debugging information for optimization

**Lighting Integration**

- Interfaces with the existing LightingSystem
- Applies lighting effects during rendering
- Maintains performance when lighting is disabled

### Integration Points

**Camera System**

- Uses existing Camera class for position and zoom
- Applies camera transformations to all rendered items
- Supports smooth camera following and viewport management

**Game Engine**

- Integrates with GameEngine's render loop
- Provides methods for rendering world, players, and projectiles
- Supports the existing game architecture without breaking changes

**Lighting System**

- Integrates with existing LightingSystem and LightingEngine
- Applies lighting effects as a post-processing step
- Maintains compatibility with atmospheric effects

## Components and Interfaces

### Core Interfaces

```typescript
interface Sprite {
  position: Vector2;
  size: Vector2;
  color: string;
  depth: number;
  id?: string;
  layer?: RenderLayer;
  height?: number;
  alpha?: number;
  zIndex?: number;
}

interface RenderItem {
  depth: number;
  layer: RenderLayer;
  zIndex: number;
  alpha: number;
  render: () => void;
  id?: string;
}

interface PerformanceStats {
  fps: number;
  frameTime: number;
  renderTime: number;
  culledItems: number;
  renderedItems: number;
  totalItems: number;
  memoryUsage?: number;
}
```

### Render Layers

```typescript
enum RenderLayer {
  GROUND = 0, // Terrain, floors
  OBJECTS = 1, // Buildings, furniture
  CHARACTERS = 2, // Players, NPCs
  EFFECTS = 3, // Particles, explosions
  UI = 4, // UI elements, overlays
}
```

### Core Methods

**Coordinate Transformation**

- `worldToScreen(worldPos: Vector2): Vector2` - Convert world coordinates to screen
- `screenToWorld(screenPos: Vector2): Vector2` - Convert screen coordinates to world
- Both methods account for camera position, zoom, and isometric projection

**Rendering Pipeline**

- `clear()` - Clear canvas and reset render state
- `addToRenderQueue(item: RenderItem)` - Add item to render queue
- `renderQueue()` - Process and render all queued items
- `renderWithLighting()` - Apply lighting effects after rendering

**Performance Management**

- `updatePerformanceStats()` - Calculate and update performance metrics
- `cullOffscreenItems()` - Remove items outside viewport
- `optimizeRenderQueue()` - Sort and optimize render queue

## Data Models

### Sprite Data Model

Sprites represent all visual elements in the game. Each sprite contains:

- **Position**: World coordinates (Vector2)
- **Size**: Dimensions in world units (Vector2)
- **Color**: Base color or tint (string)
- **Depth**: Z-order for depth sorting (number)
- **Layer**: Render layer for proper ordering (RenderLayer)
- **Height**: Vertical offset for 3D effect (optional number)
- **Alpha**: Transparency level 0-1 (optional number)
- **ZIndex**: Fine-grained sorting within same depth (optional number)

### Render Item Data Model

Render items are processed sprites ready for rendering:

- **Depth**: Calculated depth including height offset
- **Layer**: Render layer for primary sorting
- **ZIndex**: Secondary sorting value
- **Alpha**: Final alpha value for rendering
- **Render Function**: Callback that performs the actual drawing
- **ID**: Optional identifier for debugging

### Performance Stats Data Model

Performance statistics track rendering efficiency:

- **FPS**: Frames per second
- **Frame Time**: Time per frame in milliseconds
- **Render Time**: Time spent rendering in milliseconds
- **Culled Items**: Number of items skipped due to culling
- **Rendered Items**: Number of items actually drawn
- **Total Items**: Total items in render queue
- **Memory Usage**: Optional memory usage tracking

## Error Handling

### Rendering Errors

- Canvas context validation on initialization
- Graceful handling of invalid sprite data
- Fallback rendering for corrupted sprites
- Error logging without breaking the render loop

### Performance Safeguards

- Frame time limiting to prevent stuttering
- Automatic quality reduction under heavy load
- Memory usage monitoring and cleanup
- Render queue size limits

### Integration Errors

- Safe handling of missing camera or lighting systems
- Fallback coordinate transformations
- Default values for missing sprite properties
- Robust error recovery in render pipeline

## Testing Strategy

### Unit Tests

- **Coordinate Transformation Tests**: Verify world-to-screen and screen-to-world conversions
- **Depth Sorting Tests**: Ensure proper sprite ordering by layer, depth, and zIndex
- **Performance Tests**: Validate performance tracking accuracy
- **Error Handling Tests**: Test graceful handling of invalid inputs

### Integration Tests

- **Camera Integration**: Test camera position and zoom effects on rendering
- **Lighting Integration**: Verify lighting system integration
- **Game Engine Integration**: Test all public methods used by GameEngine
- **Performance Integration**: Test performance under realistic game loads

### Visual Tests

- **Isometric Projection**: Verify correct isometric appearance
- **Depth Sorting**: Visual verification of proper sprite layering
- **Transparency**: Test alpha blending and transparency effects
- **Lighting Effects**: Visual verification of lighting integration

### Performance Tests

- **Stress Testing**: Test with hundreds of sprites
- **Memory Testing**: Monitor memory usage over time
- **Frame Rate Testing**: Ensure consistent 60fps performance
- **Culling Testing**: Verify frustum culling effectiveness

The testing strategy ensures the renderer is robust, performant, and integrates seamlessly with the existing game architecture while providing the visual quality expected for a cyberpunk roguelike game.
