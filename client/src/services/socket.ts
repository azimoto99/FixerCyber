// Socket.io service for real-time communication
import { io, Socket } from 'socket.io-client'

class SocketService {
  private socket: Socket | null = null
  private isConnected = false

  connect() {
    if (this.socket?.connected) {
      return this.socket
    }

    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'
    
    this.socket = io(serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
    })

    this.socket.on('connect', () => {
      console.log('Connected to game server')
      this.isConnected = true
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from game server')
      this.isConnected = false
    })

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      this.isConnected = false
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  // Player movement
  movePlayer(position: { x: number; y: number }) {
    this.emit('player:move', { position })
  }

  // Player actions
  performAction(type: string, data: any) {
    this.emit('player:action', { type, ...data })
  }

  // Contract actions
  acceptContract(contractId: string) {
    this.emit('contract:accept', { contractId })
  }

  completeContract(contractId: string, completionData: any) {
    this.emit('contract:complete', { contractId, completionData })
  }

  // Combat actions
  shoot(target: { x: number; y: number }, weapon: string) {
    this.performAction('shoot', { target, weapon })
  }

  // Hacking actions
  hack(target: string, difficulty: number) {
    this.performAction('hack', { target, difficulty })
  }

  // Interaction actions
  interact(target: string, action: string) {
    this.performAction('interact', { target, action })
  }

  // Event listeners
  onPlayerUpdate(callback: (players: any[]) => void) {
    this.on('players:update', callback)
  }

  onPlayerMove(callback: (data: any) => void) {
    this.on('player:move', callback)
  }

  onPlayerDisconnect(callback: (data: any) => void) {
    this.on('player:disconnect', callback)
  }

  onCombatShoot(callback: (data: any) => void) {
    this.on('combat:shoot', callback)
  }

  onHackAttempt(callback: (data: any) => void) {
    this.on('hack:attempt', callback)
  }

  onInteractionAttempt(callback: (data: any) => void) {
    this.on('interaction:attempt', callback)
  }

  onContractAccepted(callback: (contract: any) => void) {
    this.on('contract:accepted', callback)
  }

  onContractCompleted(callback: (data: any) => void) {
    this.on('contract:completed', callback)
  }

  onContractError(callback: (error: string) => void) {
    this.on('contract:error', callback)
  }

  // Generic event handling
  private emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn('Socket not connected, cannot emit:', event)
    }
  }

  private on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  // Utility methods
  getSocket() {
    return this.socket
  }

  isSocketConnected() {
    return this.isConnected && this.socket?.connected
  }
}

export const socketService = new SocketService()



