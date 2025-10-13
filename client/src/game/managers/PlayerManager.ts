// Player management system for spawning, respawning, and state synchronization
import { Vector2 } from '../../types/game';
import { Player, PlayerState } from '../entities/Player';

export interface SpawnPoint {
  position: Vector2;
  district: string;
  safe: boolean;
}

export interface PlayerManagerConfig {
  maxPlayers: number;
  respawnTime: number;
  spawnPoints: SpawnPoint[];
  defaultSpawnPoint: Vector2;
}

export class PlayerManager {
  private players: Map<string, Player> = new Map();
  private config: PlayerManagerConfig;
  private worldSystem: any;
  private respawnTimers: Map<string, number> = new Map();

  constructor(config: PlayerManagerConfig, worldSystem?: any) {
    this.config = config;
    this.worldSystem = worldSystem;
  }

  // Player lifecycle management
  createPlayer(id: string, username: string, spawnPosition?: Vector2): Player {
    if (this.players.has(id)) {
      throw new Error(`Player with id ${id} already exists`);
    }

    const position = spawnPosition || this.getSpawnPosition();
    const player = new Player(id, username, position);

    // Set initial ammo for default weapon
    player.setAmmo('pistol', 30);

    this.players.set(id, player);
    console.log(
      `✅ Created player ${username} (${id}) at position (${position.x}, ${position.y})`
    );

    return player;
  }

  removePlayer(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (player) {
      // Clear any respawn timer
      this.clearRespawnTimer(playerId);

      this.players.delete(playerId);
      console.log(`🗑️ Removed player ${player.username} (${playerId})`);
      return true;
    }
    return false;
  }

  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  getAlivePlayers(): Player[] {
    return this.getAllPlayers().filter(player => player.isAlive);
  }

  getPlayersInRadius(center: Vector2, radius: number): Player[] {
    return this.getAllPlayers().filter(player => {
      const dx = player.position.x - center.x;
      const dy = player.position.y - center.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= radius;
    });
  }

  // Spawning system
  private getSpawnPosition(): Vector2 {
    // Try to find a safe spawn point
    const safeSpawnPoints = this.config.spawnPoints.filter(sp => sp.safe);

    if (safeSpawnPoints.length > 0) {
      const randomSpawn =
        safeSpawnPoints[Math.floor(Math.random() * safeSpawnPoints.length)];
      return this.findSafeSpawnNear(randomSpawn.position);
    }

    // Fallback to default spawn point
    return this.findSafeSpawnNear(this.config.defaultSpawnPoint);
  }

  private findSafeSpawnNear(
    position: Vector2,
    maxAttempts: number = 10
  ): Vector2 {
    for (let i = 0; i < maxAttempts; i++) {
      const offset = {
        x: (Math.random() - 0.5) * 200, // Random offset within 200 pixels
        y: (Math.random() - 0.5) * 200,
      };

      const testPosition = {
        x: position.x + offset.x,
        y: position.y + offset.y,
      };

      // Check if position is safe (not blocked and not too close to other players)
      if (this.isSpawnPositionSafe(testPosition)) {
        return testPosition;
      }
    }

    // If no safe position found, return original position
    console.warn('⚠️ Could not find safe spawn position, using fallback');
    return position;
  }

  private isSpawnPositionSafe(position: Vector2): boolean {
    // Check world collision if available
    if (this.worldSystem && this.worldSystem.isBlocked) {
      if (this.worldSystem.isBlocked(position)) {
        return false;
      }
    }

    // Check distance from other players
    const minDistance = 100; // Minimum distance from other players
    for (const player of this.getAllPlayers()) {
      if (player.isAlive) {
        const dx = player.position.x - position.x;
        const dy = player.position.y - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
          return false;
        }
      }
    }

    return true;
  }

  // Respawn system
  handlePlayerDeath(playerId: string): void {
    const player = this.getPlayer(playerId);
    if (!player) return;

    console.log(
      `💀 Player ${player.username} died at (${player.position.x}, ${player.position.y})`
    );

    // Mark player as dead
    player.die();

    // Start respawn timer
    this.startRespawnTimer(playerId);

    // TODO: Drop items at death location
    // TODO: Notify other players
    // TODO: Update kill feed
  }

  private startRespawnTimer(playerId: string): void {
    const timerId = window.setTimeout(() => {
      this.respawnPlayer(playerId);
    }, this.config.respawnTime);

    this.respawnTimers.set(playerId, timerId);
    console.log(
      `⏱️ Started respawn timer for player ${playerId} (${this.config.respawnTime}ms)`
    );
  }

  private clearRespawnTimer(playerId: string): void {
    const timerId = this.respawnTimers.get(playerId);
    if (timerId) {
      clearTimeout(timerId);
      this.respawnTimers.delete(playerId);
    }
  }

  private respawnPlayer(playerId: string): void {
    const player = this.getPlayer(playerId);
    if (!player) return;

    // Clear respawn timer
    this.clearRespawnTimer(playerId);

    // Find new spawn position
    const spawnPosition = this.getSpawnPosition();

    // Respawn player
    player.respawn();
    player.moveTo(spawnPosition);

    // Reset player state
    player.setAmmo('pistol', 30); // Give basic ammo
    player.setProne(false);
    player.setRolling(false);

    console.log(
      `🔄 Respawned player ${player.username} at (${spawnPosition.x}, ${spawnPosition.y})`
    );
  }

  // State synchronization
  updatePlayerState(playerId: string, state: Partial<PlayerState>): boolean {
    const player = this.getPlayer(playerId);
    if (!player) return false;

    // Validate state changes (anti-cheat)
    if (!this.validateStateUpdate(player, state)) {
      console.warn(`⚠️ Invalid state update rejected for player ${playerId}`);
      return false;
    }

    // Apply state update
    player.setState(state);
    return true;
  }

  private validateStateUpdate(
    player: Player,
    state: Partial<PlayerState>
  ): boolean {
    // Position validation
    if (state.position) {
      const dx = state.position.x - player.position.x;
      const dy = state.position.y - player.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check for teleporting (too much movement in one update)
      const maxMovement = player.speed * 0.1; // Max movement per 100ms
      if (distance > maxMovement) {
        return false;
      }

      // Check for movement through walls
      if (this.worldSystem && this.worldSystem.isMovementBlocked) {
        if (
          this.worldSystem.isMovementBlocked(player.position, state.position)
        ) {
          return false;
        }
      }
    }

    // Health validation (can't increase health without healing items)
    if (state.health !== undefined && state.health > player.health) {
      // TODO: Check if player has healing items or is at medbot
      return false;
    }

    // Credits validation (can't increase credits without earning them)
    if (state.credits !== undefined && state.credits > player.credits) {
      // TODO: Check if credits increase is from valid source
      return false;
    }

    return true;
  }

  // Collision detection
  checkPlayerCollisions(): void {
    const players = this.getAlivePlayers();

    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const playerA = players[i];
        const playerB = players[j];

        if (playerA.isCollidingWith(playerB)) {
          this.resolvePlayerCollision(playerA, playerB);
        }
      }
    }
  }

  private resolvePlayerCollision(playerA: Player, playerB: Player): void {
    // Simple collision resolution - push players apart
    const dx = playerB.position.x - playerA.position.x;
    const dy = playerB.position.y - playerA.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return; // Avoid division by zero

    const overlap =
      playerA.collisionRadius + playerB.collisionRadius - distance;
    const separationX = (dx / distance) * (overlap / 2);
    const separationY = (dy / distance) * (overlap / 2);

    // Move players apart
    playerA.position.x -= separationX;
    playerA.position.y -= separationY;
    playerB.position.x += separationX;
    playerB.position.y += separationY;
  }

  // Update system
  update(deltaTime: number): void {
    // Update all players
    for (const player of this.getAllPlayers()) {
      if (player.isAlive) {
        player.updatePosition(deltaTime, this.worldSystem);

        // Decrease system heat over time
        player.decreaseSystemHeat(deltaTime * 0.01); // 1% per second
      }
    }

    // Check collisions
    this.checkPlayerCollisions();
  }

  // Utility methods
  getPlayerCount(): number {
    return this.players.size;
  }

  getAlivePlayerCount(): number {
    return this.getAlivePlayers().length;
  }

  isAtMaxCapacity(): boolean {
    return this.getPlayerCount() >= this.config.maxPlayers;
  }

  // Get player statistics
  getPlayerStats(playerId: string): any {
    const player = this.getPlayer(playerId);
    if (!player) return null;

    return {
      id: player.id,
      username: player.username,
      level: player.level,
      experience: player.experience,
      health: player.health,
      maxHealth: player.maxHealth,
      credits: player.credits,
      isAlive: player.isAlive,
      position: player.position,
      augmentationCount: player.augmentations.length,
      inventoryCount: player.inventory.length,
      neuralProgramCount: player.neuralPrograms.length,
      systemHeat: player.systemHeat,
    };
  }

  // Export/import for persistence
  exportPlayerData(playerId: string): any {
    const player = this.getPlayer(playerId);
    return player ? player.toJSON() : null;
  }

  importPlayerData(data: any): Player | null {
    try {
      const player = Player.fromJSON(data);
      this.players.set(player.id, player);
      return player;
    } catch (error) {
      console.error('Failed to import player data:', error);
      return null;
    }
  }

  // Configuration
  updateConfig(newConfig: Partial<PlayerManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): PlayerManagerConfig {
    return { ...this.config };
  }
}
