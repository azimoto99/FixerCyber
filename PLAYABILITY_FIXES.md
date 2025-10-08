# Critical Playability Fixes

## Status: Ready to implement

### Priority 1: Core Rendering & Movement (ACTIVE)
These are the absolute minimum to see and control the game.

#### 1. Player Rendering Fix ✓
**Issue**: Player not appearing on screen
**Root cause**: Player rendering happens in renderQueue but isn't being added before processRenderQueue
**Fix**: Move player rendering outside the queue system in IsometricRenderer

#### 2. World Generation Data Structure ✓  
**Issue**: Chunks missing tileMap and collisionMap
**Root cause**: WorldSystem.generateChunkIfNeeded wraps WorldGenerator output incorrectly
**Fix**: WorldGenerator already creates proper tileMaps and collisionMaps - need to preserve them

#### 3. Collision Detection
**Issue**: Movement system needs working collision  
**Status**: Code exists but needs testing

### Priority 2: Basic Combat
#### 4. Shooting Mechanics
- CombatSystem is complete
- Need to wire up mouse clicks to shooting
- Projectile rendering exists
- Hit detection works

#### 5. Target Dummy
- Add a simple stationary NPC that can be shot
- Show damage numbers
- Test hit registration

### Priority 3: UI/UX Polish
#### 6. HUD Elements
- Health bar
- Ammo counter
- Crosshair
- FPS counter

#### 7. Loading Screen
- Already exists but needs better feedback
- Show chunk count

### Next Steps After Playable:
- Contracts system integration
- Inventory UI
- NPC AI behaviors
- Loot drops
- Housing system
