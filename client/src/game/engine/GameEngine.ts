// Core game engine
import { IsometricRenderer } from './IsometricRenderer'
import { InputManager } from './InputManager'
import { AudioManager } from './AudioManager'
import { WorldSystem } from '../systems/WorldSystem'
import { CombatSystem } from '../systems/CombatSystem'
import { ContractSystem } from '../systems/ContractSystem'
import { HackingSystem } from '../systems/HackingSystem'
import { InventorySystem } from '../systems/InventorySystem'
import { IsometricMovementSystem } from '../systems/IsometricMovementSystem'
import { UISystem } from '../systems/UISystem'
import { LoadingSystem, LoadingProgress } from '../systems/LoadingSystem'
import { BuildingInteractionSystem } from '../systems/BuildingInteractionSystem'

export class GameEngine {
  private renderer: IsometricRenderer
  private inputManager: InputManager
  private audioManager: AudioManager
  private worldSystem: WorldSystem
  private combatSystem: CombatSystem
  private contractSystem: ContractSystem
  private hackingSystem: HackingSystem
  private inventorySystem: InventorySystem
  private movementSystem: IsometricMovementSystem
  private uiSystem: UISystem
  private loadingSystem: LoadingSystem
  private buildingInteractionSystem: BuildingInteractionSystem
  
  private isRunning = false
  private lastTime = 0
  private deltaTime = 0
  private isWorldLoaded = false
  
  // Smart chunk loading
  private lastChunkCheckPosition = { x: 0, y: 0 }
  private chunkLoadDistance = 800 // Distance from edge before loading new chunks
  private lastChunkLoadTime = 0
  private chunkLoadCooldown = 2000 // 2 second cooldown between chunk loads

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new IsometricRenderer(canvas)
    this.inputManager = new InputManager(canvas)
    this.audioManager = new AudioManager()
    this.worldSystem = new WorldSystem()
    
    // Initialize loading system
    this.loadingSystem = new LoadingSystem(this.worldSystem)
    
    // Pass worldSystem to systems that need collision detection
    this.combatSystem = new CombatSystem(this.worldSystem)
    this.movementSystem = new IsometricMovementSystem(this.worldSystem)
    
    this.contractSystem = new ContractSystem()
    this.hackingSystem = new HackingSystem()
    this.inventorySystem = new InventorySystem()
    this.uiSystem = new UISystem(canvas, this.combatSystem)
    this.buildingInteractionSystem = new BuildingInteractionSystem(this.worldSystem)
    
    this.setupEventListeners()
    // Don't initialize demo player yet - wait for world to load
  }

  private setupEventListeners() {
    // Movement event from MovementSystem
    window.addEventListener('playerMovement', (e: any) => {
      this.handlePlayerMovement(e.detail)
    })

    this.inputManager.on('action', (data: any) => {
      this.handlePlayerAction(data)
    })

    // Combat system events
    this.combatSystem.on('shotFired', (data: any) => {
      console.log('Shot fired by:', data.playerId)
    })
    
    this.combatSystem.on('projectileHit', (data: any) => {
      console.log('Projectile hit:', data)
      if (data.collision.type === 'world') {
        // Create explosion effect for world hits
        this.renderer.createExplosion(data.collision.position)
      }
    })
    
    this.combatSystem.on('damageDealt', (data: any) => {
      console.log('Damage dealt:', data.damage, 'to player:', data.targetId)
      
      // Show damage number at target location
      const targetPlayer = this.worldSystem.getPlayer(data.targetId)
      if (targetPlayer) {
        const screenPos = this.screenToWorld(targetPlayer.position)
        this.uiSystem.addDamageNumber(screenPos.x, screenPos.y - 20, data.damage, data.damage > 50)
      }
    })
    
    this.combatSystem.on('playerKilled', (data: any) => {
      console.log('Player killed:', data.targetId, 'by:', data.killerId)
      
      // Add to kill feed
      const killerPlayer = this.worldSystem.getPlayer(data.killerId)
      const victimPlayer = this.worldSystem.getPlayer(data.targetId)
      if (killerPlayer && victimPlayer) {
        this.uiSystem.addKillFeedEntry(killerPlayer.username, victimPlayer.username, 'pistol')
      }
      
      // TODO: Handle respawn
    })
    
    this.combatSystem.on('reloadStarted', (data: any) => {
      console.log('Reload started for:', data.playerId)
    })
    
    this.combatSystem.on('reloadComplete', (data: any) => {
      console.log('Reload complete for:', data.playerId)
    })

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
        this.combatSystem.handleShooting(data)
        break
      case 'hack':
        this.hackingSystem.handleHacking(data)
        break
      case 'interact':
        this.worldSystem.handleInteraction(data)
        break
      case 'inventory':
        this.inventorySystem.handleInventoryAction(data.action, data, 'demo-player') // Fixed parameters
        break
    }
  }
  
  private handlePlayerMovement(movementData: any) {
    // Send movement to server via WebSocket
    // For now, we'll log it for debugging
    console.log('Player movement:', movementData)
    
    // In a real implementation, this would send to server:
    // this.networkManager.sendPlayerMovement(movementData)
  }
  
  private initializeDemoPlayer() {
    // Create a demo player for testing
    const demoPlayer = {
      id: 'demo-player',
      username: 'TestPlayer',
      position: { x: 0, y: 0 },
      health: 100,
      credits: 1000,
      isAlive: true
    }
    
    // Set player in movement system
    this.movementSystem.setPlayer(demoPlayer)
    
    // Add player to world system
    this.worldSystem.addPlayer(demoPlayer)
    
    // Initialize player in combat system
    this.combatSystem.initializePlayer(demoPlayer.id, 100, 0)
  }
  
  private processCombatInput() {
    const combatAction = this.inputManager.getCombatInput()
    const playerPosition = this.movementSystem.getPlayerPosition()
    const mousePos = this.inputManager.getMousePosition()
    
    if (combatAction === 'shoot') {
      // Convert screen coordinates to world coordinates using isometric projection
      const worldTarget = this.renderer.screenToWorld(mousePos.x, mousePos.y)
      
      const shootData = {
        playerId: 'demo-player',
        playerPosition,
        target: worldTarget,
        weapon: 'pistol' // Default weapon
      }
      
      const result = this.combatSystem.handleShooting(shootData)
      if (result.success) {
        // Add muzzle flash effect
        this.renderer.createMuzzleFlash(playerPosition)
        console.log('Shot fired at:', worldTarget)
      }
    } else if (combatAction === 'reload') {
      this.combatSystem.startReload('demo-player', 'pistol')
      console.log('Reloading...')
    }
  }
  
  private processActionInput() {
    const actionInput = this.inputManager.getActionInput()
    const playerPosition = this.movementSystem.getPlayerPosition()
    
    if (actionInput) {
      // Handle building interaction separately
      if (actionInput === 'interact') {
        const interacted = this.buildingInteractionSystem?.interact()
        if (interacted) {
          console.log('🚪 Building interaction:', this.buildingInteractionSystem?.isInside() ? 'Entered' : 'Exited')
          return // Don't pass to other systems
        }
      }

      const actionData = {
        type: actionInput,
        playerId: 'demo-player',
        position: playerPosition
      }
      
      this.handlePlayerAction(actionData)
    }
  }
  
  private updateCamera() {
    try {
      const playerPosition = this.movementSystem?.getPlayerPosition()
      if (!playerPosition) return
      
      // Always update camera to follow player
      const currentCamera = this.renderer?.getCamera()
      if (!currentCamera) return
      
      const lerpFactor = 0.2 // Snappier camera for ARPG feel
      
      // Add slight camera lead based on player velocity (Diablo-like feel)
      const vel = this.movementSystem.getPlayerVelocity?.()
      const leadScale = 0.15
      const targetX = playerPosition.x + (vel ? vel.x * leadScale : 0)
      const targetY = playerPosition.y + (vel ? vel.y * leadScale : 0)
      
      // Safety checks for valid numbers
      if (!isFinite(targetX) || !isFinite(targetY)) return
      
      const newX = currentCamera.x + (targetX - currentCamera.x) * lerpFactor
      const newY = currentCamera.y + (targetY - currentCamera.y) * lerpFactor
      
      // Safety checks for camera position
      if (isFinite(newX) && isFinite(newY)) {
        this.renderer?.setCamera(newX, newY, currentCamera.zoom)
      }
    } catch (error) {
      console.error('GameEngine: Error updating camera:', error)
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
    chunkRadius = 2
  ): Promise<void> {
    console.log('🌍 GameEngine: Starting world loading...')
    
    try {
      await this.loadingSystem.startLoading(
        spawnPosition,
        chunkRadius,
        onProgress,
        () => {
          this.isWorldLoaded = true
          this.initializeDemoPlayer()
          console.log('✅ GameEngine: World loaded and ready!')
          onComplete?.()
        }
      )
    } catch (error) {
      console.error('❌ GameEngine: Loading failed:', error)
      throw error
    }
  }
  
  // Start the game loop (call this after loading is complete)
  start() {
    if (this.isRunning) return
    if (!this.isWorldLoaded) {
      console.warn('GameEngine: Cannot start game before world is loaded!')
      return
    }
    
    this.isRunning = true
    console.log('🎮 GameEngine: Starting game loop...')
    this.gameLoop()
  }

  stop() {
    this.isRunning = false
  }

  private gameLoop(currentTime: number = 0) {
    if (!this.isRunning) return

    try {
      // Calculate delta time with safety checks
      if (this.lastTime === 0) {
        this.deltaTime = 16 // Default to ~60fps for first frame
      } else {
        this.deltaTime = Math.min(currentTime - this.lastTime, 50) // Cap at 50ms to prevent large jumps
      }
      this.lastTime = currentTime

      // Skip frame if deltaTime is invalid
      if (this.deltaTime <= 0 || !isFinite(this.deltaTime)) {
        requestAnimationFrame((time) => this.gameLoop(time))
        return
      }

      // Update game systems
      this.update(this.deltaTime)
      
      // Render frame
      this.render()
    } catch (error) {
      console.error('GameEngine: Error in game loop:', error)
      // Continue the loop even if there's an error to prevent complete freeze
    }
    
    // Continue loop
    requestAnimationFrame((time) => this.gameLoop(time))
  }

  private update(_deltaTime: number) {
    // Only update if world is loaded
    if (!this.isWorldLoaded) return
    
    try {
      // Update all game systems with error handling
      this.movementSystem?.update(_deltaTime, this.inputManager)
      this.worldSystem?.update(_deltaTime)
      this.combatSystem?.update(_deltaTime)
      this.contractSystem?.update(_deltaTime)
      this.hackingSystem?.update(_deltaTime)
      this.inventorySystem?.update(_deltaTime)
      
      // Update UI system
      const playerPosition = this.movementSystem.getPlayerPosition()
      this.uiSystem?.update(_deltaTime, playerPosition)
      
      // Update building interaction
      this.buildingInteractionSystem?.update(playerPosition)
      
      // Handle combat input
      this.processCombatInput()
      
      // Handle action input 
      this.processActionInput()
      
      // Update camera to follow player
      this.updateCamera()
      
      // Check if we need to load more chunks (smart loading)
      this.checkChunkBoundaries()
    } catch (error) {
      console.error('GameEngine: Error in update:', error)
    }
  }

  private render() {
    // Only render if world is loaded
    if (!this.isWorldLoaded) {
      // Show simple loading message if not using loading screen
      this.renderer?.clear()
      return
    }
    
    try {
      // Clear canvas
      this.renderer?.clear()
      
      // Get current player position for interaction feedback
      const playerPosition = this.movementSystem?.getPlayerPosition() || { x: 0, y: 0 }
      
      // Optional player light to improve readability
      this.renderer?.addLight({ x: playerPosition.x, y: playerPosition.y, z: 50, intensity: 0.6, color: '#44aaff', radius: 180 })

      // Render world with player position for interaction feedback
      const worldState = this.worldSystem?.getWorldState()
      if (worldState) {
        this.renderer?.renderWorld(worldState, playerPosition)
      }
      
      // Render players
      const players = this.worldSystem?.getPlayers()
      if (players) {
        this.renderer?.renderPlayers(players)
      }
      
      // Render projectiles
      const projectiles = this.combatSystem?.getProjectiles()
      if (projectiles) {
        this.renderer?.renderProjectiles(projectiles)
      }
      
      // Render UI (new system replaces old crosshair/scanlines)
      this.uiSystem?.render()
    } catch (error) {
      console.error('GameEngine: Error in render:', error)
    }
  }
  
  // Smart chunk loading - only load when player approaches world boundaries
  private checkChunkBoundaries(): void {
    try {
      const playerPosition = this.movementSystem?.getPlayerPosition()
      if (!playerPosition) return
      
      const currentTime = performance.now()
      
      // Check if enough time has passed since last chunk load
      if (currentTime - this.lastChunkLoadTime < this.chunkLoadCooldown) {
        return
      }
      
      // Check if player has moved significantly since last check
      const dx = playerPosition.x - this.lastChunkCheckPosition.x
      const dy = playerPosition.y - this.lastChunkCheckPosition.y
      const distanceMoved = Math.sqrt(dx * dx + dy * dy)
      
      // Only check boundaries if player has moved at least 100 pixels
      if (distanceMoved < 100) {
        return
      }
      
      this.lastChunkCheckPosition = { x: playerPosition.x, y: playerPosition.y }
      
      // Check if player is approaching the edge of loaded chunks
      const chunkSize = 1000
      const playerChunkX = Math.floor(playerPosition.x / chunkSize)
      const playerChunkY = Math.floor(playerPosition.y / chunkSize)
      
      // Check distance to nearest chunk boundary
      const chunkLocalX = playerPosition.x % chunkSize
      const chunkLocalY = playerPosition.y % chunkSize
      
      // Calculate distances to each edge of current chunk
      const distToLeftEdge = chunkLocalX
      const distToRightEdge = chunkSize - chunkLocalX
      const distToTopEdge = chunkLocalY
      const distToBottomEdge = chunkSize - chunkLocalY
      
      // Find the minimum distance to any edge
      const minDistanceToEdge = Math.min(distToLeftEdge, distToRightEdge, distToTopEdge, distToBottomEdge)
      
      // If player is close to an edge, check if we need to load chunks
      if (minDistanceToEdge < this.chunkLoadDistance) {
        console.log(`🗺️ Player approaching chunk boundary (${minDistanceToEdge.toFixed(0)}px from edge)`)
        
        // Determine which direction player is heading and load chunks in that direction
        let chunksToCheck: { x: number, y: number }[] = []
        
        // Check which edges are close
        if (distToLeftEdge < this.chunkLoadDistance) {
          chunksToCheck.push({ x: playerChunkX - 1, y: playerChunkY })
          console.log(`🔄 Checking left chunk (${playerChunkX - 1}, ${playerChunkY})`)
        }
        if (distToRightEdge < this.chunkLoadDistance) {
          chunksToCheck.push({ x: playerChunkX + 1, y: playerChunkY })
          console.log(`🔄 Checking right chunk (${playerChunkX + 1}, ${playerChunkY})`)
        }
        if (distToTopEdge < this.chunkLoadDistance) {
          chunksToCheck.push({ x: playerChunkX, y: playerChunkY - 1 })
          console.log(`🔄 Checking top chunk (${playerChunkX}, ${playerChunkY - 1})`)
        }
        if (distToBottomEdge < this.chunkLoadDistance) {
          chunksToCheck.push({ x: playerChunkX, y: playerChunkY + 1 })
          console.log(`🔄 Checking bottom chunk (${playerChunkX}, ${playerChunkY + 1})`)
        }
        
        // Load missing chunks
        this.loadMissingChunks(chunksToCheck)
      }
      
    } catch (error) {
      console.warn('GameEngine: Error in chunk boundary check:', error)
    }
  }
  
  // Load chunks that don't exist yet
  private loadMissingChunks(chunks: { x: number, y: number }[]): void {
    let chunksLoaded = 0
    
    for (const { x, y } of chunks) {
      const chunkId = `chunk_${x}_${y}`
      
      // Only load if chunk doesn't exist
      if (!this.worldSystem?.getChunk(chunkId)) {
        try {
          const startTime = performance.now()
          const chunk = this.worldSystem?.generateChunkIfNeeded(x, y)
          const loadTime = performance.now() - startTime
          
          if (chunk) {
            chunksLoaded++
            console.log(`📦 Loaded chunk (${x}, ${y}) in ${loadTime.toFixed(1)}ms`)
            
            // Break if chunk took too long to load (prevent frame drops)
            if (loadTime > 50) {
              console.warn(`⚠️ Chunk loading took ${loadTime.toFixed(1)}ms - stopping to prevent frame drops`)
              break
            }
          }
        } catch (error) {
          console.warn(`❌ Failed to load chunk (${x}, ${y}):`, error)
        }
      }
    }
    
    if (chunksLoaded > 0) {
      this.lastChunkLoadTime = performance.now()
      console.log(`✅ Loaded ${chunksLoaded} new chunks near player`)
      
      // Update world state with new chunks
      if (this.worldSystem) {
        const worldState = this.worldSystem.getWorldState()
        if (worldState) {
          worldState.chunks = Array.from(this.worldSystem.getChunks())
        }
      }
    }
  }

  // Public methods for external access
  getWorldSystem() {
    return this.worldSystem
  }

  getCombatSystem() {
    return this.combatSystem
  }

  getContractSystem() {
    return this.contractSystem
  }

  getHackingSystem() {
    return this.hackingSystem
  }

  getInventorySystem() {
    return this.inventorySystem
  }

  getRenderer() {
    return this.renderer
  }
  
  private screenToWorld(worldPos: { x: number; y: number }) {
    // Convert a world position (pixels) to screen coordinates using the isometric renderer
    return this.renderer.worldToScreen({ x: worldPos.x, y: worldPos.y })
  }
  
  getMovementSystem() {
    return this.movementSystem
  }

  getBuildingInteractionSystem() {
    return this.buildingInteractionSystem
  }
  
  // Set the current player for movement
  setPlayer(player: any) {
    this.movementSystem.setPlayer(player)
    // Add player to world system
    this.worldSystem.addPlayer(player)
  }

  // Loading system getters
  getLoadingSystem() {
    return this.loadingSystem
  }
  
  isWorldReady(): boolean {
    return this.isWorldLoaded
  }
  
  // Get current loading progress (if loading)
  getLoadingProgress() {
    return this.loadingSystem?.getProgress()
  }
  
  // Check if currently loading
  isCurrentlyLoading(): boolean {
    return this.loadingSystem?.isCurrentlyLoading() || false
  }
  
  // Set chunk loading parameters
  setChunkLoadingParams(distance: number = 800, cooldown: number = 2000): void {
    this.chunkLoadDistance = distance
    this.chunkLoadCooldown = cooldown
    console.log(`🔧 Updated chunk loading: distance=${distance}px, cooldown=${cooldown}ms`)
  }

  // Cleanup
  destroy() {
    this.stop()
    this.inputManager.destroy()
    this.audioManager.destroy()
    this.loadingSystem?.cancelLoading()
  }
}


