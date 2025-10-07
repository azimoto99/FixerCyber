// Core game engine
import { Renderer } from './Renderer'
import { InputManager } from './InputManager'
import { AudioManager } from './AudioManager'
import { WorldSystem } from '../systems/WorldSystem'
import { CombatSystem } from '../systems/CombatSystem'
import { ContractSystem } from '../systems/ContractSystem'
import { HackingSystem } from '../systems/HackingSystem'
import { InventorySystem } from '../systems/InventorySystem'

export class GameEngine {
  private renderer: Renderer
  private inputManager: InputManager
  private audioManager: AudioManager
  private worldSystem: WorldSystem
  private combatSystem: CombatSystem
  private contractSystem: ContractSystem
  private hackingSystem: HackingSystem
  private inventorySystem: InventorySystem
  
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
    this.combatSystem = new CombatSystem()
    this.contractSystem = new ContractSystem()
    this.hackingSystem = new HackingSystem()
    this.inventorySystem = new InventorySystem()
    
    this.setupEventListeners()
  }

  private setupEventListeners() {
    // Input events
    this.inputManager.on('move', (data: any) => {
      this.worldSystem.handlePlayerMovement(data)
    })

    this.inputManager.on('action', (data: any) => {
      this.handlePlayerAction(data)
    })

    // Game system events - commented out until event systems are properly implemented
    // this.worldSystem.on('chunkLoaded', (chunk) => {
    //   this.renderer.addChunk(chunk)
    // })

    // this.combatSystem.on('combatEvent', (event) => {
    //   this.handleCombatEvent(event)
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
        this.inventorySystem.handleInventoryAction(data, null) // Added missing second parameter
        break
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

    this.deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime

    // Update game systems
    this.update(this.deltaTime)
    
    // Render frame
    this.render()
    
    // Continue loop
    requestAnimationFrame((time) => this.gameLoop(time))
  }

  private update(_deltaTime: number) {
    // Update all game systems
    this.worldSystem.update(_deltaTime)
    this.combatSystem.update(_deltaTime)
    this.contractSystem.update(_deltaTime)
    this.hackingSystem.update(_deltaTime)
    this.inventorySystem.update(_deltaTime)
  }

  private render() {
    // Clear canvas
    this.renderer.clear()
    
    // Render world
    this.renderer.renderWorld(this.worldSystem.getWorldState())
    
    // Render players
    this.renderer.renderPlayers(this.worldSystem.getPlayers())
    
    // Render UI
    this.renderer.renderUI()
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

  // Cleanup
  destroy() {
    this.stop()
    this.inputManager.destroy()
    this.audioManager.destroy()
  }
}


