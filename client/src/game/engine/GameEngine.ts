// Core game engine
import { BuildingInteractionSystem } from '../systems/BuildingInteractionSystem';
import { CharacterAnimationSystem } from '../systems/CharacterAnimationSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { ContractSystem } from '../systems/ContractSystem';
import { HackingSystem } from '../systems/HackingSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { LoadingProgress, LoadingSystem } from '../systems/LoadingSystem';
import { MultiplayerSystem } from '../systems/MultiplayerSystem';
import { TacticalMovementSystem } from '../systems/TacticalMovementSystem';
import { UISystem } from '../systems/UISystem';
import { WorldSystem } from '../systems/WorldSystem';
import { Vector2 } from '../utils/Vector2';
import { AudioManager } from './AudioManager';
import { InputManager } from './InputManager';
import { IsometricRenderer } from './IsometricRenderer';

export class GameEngine {
  private renderer: IsometricRenderer;
  private inputManager: InputManager;
  private audioManager: AudioManager;
  private worldSystem: WorldSystem;
  private combatSystem: CombatSystem;
  private contractSystem: ContractSystem;
  private hackingSystem: HackingSystem;
  private inventorySystem: InventorySystem;
  private movementSystem: TacticalMovementSystem;
  private multiplayerSystem: MultiplayerSystem;
  private uiSystem: UISystem;
  private loadingSystem: LoadingSystem;
  private buildingInteractionSystem: BuildingInteractionSystem;
  private characterAnimationSystem: CharacterAnimationSystem;

  private isRunning = false;
  private lastTime = 0;
  private deltaTime = 0;
  private isWorldLoaded = false;

  // Smart chunk loading
  private lastChunkCheckPosition = { x: 0, y: 0 };
  private chunkLoadDistance = 800; // Distance from edge before loading new chunks
  private lastChunkLoadTime = 0;
  private chunkLoadCooldown = 2000; // 2 second cooldown between chunk loads

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new IsometricRenderer(canvas);
    this.inputManager = new InputManager(canvas);
    this.audioManager = new AudioManager();
    this.worldSystem = new WorldSystem();

    // Initialize loading system
    this.loadingSystem = new LoadingSystem(this.worldSystem);

    // Initialize multiplayer system
    this.multiplayerSystem = new MultiplayerSystem();

    // Pass worldSystem to systems that need collision detection
    this.combatSystem = new CombatSystem(this.worldSystem);
    this.movementSystem = new TacticalMovementSystem(this.worldSystem);

    this.contractSystem = new ContractSystem();
    this.hackingSystem = new HackingSystem();
    this.inventorySystem = new InventorySystem();
    this.uiSystem = new UISystem(canvas, this.combatSystem);
    this.buildingInteractionSystem = new BuildingInteractionSystem(
      this.worldSystem
    );
    this.characterAnimationSystem = new CharacterAnimationSystem();

    this.setupEventListeners();
    // Don't initialize demo player yet - wait for world to load
  }

  private setupEventListeners() {
    // Movement event from MovementSystem
    window.addEventListener('playerMovement', (e: any) => {
      this.handlePlayerMovement(e.detail);
    });

    this.inputManager.on('action', (data: any) => {
      this.handlePlayerAction(data);
    });

    // Combat system events
    this.combatSystem.on('shotFired', (data: any) => {
      console.log('Shot fired by:', data.playerId);

      // Trigger shooting animation
      const shootDirection = new Vector2(
        data.target.x - data.playerPosition.x,
        data.target.y - data.playerPosition.y
      );
      this.characterAnimationSystem?.triggerShootingAnimation(
        data.playerId,
        shootDirection
      );
    });

    this.combatSystem.on('projectileHit', (data: any) => {
      console.log('Projectile hit:', data);
      if (data.collision.type === 'world') {
        // Create explosion effect for world hits
        // TODO: Implement explosion effects in renderer
        console.log('Explosion at:', data.collision.position);
      }
    });

    this.combatSystem.on('damageDealt', (data: any) => {
      console.log('Damage dealt:', data.damage, 'to player:', data.targetId);

      // Trigger damage animation for the target
      this.characterAnimationSystem?.triggerDamageAnimation(data.targetId);

      // Show damage number at target location
      const targetPlayer = this.worldSystem.getPlayer(data.targetId);
      if (targetPlayer) {
        const screenPos = this.renderer.worldToScreen({
          x: targetPlayer.position.x,
          y: targetPlayer.position.y,
        });
        this.uiSystem.addDamageNumber(
          screenPos.x,
          screenPos.y - 20,
          data.damage,
          data.damage > 50
        );
      }
    });

    this.combatSystem.on('playerKilled', (data: any) => {
      console.log('Player killed:', data.targetId, 'by:', data.killerId);

      // Trigger death animation for the victim
      this.characterAnimationSystem?.triggerDeathAnimation(data.targetId);

      // Add to kill feed
      const killerPlayer = this.worldSystem.getPlayer(data.killerId);
      const victimPlayer = this.worldSystem.getPlayer(data.targetId);
      if (killerPlayer && victimPlayer) {
        this.uiSystem.addKillFeedEntry(
          killerPlayer.username,
          victimPlayer.username,
          'pistol'
        );
      }

      // TODO: Handle respawn
    });

    this.combatSystem.on('reloadStarted', (data: any) => {
      console.log('Reload started for:', data.playerId);

      // Trigger reload animation
      this.characterAnimationSystem?.setCharacterReloading(data.playerId, true);
    });

    this.combatSystem.on('reloadComplete', (data: any) => {
      console.log('Reload complete for:', data.playerId);

      // Stop reload animation
      this.characterAnimationSystem?.setCharacterReloading(
        data.playerId,
        false
      );
    });

    // Game system events - commented out until event systems are properly implemented
    // this.worldSystem.on('chunkLoaded', (chunk) => {
    //   this.renderer.addChunk(chunk)
    // })

    // this.contractSystem.on('contractUpdate', (contract) => {
    //   this.handleContractUpdate(contract)
    // })
  }

  private handlePlayerAction(data: any) {
    switch (data.type) {
      case 'shoot':
        this.combatSystem.handleShooting(data);
        break;
      case 'hack':
        this.hackingSystem.handleHacking(data);
        // Trigger hacking animation
        this.characterAnimationSystem?.setCharacterHacking('demo-player', true);
        // Auto-stop hacking animation after a delay (simulating hack completion)
        setTimeout(() => {
          this.characterAnimationSystem?.setCharacterHacking(
            'demo-player',
            false
          );
        }, 2000);
        break;
      case 'interact':
        this.worldSystem.handleInteraction(data);
        // Trigger interaction animation
        this.characterAnimationSystem?.setCharacterInteracting(
          'demo-player',
          true
        );
        // Auto-stop interaction animation after a delay
        setTimeout(() => {
          this.characterAnimationSystem?.setCharacterInteracting(
            'demo-player',
            false
          );
        }, 1500);
        break;
      case 'inventory':
        this.inventorySystem.handleInventoryAction(
          data.action,
          data,
          'demo-player'
        ); // Fixed parameters
        break;
      case 'roll':
        // Trigger roll animation
        this.characterAnimationSystem?.rollCharacter('demo-player');
        break;
      case 'prone':
        // Toggle prone animation
        this.characterAnimationSystem?.setCharacterProne(
          'demo-player',
          data.isProne
        );
        break;
    }
  }

  private handlePlayerMovement(movementData: any) {
    // Send movement to multiplayer system for network synchronization
    if (
      this.multiplayerSystem &&
      movementData.position &&
      movementData.velocity
    ) {
      this.multiplayerSystem.sendMovement(
        movementData.position,
        movementData.velocity,
        movementData.facing || 0
      );
    }
  }

  private async initializeDemoPlayer() {
    // Import Player class for proper multiplayer integration
    const { Player } = await import('../entities/Player');

    // Create a proper Player instance for multiplayer
    const demoPlayer = new Player('demo-player', 'TestPlayer', {
      x: 500,
      y: 500,
    });

    console.log('Initializing demo player at:', demoPlayer.position);

    // Set player in movement system
    this.movementSystem.setPlayer(demoPlayer);

    // Add player to world system
    this.worldSystem.addPlayer(demoPlayer);

    // Initialize player in combat system
    this.combatSystem.initializePlayer(demoPlayer.id, 100, 0);

    // Set local player in multiplayer system
    this.multiplayerSystem.setLocalPlayer(demoPlayer);

    // Initialize character animations
    try {
      await this.characterAnimationSystem.initializeCharacter(demoPlayer.id);
      console.log('✅ Character animations initialized for demo player');
    } catch (error) {
      console.error('❌ Failed to initialize character animations:', error);
    }

    // Set initial camera position to follow player immediately
    const playerTileX = demoPlayer.position.x / 50;
    const playerTileY = demoPlayer.position.y / 50;
    // Use renderer's fair zoom instead of hardcoded value
    this.renderer?.setCameraPosition({ x: playerTileX, y: playerTileY });
    console.log(
      `Initial camera set to (${playerTileX}, ${playerTileY}) for player at (${demoPlayer.position.x}, ${demoPlayer.position.y})`
    );

    // Force camera update to ensure it's following
    this.updateCamera();

    console.log(
      'Player initialized, world has players:',
      this.worldSystem.getPlayers().length
    );
  }

  private processCombatInput() {
    const combatAction = this.inputManager.getCombatInput();
    const playerPosition = this.movementSystem.getPlayerPosition();
    const mousePos = this.inputManager.getMousePosition();

    if (combatAction === 'shoot') {
      // Convert screen coordinates to world coordinates using isometric projection
      const worldTarget = this.renderer.screenToWorld(mousePos.x, mousePos.y);

      const shootData = {
        playerId: 'demo-player',
        playerPosition,
        target: worldTarget,
        weapon: 'pistol', // Default weapon
      };

      const result = this.combatSystem.handleShooting(shootData);
      if (result.success) {
        // Add muzzle flash effect
        // TODO: Implement muzzle flash effects in renderer
        console.log('Muzzle flash at:', playerPosition);
        console.log('Shot fired at:', worldTarget);
      }
    } else if (combatAction === 'reload') {
      this.combatSystem.startReload('demo-player', 'pistol');
      console.log('Reloading...');
    }
  }

  private processActionInput() {
    const actionInput = this.inputManager.getActionInput();
    const playerPosition = this.movementSystem.getPlayerPosition();

    if (actionInput) {
      // Handle building interaction separately
      if (actionInput === 'interact') {
        const interacted = this.buildingInteractionSystem?.interact();
        if (interacted) {
          console.log(
            '🚪 Building interaction:',
            this.buildingInteractionSystem?.isInside() ? 'Entered' : 'Exited'
          );
          return; // Don't pass to other systems
        }
      }

      const actionData = {
        type: actionInput,
        playerId: 'demo-player',
        position: playerPosition,
      };

      this.handlePlayerAction(actionData);
    }
  }

  private updateCamera() {
    try {
      const playerPosition = this.movementSystem?.getPlayerPosition();
      if (!playerPosition) {
        console.warn('GameEngine: No player position available for camera');
        return;
      }

      // Always update camera to follow player
      // Convert player world position to tile coordinates for camera
      const targetX = playerPosition.x / 50; // Convert to tile coordinates
      const targetY = playerPosition.y / 50;

      // Safety checks for valid numbers
      if (!isFinite(targetX) || !isFinite(targetY)) {
        console.warn('GameEngine: Invalid player position for camera:', {
          targetX,
          targetY,
        });
        return;
      }

      // Use smooth camera following instead of direct positioning
      this.renderer?.setCameraTarget(new Vector2(targetX, targetY));
      this.renderer?.updateCameraSystem(this.deltaTime);
      // console.log(`Camera target set to (${targetX}, ${targetY}) following player at world (${playerPosition.x}, ${playerPosition.y})`) // Reduced logging
    } catch (error) {
      console.error('GameEngine: Error updating camera:', error);
    }
  }

  // private handleCombatEvent(event: any) {
  //   // Handle combat events (damage, death, etc.)
  //   console.log('Combat event:', event)
  // }

  // private handleContractUpdate(contract: any) {
  //   // Handle contract updates
  //   console.log('Contract update:', contract)
  // }

  // Start loading the world (call this first)
  async startLoading(
    onProgress?: (progress: LoadingProgress) => void,
    onComplete?: () => void,
    spawnPosition = { x: 0, y: 0 },
    chunkRadius = 0
  ): Promise<void> {
    console.log('🌍 GameEngine: Starting world loading...');

    try {
      await this.loadingSystem.startLoading(
        spawnPosition,
        chunkRadius,
        onProgress,
        () => {
          this.isWorldLoaded = true;
          this.initializeDemoPlayer();
          console.log('✅ GameEngine: World loaded and ready!');
          onComplete?.();
        }
      );
    } catch (error) {
      console.error('❌ GameEngine: Loading failed:', error);
      throw error;
    }
  }

  // Start the game loop (call this after loading is complete)
  start() {
    if (this.isRunning) return;
    if (!this.isWorldLoaded) {
      console.warn('GameEngine: Cannot start game before world is loaded!');
      return;
    }

    this.isRunning = true;
    console.log('🎮 GameEngine: Starting game loop...');
    this.gameLoop();
  }

  stop() {
    this.isRunning = false;
  }

  private gameLoop(currentTime: number = 0) {
    if (!this.isRunning) return;

    try {
      // Calculate delta time with safety checks
      if (this.lastTime === 0) {
        this.deltaTime = 16; // Default to ~60fps for first frame
      } else {
        this.deltaTime = Math.min(currentTime - this.lastTime, 50); // Cap at 50ms to prevent large jumps
      }
      this.lastTime = currentTime;

      // Skip frame if deltaTime is invalid
      if (this.deltaTime <= 0 || !isFinite(this.deltaTime)) {
        requestAnimationFrame(time => this.gameLoop(time));
        return;
      }

      // Update game systems
      this.update(this.deltaTime);

      // Render frame
      this.render();
    } catch (error) {
      console.error('GameEngine: Error in game loop:', error);
      // Continue the loop even if there's an error to prevent complete freeze
    }

    // Continue loop
    requestAnimationFrame(time => this.gameLoop(time));
  }

  private update(_deltaTime: number) {
    // Only update if world is loaded
    if (!this.isWorldLoaded) return;

    try {
      // Update all game systems with error handling
      this.movementSystem?.update(_deltaTime, this.inputManager);
      this.multiplayerSystem?.update(_deltaTime);
      this.worldSystem?.update(_deltaTime);
      this.combatSystem?.update(_deltaTime);
      this.contractSystem?.update(_deltaTime);
      this.hackingSystem?.update(_deltaTime);
      this.inventorySystem?.update(_deltaTime);

      // Update character animations
      this.characterAnimationSystem?.update(_deltaTime);

      // Update character animation based on movement
      const playerPosition = this.movementSystem.getPlayerPosition();
      const playerVelocity = this.movementSystem.getPlayerVelocity();
      if (playerPosition && playerVelocity) {
        this.characterAnimationSystem?.updateCharacterMovement(
          'demo-player',
          new Vector2(playerPosition.x, playerPosition.y),
          new Vector2(playerVelocity.x, playerVelocity.y)
        );
      }

      // Update UI system
      this.uiSystem?.update(_deltaTime, playerPosition);

      // Update building interaction
      this.buildingInteractionSystem?.update(playerPosition);

      // Handle combat input
      this.processCombatInput();

      // Handle action input
      this.processActionInput();

      // Update camera to follow player
      this.updateCamera();

      // Debug: Log player position every few frames
      if (Math.floor(Date.now() / 1000) % 2 === 0) {
        const playerPos = this.movementSystem.getPlayerPosition();
        console.log('Player position:', playerPos);
      }

      // Check if we need to load more chunks (smart loading)
      this.checkChunkBoundaries();
    } catch (error) {
      console.error('GameEngine: Error in update:', error);
    }
  }

  private render() {
    // Only render if world is loaded
    if (!this.isWorldLoaded) {
      // Show simple loading message if not using loading screen
      // this.renderer?.clear();
      return;
    }

    try {
      // Clear canvas
      this.renderer?.clear();

      // Get current player position for interaction feedback
      // const _playerPosition = this.movementSystem?.getPlayerPosition() || {
      //   x: 0,
      //   y: 0,
      // };

      // Render world with player position for interaction feedback
      const worldState = this.worldSystem?.getWorldState();
      if (worldState) {
        console.log(
          'GameEngine: Rendering world with',
          worldState.chunks?.length || 0,
          'chunks'
        );
        this.renderer?.renderWorld(
          worldState.chunks || [],
          worldState.buildings || [],
          worldState.infrastructure || [],
          worldState.npcs || [],
          worldState.loot || []
        );
      } else {
        console.warn('GameEngine: No world state to render!');
      }

      // Render players (local + remote from multiplayer system)
      const localPlayers = this.worldSystem?.getPlayers() || [];
      const remotePlayers = this.multiplayerSystem?.getRemotePlayers() || [];
      const allPlayers = [...localPlayers, ...remotePlayers];

      if (allPlayers.length > 0) {
        this.renderer?.renderPlayers(allPlayers);
      }

      // Render projectiles
      const projectiles = this.combatSystem?.getProjectiles();
      if (projectiles) {
        this.renderer?.renderProjectiles(projectiles);
      }

      // Process render queue and apply lighting
      this.renderer?.renderWithLighting();

      // Update performance stats
      this.renderer?.updateFrameStats();

      // Render UI (new system replaces old crosshair/scanlines)
      this.uiSystem?.render();
    } catch (error) {
      console.error('GameEngine: Error in render:', error);
    }
  }

  // Smart chunk loading - only load when player approaches world boundaries
  private checkChunkBoundaries(): void {
    try {
      const playerPosition = this.movementSystem?.getPlayerPosition();
      if (!playerPosition) return;

      const currentTime = performance.now();

      // Check if enough time has passed since last chunk load
      if (currentTime - this.lastChunkLoadTime < this.chunkLoadCooldown) {
        return;
      }

      // Check if player has moved significantly since last check
      const dx = playerPosition.x - this.lastChunkCheckPosition.x;
      const dy = playerPosition.y - this.lastChunkCheckPosition.y;
      const distanceMoved = Math.sqrt(dx * dx + dy * dy);

      // Only check boundaries if player has moved at least 100 pixels
      if (distanceMoved < 100) {
        return;
      }

      this.lastChunkCheckPosition = {
        x: playerPosition.x,
        y: playerPosition.y,
      };

      // Check if player is approaching the edge of loaded chunks
      const chunkSize = 1000;
      const playerChunkX = Math.floor(playerPosition.x / chunkSize);
      const playerChunkY = Math.floor(playerPosition.y / chunkSize);

      // Check distance to nearest chunk boundary
      const chunkLocalX = playerPosition.x % chunkSize;
      const chunkLocalY = playerPosition.y % chunkSize;

      // Calculate distances to each edge of current chunk
      const distToLeftEdge = chunkLocalX;
      const distToRightEdge = chunkSize - chunkLocalX;
      const distToTopEdge = chunkLocalY;
      const distToBottomEdge = chunkSize - chunkLocalY;

      // Find the minimum distance to any edge
      const minDistanceToEdge = Math.min(
        distToLeftEdge,
        distToRightEdge,
        distToTopEdge,
        distToBottomEdge
      );

      // If player is close to an edge, check if we need to load chunks
      if (minDistanceToEdge < this.chunkLoadDistance) {
        console.log(
          `🗺️ Player approaching chunk boundary (${minDistanceToEdge.toFixed(0)}px from edge)`
        );

        // Determine which direction player is heading and load chunks in that direction
        let chunksToCheck: { x: number; y: number }[] = [];

        // Check which edges are close
        if (distToLeftEdge < this.chunkLoadDistance) {
          chunksToCheck.push({ x: playerChunkX - 1, y: playerChunkY });
          console.log(
            `🔄 Checking left chunk (${playerChunkX - 1}, ${playerChunkY})`
          );
        }
        if (distToRightEdge < this.chunkLoadDistance) {
          chunksToCheck.push({ x: playerChunkX + 1, y: playerChunkY });
          console.log(
            `🔄 Checking right chunk (${playerChunkX + 1}, ${playerChunkY})`
          );
        }
        if (distToTopEdge < this.chunkLoadDistance) {
          chunksToCheck.push({ x: playerChunkX, y: playerChunkY - 1 });
          console.log(
            `🔄 Checking top chunk (${playerChunkX}, ${playerChunkY - 1})`
          );
        }
        if (distToBottomEdge < this.chunkLoadDistance) {
          chunksToCheck.push({ x: playerChunkX, y: playerChunkY + 1 });
          console.log(
            `🔄 Checking bottom chunk (${playerChunkX}, ${playerChunkY + 1})`
          );
        }

        // Load missing chunks
        this.loadMissingChunks(chunksToCheck);
      }
    } catch (error) {
      console.warn('GameEngine: Error in chunk boundary check:', error);
    }
  }

  // Load chunks that don't exist yet with performance safeguards
  private loadMissingChunks(chunks: { x: number; y: number }[]): void {
    let chunksLoaded = 0;
    const maxChunksPerFrame = 2; // Limit chunks loaded per frame to prevent stuttering

    for (const { x, y } of chunks) {
      if (chunksLoaded >= maxChunksPerFrame) {
        console.log(
          `🔄 Chunk loading limited: ${chunksLoaded}/${chunks.length} chunks loaded this frame`
        );
        break;
      }

      const chunkId = `chunk_${x}_${y}`;

      // Only load if chunk doesn't exist
      if (!this.worldSystem?.getChunk(chunkId)) {
        try {
          const startTime = performance.now();
          const chunk = this.worldSystem?.generateChunkIfNeeded(x, y);
          const loadTime = performance.now() - startTime;

          if (chunk) {
            chunksLoaded++;
            console.log(
              `📦 Loaded chunk (${x}, ${y}) in ${loadTime.toFixed(1)}ms (${chunk.generatedData?.buildings?.length || 0} buildings)`
            );

            // Break if chunk took too long to load (prevent frame drops)
            if (loadTime > 30) {
              // Reduced from 50ms to 30ms for better performance
              console.warn(
                `⚠️ Chunk loading took ${loadTime.toFixed(1)}ms - stopping to prevent frame drops`
              );
              break;
            }
          }
        } catch (error) {
          console.warn(`❌ Failed to load chunk (${x}, ${y}):`, error);
        }
      }
    }

    if (chunksLoaded > 0) {
      this.lastChunkLoadTime = performance.now();
      console.log(`✅ Loaded ${chunksLoaded} new chunks near player`);

      // Update world state with new chunks and clean up distant chunks
      if (this.worldSystem) {
        this.cleanupDistantChunks();
        const worldState = this.worldSystem.getWorldState();
        if (worldState) {
          worldState.chunks = Array.from(this.worldSystem.getChunks());
        }
      }
    }
  }

  // Clean up distant chunks to prevent memory bloat
  private cleanupDistantChunks(): void {
    try {
      const playerPosition = this.movementSystem?.getPlayerPosition();
      if (!playerPosition) return;

      const maxChunks = 25; // Maximum number of chunks to keep loaded
      const maxDistance = 2500; // Maximum distance to keep chunks loaded (world pixels)
      const chunkSize = 1000;

      const loadedChunks = Array.from(this.worldSystem?.getChunks() || []);

      if (loadedChunks.length <= maxChunks) return; // No cleanup needed

      // Calculate distances and find chunks to unload
      const chunksWithDistance = loadedChunks.map(chunk => {
        const chunkCenterX = chunk.x * chunkSize + chunkSize / 2;
        const chunkCenterY = chunk.y * chunkSize + chunkSize / 2;
        const dx = chunkCenterX - playerPosition.x;
        const dy = chunkCenterY - playerPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return { chunk, distance };
      });

      // Sort by distance and unload the furthest chunks
      chunksWithDistance.sort((a, b) => b.distance - a.distance);

      let chunksUnloaded = 0;
      for (const { chunk, distance } of chunksWithDistance) {
        if (loadedChunks.length - chunksUnloaded <= maxChunks) break;
        if (distance > maxDistance) {
          this.worldSystem?.removeChunk(chunk.id);
          chunksUnloaded++;
        }
      }

      if (chunksUnloaded > 0) {
        console.log(
          `🧹 Unloaded ${chunksUnloaded} distant chunks, ${loadedChunks.length - chunksUnloaded} remain`
        );
      }
    } catch (error) {
      console.warn('GameEngine: Error cleaning up chunks:', error);
    }
  }

  // Public methods for external access
  getWorldSystem() {
    return this.worldSystem;
  }

  getCombatSystem() {
    return this.combatSystem;
  }

  getContractSystem() {
    return this.contractSystem;
  }

  getHackingSystem() {
    return this.hackingSystem;
  }

  getInventorySystem() {
    return this.inventorySystem;
  }

  getRenderer() {
    return this.renderer;
  }

  getMovementSystem() {
    return this.movementSystem;
  }

  getBuildingInteractionSystem() {
    return this.buildingInteractionSystem;
  }

  getCharacterAnimationSystem() {
    return this.characterAnimationSystem;
  }

  // Set the current player for movement
  setPlayer(player: any) {
    this.movementSystem.setPlayer(player);
    // Add player to world system
    this.worldSystem.addPlayer(player);
  }

  // Loading system getters
  getLoadingSystem() {
    return this.loadingSystem;
  }

  isWorldReady(): boolean {
    return this.isWorldLoaded;
  }

  // Get current loading progress (if loading)
  getLoadingProgress() {
    return this.loadingSystem?.getProgress();
  }

  // Check if currently loading
  isCurrentlyLoading(): boolean {
    return this.loadingSystem?.isCurrentlyLoading() || false;
  }

  // Set chunk loading parameters
  setChunkLoadingParams(distance: number = 800, cooldown: number = 2000): void {
    this.chunkLoadDistance = distance;
    this.chunkLoadCooldown = cooldown;
  }

  // Cleanup
  destroy() {
    this.stop();
    this.inputManager.destroy();
    this.audioManager.destroy();
    this.loadingSystem?.cancelLoading();
    this.characterAnimationSystem?.destroy();
  }
}
