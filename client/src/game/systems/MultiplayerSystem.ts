// Multiplayer synchronization system with client-side prediction and lag compensation
import { socketService } from '../../services/socket';
import { Vector2 } from '../../types/game';
import { Player } from '../entities/Player';

export interface NetworkUpdate {
  playerId: string;
  position: Vector2;
  velocity: Vector2;
  facing: number;
  timestamp: number;
  sequenceNumber: number;
}

export interface PredictionState {
  position: Vector2;
  velocity: Vector2;
  timestamp: number;
  sequenceNumber: number;
}

export interface InterpolationTarget {
  position: Vector2;
  velocity: Vector2;
  facing: number;
  timestamp: number;
}

export class MultiplayerSystem {
  private localPlayer: Player | null = null;
  private remotePlayers: Map<string, Player> = new Map();
  private isConnected = false;

  // Client-side prediction
  private predictionHistory: Map<number, PredictionState> = new Map();
  // private _lastAcknowledgedSequence = 0;
  private currentSequenceNumber = 0;
  private predictionEnabled = true;

  // Lag compensation
  private serverTimeOffset = 0;
  private roundTripTime = 0;
  private lastPingTime = 0;
  private pingInterval = 5000; // Ping every 5 seconds

  // Interpolation for remote players
  private interpolationTargets: Map<string, InterpolationTarget[]> = new Map();
  private interpolationDelay = 100; // 100ms interpolation delay

  // Update rates
  private updateRate = 20; // 20 updates per second
  private lastUpdateTime = 0;

  // Disconnection handling
  private connectionTimeout = 10000; // 10 seconds
  private lastServerUpdate = 0;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // 2 seconds between attempts

  constructor() {
    this.setupSocketListeners();
    this.startPingLoop();
    this.connectToServer();
  }

  // Connect to the multiplayer server
  private connectToServer(): void {
    try {
      socketService.connect();
      console.log('🌐 Connecting to multiplayer server...');
    } catch (error) {
      console.error('❌ Failed to connect to multiplayer server:', error);
    }
  }

  private setupSocketListeners(): void {
    // Connection events
    socketService.getSocket()?.on('connect', () => {
      console.log('🌐 Connected to multiplayer server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.requestPlayerSync();
    });

    socketService.getSocket()?.on('disconnect', () => {
      console.log('🔌 Disconnected from multiplayer server');
      this.isConnected = false;
      this.handleDisconnection();
    });

    socketService.getSocket()?.on('connect_error', (error: any) => {
      console.error('❌ Connection error:', error);
      this.handleConnectionError();
    });

    // Player synchronization events
    socketService.getSocket()?.on('player:sync', (data: any) => {
      this.handlePlayerSync(data);
    });

    socketService.getSocket()?.on('player:update', (data: NetworkUpdate) => {
      this.handlePlayerUpdate(data);
    });

    socketService.getSocket()?.on('player:joined', (playerData: any) => {
      this.handlePlayerJoined(playerData);
    });

    socketService
      .getSocket()
      ?.on('player:left', (data: { playerId: string }) => {
        this.handlePlayerLeft(data.playerId);
      });

    // Server acknowledgment for prediction
    socketService.getSocket()?.on('movement:ack', (data: any) => {
      this.handleMovementAcknowledgment(data);
    });

    // Ping/pong for latency measurement
    socketService.getSocket()?.on('pong', (data: { timestamp: number }) => {
      this.handlePong(data.timestamp);
    });

    // Server time sync
    socketService
      .getSocket()
      ?.on('time:sync', (data: { serverTime: number }) => {
        this.handleTimeSync(data.serverTime);
      });
  }

  // Initialize local player
  public setLocalPlayer(player: Player): void {
    this.localPlayer = player;
    console.log('🎮 Local player set:', player.username);

    if (this.isConnected) {
      this.sendPlayerJoin();
    }
  }

  // Send player join to server
  private sendPlayerJoin(): void {
    if (!this.localPlayer || !this.isConnected) return;

    socketService.getSocket()?.emit('player:join', {
      id: this.localPlayer.id,
      username: this.localPlayer.username,
      position: this.localPlayer.position,
      timestamp: this.getServerTime(),
    });
  }

  // Request full player synchronization
  private requestPlayerSync(): void {
    if (!this.isConnected) return;

    socketService.getSocket()?.emit('player:sync:request', {
      timestamp: this.getServerTime(),
    });
  }

  // Handle full player synchronization from server
  private handlePlayerSync(data: { players: any[] }): void {
    console.log('🔄 Received player sync:', data.players.length, 'players');

    // Clear existing remote players
    this.remotePlayers.clear();
    this.interpolationTargets.clear();

    // Add all remote players
    data.players.forEach(playerData => {
      if (playerData.id !== this.localPlayer?.id) {
        const remotePlayer = Player.fromJSON(playerData);
        this.remotePlayers.set(remotePlayer.id, remotePlayer);
        this.interpolationTargets.set(remotePlayer.id, []);
        console.log('👤 Added remote player:', remotePlayer.username);
      }
    });
  }

  // Handle individual player updates
  private handlePlayerUpdate(data: NetworkUpdate): void {
    if (data.playerId === this.localPlayer?.id) {
      // This is an update for our local player - use for server reconciliation
      this.handleServerReconciliation(data);
      return;
    }

    const remotePlayer = this.remotePlayers.get(data.playerId);
    if (!remotePlayer) {
      console.warn('⚠️ Received update for unknown player:', data.playerId);
      return;
    }

    // Add to interpolation targets for smooth movement
    this.addInterpolationTarget(data.playerId, {
      position: data.position,
      velocity: data.velocity,
      facing: data.facing,
      timestamp: data.timestamp,
    });

    this.lastServerUpdate = Date.now();
  }

  // Handle new player joining
  private handlePlayerJoined(playerData: any): void {
    if (playerData.id === this.localPlayer?.id) return;

    const newPlayer = Player.fromJSON(playerData);
    this.remotePlayers.set(newPlayer.id, newPlayer);
    this.interpolationTargets.set(newPlayer.id, []);

    console.log('👋 Player joined:', newPlayer.username);
  }

  // Handle player leaving
  private handlePlayerLeft(playerId: string): void {
    if (this.remotePlayers.has(playerId)) {
      const player = this.remotePlayers.get(playerId);
      this.remotePlayers.delete(playerId);
      this.interpolationTargets.delete(playerId);
      console.log('👋 Player left:', player?.username);
    }
  }

  // Send local player movement with client-side prediction
  public sendMovement(
    position: Vector2,
    velocity: Vector2,
    facing: number
  ): void {
    if (!this.localPlayer || !this.isConnected) return;

    const now = Date.now();

    // Rate limiting - only send updates at specified rate
    if (now - this.lastUpdateTime < 1000 / this.updateRate) {
      return;
    }

    this.lastUpdateTime = now;
    this.currentSequenceNumber++;

    const networkUpdate: NetworkUpdate = {
      playerId: this.localPlayer.id,
      position,
      velocity,
      facing,
      timestamp: this.getServerTime(),
      sequenceNumber: this.currentSequenceNumber,
    };

    // Store prediction state for later reconciliation
    if (this.predictionEnabled) {
      this.predictionHistory.set(this.currentSequenceNumber, {
        position: { ...position },
        velocity: { ...velocity },
        timestamp: now,
        sequenceNumber: this.currentSequenceNumber,
      });

      // Clean up old prediction history (keep last 100 entries)
      if (this.predictionHistory.size > 100) {
        const oldestKey = Math.min(...this.predictionHistory.keys());
        this.predictionHistory.delete(oldestKey);
      }
    }

    // Send to server
    socketService.getSocket()?.emit('player:move', networkUpdate);
  }

  // Handle server acknowledgment for movement prediction
  private handleMovementAcknowledgment(data: {
    sequenceNumber: number;
    position: Vector2;
    timestamp: number;
  }): void {
    if (!this.localPlayer || !this.predictionEnabled) return;

    // this._lastAcknowledgedSequence = data.sequenceNumber;

    // Get the predicted state for this sequence number
    const predictedState = this.predictionHistory.get(data.sequenceNumber);
    if (!predictedState) return;

    // Check if our prediction was accurate
    const positionError = Math.sqrt(
      Math.pow(predictedState.position.x - data.position.x, 2) +
        Math.pow(predictedState.position.y - data.position.y, 2)
    );

    // If prediction error is significant, apply correction
    const errorThreshold = 5; // 5 pixels tolerance
    if (positionError > errorThreshold) {
      console.log(
        '🔧 Correcting prediction error:',
        positionError.toFixed(2),
        'pixels'
      );

      // Apply server correction
      this.localPlayer.position = { ...data.position };

      // Re-apply any inputs that happened after this acknowledged state
      this.reapplyPredictions(data.sequenceNumber);
    }

    // Clean up acknowledged predictions
    for (const [seq] of this.predictionHistory) {
      if (seq <= data.sequenceNumber) {
        this.predictionHistory.delete(seq);
      }
    }
  }

  // Re-apply predictions after server correction
  private reapplyPredictions(acknowledgedSequence: number): void {
    if (!this.localPlayer) return;

    // Get all predictions after the acknowledged sequence
    const laterPredictions = Array.from(this.predictionHistory.entries())
      .filter(([seq]) => seq > acknowledgedSequence)
      .sort(([a], [b]) => a - b);

    // Re-apply each prediction
    for (const [, prediction] of laterPredictions) {
      // Simple re-application - in a real game you'd re-run the movement logic
      this.localPlayer.position.x += prediction.velocity.x * 0.016; // Assume 16ms delta
      this.localPlayer.position.y += prediction.velocity.y * 0.016;
    }
  }

  // Handle server reconciliation for authoritative updates
  private handleServerReconciliation(data: NetworkUpdate): void {
    if (!this.localPlayer) return;

    // For now, trust the server completely for simplicity
    // In a more sophisticated system, you'd compare with local prediction
    this.localPlayer.position = { ...data.position };
    this.localPlayer.velocity = { ...data.velocity };
    this.localPlayer.facing = data.facing;
  }

  // Add interpolation target for smooth remote player movement
  private addInterpolationTarget(
    playerId: string,
    target: InterpolationTarget
  ): void {
    const targets = this.interpolationTargets.get(playerId) || [];

    // Add new target
    targets.push(target);

    // Keep only recent targets (last 500ms worth)
    const cutoffTime = target.timestamp - 500;
    const filteredTargets = targets.filter(t => t.timestamp >= cutoffTime);

    this.interpolationTargets.set(playerId, filteredTargets);
  }

  // Update remote players with interpolation
  public updateRemotePlayers(_deltaTime: number): void {
    const currentTime = this.getServerTime() - this.interpolationDelay;

    for (const [playerId, player] of this.remotePlayers) {
      const targets = this.interpolationTargets.get(playerId) || [];

      if (targets.length < 2) continue;

      // Find the two targets to interpolate between
      let beforeTarget: InterpolationTarget | null = null;
      let afterTarget: InterpolationTarget | null = null;

      for (let i = 0; i < targets.length - 1; i++) {
        if (
          targets[i].timestamp <= currentTime &&
          targets[i + 1].timestamp >= currentTime
        ) {
          beforeTarget = targets[i];
          afterTarget = targets[i + 1];
          break;
        }
      }

      if (!beforeTarget || !afterTarget) {
        // Use the most recent target if we can't interpolate
        const latestTarget = targets[targets.length - 1];
        player.position = { ...latestTarget.position };
        player.velocity = { ...latestTarget.velocity };
        player.facing = latestTarget.facing;
        continue;
      }

      // Interpolate between the two targets
      const timeDiff = afterTarget.timestamp - beforeTarget.timestamp;
      const progress =
        timeDiff > 0 ? (currentTime - beforeTarget.timestamp) / timeDiff : 0;
      const clampedProgress = Math.max(0, Math.min(1, progress));

      // Linear interpolation for position
      player.position.x =
        beforeTarget.position.x +
        (afterTarget.position.x - beforeTarget.position.x) * clampedProgress;
      player.position.y =
        beforeTarget.position.y +
        (afterTarget.position.y - beforeTarget.position.y) * clampedProgress;

      // Linear interpolation for velocity
      player.velocity.x =
        beforeTarget.velocity.x +
        (afterTarget.velocity.x - beforeTarget.velocity.x) * clampedProgress;
      player.velocity.y =
        beforeTarget.velocity.y +
        (afterTarget.velocity.y - beforeTarget.velocity.y) * clampedProgress;

      // Angular interpolation for facing
      player.facing = this.interpolateAngle(
        beforeTarget.facing,
        afterTarget.facing,
        clampedProgress
      );
    }
  }

  // Interpolate angles correctly (handling wrap-around)
  private interpolateAngle(from: number, to: number, progress: number): number {
    // Normalize angles to [0, 2π]
    const normalizeAngle = (angle: number) => {
      while (angle < 0) angle += 2 * Math.PI;
      while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
      return angle;
    };

    const fromNorm = normalizeAngle(from);
    const toNorm = normalizeAngle(to);

    let diff = toNorm - fromNorm;

    // Choose the shorter path around the circle
    if (diff > Math.PI) {
      diff -= 2 * Math.PI;
    } else if (diff < -Math.PI) {
      diff += 2 * Math.PI;
    }

    return normalizeAngle(fromNorm + diff * progress);
  }

  // Ping system for latency measurement
  private startPingLoop(): void {
    setInterval(() => {
      if (this.isConnected) {
        this.sendPing();
      }
    }, this.pingInterval);
  }

  private sendPing(): void {
    if (!this.isConnected) return;

    this.lastPingTime = Date.now();
    socketService.getSocket()?.emit('ping', { timestamp: this.lastPingTime });
  }

  private handlePong(timestamp: number): void {
    const now = Date.now();
    if (timestamp === this.lastPingTime) {
      this.roundTripTime = now - timestamp;
      console.log('🏓 RTT:', this.roundTripTime, 'ms');
    }
  }

  // Server time synchronization
  private handleTimeSync(serverTime: number): void {
    const clientTime = Date.now();
    this.serverTimeOffset = serverTime - clientTime;
    console.log('⏰ Server time offset:', this.serverTimeOffset, 'ms');
  }

  private getServerTime(): number {
    return Date.now() + this.serverTimeOffset;
  }

  // Connection management
  private handleDisconnection(): void {
    console.log('🔌 Handling disconnection...');

    // Clear remote players
    this.remotePlayers.clear();
    this.interpolationTargets.clear();

    // Start reconnection attempts
    this.attemptReconnection();
  }

  private handleConnectionError(): void {
    console.log('❌ Handling connection error...');
    this.attemptReconnection();
  }

  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
    );

    setTimeout(() => {
      if (!this.isConnected) {
        socketService.connect();
      }
    }, this.reconnectDelay * this.reconnectAttempts); // Exponential backoff
  }

  // Check for connection timeout
  public checkConnectionHealth(): void {
    if (!this.isConnected) return;

    const timeSinceLastUpdate = Date.now() - this.lastServerUpdate;
    if (timeSinceLastUpdate > this.connectionTimeout) {
      console.warn('⚠️ Connection timeout detected');
      this.handleDisconnection();
    }
  }

  // Public getters
  public getRemotePlayers(): Player[] {
    return Array.from(this.remotePlayers.values());
  }

  public getAllPlayers(): Player[] {
    const players: Player[] = [];
    if (this.localPlayer) {
      players.push(this.localPlayer);
    }
    players.push(...this.getRemotePlayers());
    return players;
  }

  public isPlayerConnected(): boolean {
    return this.isConnected;
  }

  public getLatency(): number {
    return this.roundTripTime / 2; // One-way latency
  }

  public getPredictionEnabled(): boolean {
    return this.predictionEnabled;
  }

  public setPredictionEnabled(enabled: boolean): void {
    this.predictionEnabled = enabled;
    if (!enabled) {
      this.predictionHistory.clear();
    }
  }

  // Update system
  public update(deltaTime: number): void {
    // Update remote players with interpolation
    this.updateRemotePlayers(deltaTime);

    // Check connection health
    this.checkConnectionHealth();
  }

  // Cleanup
  public destroy(): void {
    this.remotePlayers.clear();
    this.interpolationTargets.clear();
    this.predictionHistory.clear();

    // Remove socket listeners
    const socket = socketService.getSocket();
    if (socket) {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('player:sync');
      socket.off('player:update');
      socket.off('player:joined');
      socket.off('player:left');
      socket.off('movement:ack');
      socket.off('pong');
      socket.off('time:sync');
    }
  }
}
