// Core game engine
import { Renderer } from './Renderer'
import { InputManager } from './InputManager'
import { AudioManager } from './AudioManager'
import { WorldSystem } from '../systems/WorldSystem'
import { CombatSystem } from '../systems/CombatSystem'
import { ContractSystem } from '../systems/ContractSystem'
import { HackingSystem } from '../systems/HackingSystem'
import { InventorySystem } from '../systems/InventorySystem'
import { MovementSystem } from '../systems/MovementSystem'
import { UISystem } from '../systems/UISystem'

export class GameEngine {
  private renderer: Renderer
  private inputManager: InputManager
  private audioManager: AudioManager
  private worldSystem: WorldSystem
  private combatSystem: CombatSystem
  private contractSystem: ContractSystem
  private hackingSystem: HackingSystem
  private inventorySystem: InventorySystem
  private movementSystem: MovementSystem
  private uiSystem: UISystem
  
  private isRunning = false
  private lastTime = 0
  private deltaTime = 0
  // private _fps = 60 // Unused for now
  // private frameTime = 1000 / this.fps // Unused variable removed

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas)
    this.inputManager = new InputManager(canvas)
    this.audioManager = new AudioManager()
    this.worldSystem = new WorldSystem()
    
    // Pass worldSystem to systems that need collision detection
    this.combatSystem = new CombatSystem(this.worldSystem)
    this.movementSystem = new MovementSystem(this.worldSystem)
    
    this.contractSystem = new ContractSystem()
    this.hackingSystem = new HackingSystem()
    this.inventorySystem = new InventorySystem()
    this.uiSystem = new UISystem(canvas, this.combatSystem)
    
    this.setupEventListeners()
    this.initializeDemoPlayer()
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
      // Convert screen coordinates to world coordinates
      const camera = this.renderer.getCamera()
      const worldTarget = {
        x: (mousePos.x - this.renderer.canvas.width / 2) / camera.zoom + camera.x,
        y: (mousePos.y - this.renderer.canvas.height / 2) / camera.zoom + camera.y
      }
      
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
      
      if (playerPosition.x !== 0 || playerPosition.y !== 0) {
        // More responsive camera - less lag
        const currentCamera = this.renderer?.getCamera()
        if (!currentCamera) return
        
        const lerpFactor = 0.15 // More responsive camera
        
        const targetX = playerPosition.x
        const targetY = playerPosition.y
        
        // Safety checks for valid numbers
        if (!isFinite(targetX) || !isFinite(targetY)) return
        
        const newX = currentCamera.x + (targetX - currentCamera.x) * lerpFactor
        const newY = currentCamera.y + (targetY - currentCamera.y) * lerpFactor
        
        // Safety checks for camera position
        if (isFinite(newX) && isFinite(newY)) {
          this.renderer?.setCamera(newX, newY, currentCamera.zoom)
        }
        
        // Load chunks around player position for streaming world generation
        this.worldSystem?.loadChunksAroundPosition(playerPosition, 2)
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

  start() {
    if (this.isRunning) return
    
    this.isRunning = true
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
      
      // Handle combat input
      this.processCombatInput()
      
      // Handle action input 
      this.processActionInput()
      
      // Update camera to follow player
      this.updateCamera()
    } catch (error) {
      console.error('GameEngine: Error in update:', error)
    }
  }

  private render() {
    try {
      // Clear canvas
      this.renderer?.clear()
      
      // Get current player position for interaction feedback
      const playerPosition = this.movementSystem?.getPlayerPosition() || { x: 0, y: 0 }
      
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
    const camera = this.renderer.getCamera()
    return {
      x: (worldPos.x - camera.x) * camera.zoom + this.renderer.canvas.width / 2,
      y: (worldPos.y - camera.y) * camera.zoom + this.renderer.canvas.height / 2
    }
  }
  
  getMovementSystem() {
    return this.movementSystem
  }
  
  // Set the current player for movement
  setPlayer(player: any) {
    this.movementSystem.setPlayer(player)
    // Add player to world system
    this.worldSystem.addPlayer(player)
  }

  // Cleanup
  destroy() {
    this.stop()
    this.inputManager.destroy()
    this.audioManager.destroy()
  }
}


