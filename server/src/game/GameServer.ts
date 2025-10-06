import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import { PlayerService } from '../services/PlayerService'
import { ContractService } from '../services/ContractService'
import { WorldService } from '../services/WorldService'

export class GameServer {
  private io: Server
  private prisma: PrismaClient
  private playerService: PlayerService
  private contractService: ContractService
  private worldService: WorldService
  private connectedPlayers: Map<string, any> = new Map()
  private gameLoop: NodeJS.Timeout | null = null

  constructor(io: Server, prisma: PrismaClient) {
    this.io = io
    this.prisma = prisma
    this.playerService = new PlayerService()
    this.contractService = new ContractService()
    this.worldService = new WorldService()
    
    this.startGameLoop()
  }

  private startGameLoop() {
    // Game loop runs at 30 FPS
    this.gameLoop = setInterval(() => {
      this.updateGameState()
    }, 1000 / 30)
  }

  private updateGameState() {
    // Update player positions and sync with clients
    this.syncPlayerPositions()
    
    // Update contract timers
    this.updateContractTimers()
    
    // Update world state
    this.updateWorldState()
  }

  private syncPlayerPositions() {
    // Broadcast player positions to all connected clients
    const players = Array.from(this.connectedPlayers.values())
    if (players.length > 0) {
      this.io.emit('players:update', players)
    }
  }

  private updateContractTimers() {
    // Check for expired contracts
    // This would be implemented to check database for expired contracts
    // and notify players accordingly
  }

  private updateWorldState() {
    // Update world chunks, NPCs, etc.
    // This would handle world generation and updates
  }

  handlePlayerMovement(socketId: string, data: any) {
    const player = this.connectedPlayers.get(socketId)
    if (!player) return

    // Update player position
    player.position = data.position
    player.lastUpdate = Date.now()

    // Broadcast to nearby players
    this.broadcastToNearbyPlayers(player, 'player:move', {
      playerId: player.id,
      position: data.position
    })

    // Update database
    this.playerService.updatePlayerPosition(player.userId, data.position.x, data.position.y)
  }

  handlePlayerAction(socketId: string, data: any) {
    const player = this.connectedPlayers.get(socketId)
    if (!player) return

    switch (data.type) {
      case 'shoot':
        this.handleShooting(player, data)
        break
      case 'hack':
        this.handleHacking(player, data)
        break
      case 'interact':
        this.handleInteraction(player, data)
        break
    }
  }

  handleContractAccept(socketId: string, data: any) {
    const player = this.connectedPlayers.get(socketId)
    if (!player) return

    this.contractService.acceptContract(player.id, data.contractId)
      .then(result => {
        if (result.success) {
          this.io.to(socketId).emit('contract:accepted', result.contract)
        } else {
          this.io.to(socketId).emit('contract:error', result.error)
        }
      })
  }

  handleContractComplete(socketId: string, data: any) {
    const player = this.connectedPlayers.get(socketId)
    if (!player) return

    this.contractService.completeContract(player.id, data.contractId, data.completionData)
      .then(result => {
        if (result.success) {
          this.io.to(socketId).emit('contract:completed', {
            reward: result.reward,
            player: result.player
          })
        } else {
          this.io.to(socketId).emit('contract:error', result.error)
        }
      })
  }

  handlePlayerDisconnect(socketId: string) {
    const player = this.connectedPlayers.get(socketId)
    if (player) {
      // Notify nearby players
      this.broadcastToNearbyPlayers(player, 'player:disconnect', {
        playerId: player.id
      })
      
      this.connectedPlayers.delete(socketId)
    }
  }

  private handleShooting(player: any, data: any) {
    // Implement shooting logic
    // Check line of sight, damage calculation, etc.
    
    this.broadcastToNearbyPlayers(player, 'combat:shoot', {
      playerId: player.id,
      target: data.target,
      weapon: data.weapon
    })
  }

  private handleHacking(player: any, data: any) {
    // Implement hacking logic
    // Check target validity, difficulty, etc.
    
    this.broadcastToNearbyPlayers(player, 'hack:attempt', {
      playerId: player.id,
      target: data.target,
      difficulty: data.difficulty
    })
  }

  private handleInteraction(player: any, data: any) {
    // Implement interaction logic
    // Check if target is interactable, distance, etc.
    
    this.broadcastToNearbyPlayers(player, 'interaction:attempt', {
      playerId: player.id,
      target: data.target,
      action: data.action
    })
  }

  private broadcastToNearbyPlayers(player: any, event: string, data: any) {
    // Get nearby players and broadcast to them
    const nearbyPlayers = Array.from(this.connectedPlayers.values())
      .filter(p => p.id !== player.id && this.isNearby(player, p))

    nearbyPlayers.forEach(nearbyPlayer => {
      // Find socket for nearby player and emit
      // This would require maintaining a socket ID to player ID mapping
      this.io.emit(event, data)
    })
  }

  private isNearby(player1: any, player2: any, maxDistance: number = 1000) {
    if (!player1.position || !player2.position) return false
    
    const dx = player1.position.x - player2.position.x
    const dy = player1.position.y - player2.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    return distance <= maxDistance
  }

  // Public methods for external use
  addPlayer(socketId: string, playerData: any) {
    this.connectedPlayers.set(socketId, {
      ...playerData,
      socketId,
      lastUpdate: Date.now()
    })
  }

  removePlayer(socketId: string) {
    this.connectedPlayers.delete(socketId)
  }

  getConnectedPlayers() {
    return Array.from(this.connectedPlayers.values())
  }

  // Cleanup
  destroy() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop)
      this.gameLoop = null
    }
  }
}



