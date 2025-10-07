// Combat system
// Simple event emitter implementation
class EventEmitter {
  private events: { [key: string]: Function[] } = {}

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(listener)
  }

  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args))
    }
  }
}
import { Vector2 } from '../../types/game'

interface PlayerHealth {
  playerId: string
  currentHealth: number
  maxHealth: number
  armor: number
  lastDamageTime: number
}

interface WeaponStats {
  damage: number
  speed: number
  cooldown: number
  accuracy: number
  spread: number
  maxAmmo: number
  reloadTime: number
}

interface Projectile {
  id: string
  playerId: string
  position: Vector2
  target: Vector2
  velocity: Vector2
  damage: number
  weapon: string
  lifetime: number
  createdAt: number
}

export class CombatSystem extends EventEmitter {
  private projectiles: Map<string, Projectile> = new Map()
  private damageEvents: any[] = []
  private playerHealth: Map<string, PlayerHealth> = new Map()
  private playerAmmo: Map<string, Map<string, number>> = new Map()
  private playerReloading: Map<string, { weapon: string, endTime: number }> = new Map()
  private combatState: any = {
    inCombat: false,
    combatStartTime: 0,
    lastShotTime: 0
  }
  private worldSystem: any // Reference to world system for line of sight

  constructor(worldSystem?: any) {
    super()
    this.worldSystem = worldSystem
    this.initializeWeaponStats()
  }

  private initializeWeaponStats() {
    // This could be loaded from config files later
  }

  update(deltaTime: number) {
    this.updateProjectiles(deltaTime)
    this.updateDamageEvents(deltaTime)
    this.updateCombatState(deltaTime)
    this.updateReloading(deltaTime)
    this.updateHealthRegeneration(deltaTime)
  }

  private updateProjectiles(deltaTime: number) {
    this.projectiles.forEach((projectile, id) => {
      projectile.position.x += projectile.velocity.x * deltaTime / 1000
      projectile.position.y += projectile.velocity.y * deltaTime / 1000
      projectile.lifetime -= deltaTime

      if (projectile.lifetime <= 0) {
        this.projectiles.delete(id)
        this.emit('projectileExpired', projectile)
      }
    })
  }

  private updateDamageEvents(_deltaTime: number) {
    // Process damage events
    this.damageEvents.forEach(event => {
      this.processDamageEvent(event)
    })
    this.damageEvents = []
  }

  private updateCombatState(_deltaTime: number) {
    if (this.combatState.inCombat) {
      const timeSinceCombat = Date.now() - this.combatState.combatStartTime
      if (timeSinceCombat > 5000) { // 5 seconds of no combat
        this.combatState.inCombat = false
        this.emit('combatEnded')
      }
    }
  }

  private updateReloading(_deltaTime: number) {
    const now = Date.now()
    this.playerReloading.forEach((reload, playerId) => {
      if (now >= reload.endTime) {
        // Reload complete
        const weaponStats = this.getWeaponStats(reload.weapon)
        this.setPlayerAmmo(playerId, reload.weapon, weaponStats.maxAmmo)
        this.playerReloading.delete(playerId)
        this.emit('reloadComplete', { playerId, weapon: reload.weapon })
      }
    })
  }

  private updateHealthRegeneration(deltaTime: number) {
    const now = Date.now()
    this.playerHealth.forEach((health, playerId) => {
      // Health regeneration after 5 seconds of no damage
      if (now - health.lastDamageTime > 5000 && health.currentHealth < health.maxHealth) {
        const regenRate = 10 // HP per second
        health.currentHealth = Math.min(
          health.maxHealth,
          health.currentHealth + (regenRate * deltaTime / 1000)
        )
        this.emit('healthRegeneration', { playerId, currentHealth: health.currentHealth })
      }
    })
  }

  // Combat actions
  handleShooting(data: any) {
    const { playerId, playerPosition, target, weapon } = data
    
    // Check if player can shoot (cooldown, ammo, etc.)
    if (!this.canShoot(playerId, weapon)) {
      return { success: false, reason: 'Cannot shoot' }
    }

    // Check line of sight
    if (!this.hasLineOfSight(playerPosition, target)) {
      return { success: false, reason: 'No line of sight' }
    }

    // Consume ammo
    this.consumeAmmo(playerId, weapon)

    // Create projectile with weapon spread
    const projectile = this.createProjectile(playerId, playerPosition, target, weapon)
    this.projectiles.set(projectile.id, projectile)

    // Update combat state
    this.combatState.inCombat = true
    this.combatState.combatStartTime = Date.now()
    this.combatState.lastShotTime = Date.now()

    this.emit('shotFired', { playerId, projectile, weapon })
    return { success: true, projectile }
  }

  private canShoot(playerId: string, weapon: string): boolean {
    const now = Date.now()
    const timeSinceLastShot = now - this.combatState.lastShotTime
    const weaponCooldown = this.getWeaponCooldown(weapon)

    // Check cooldown
    if (timeSinceLastShot < weaponCooldown) {
      return false
    }

    // Check if player is reloading
    if (this.playerReloading.has(playerId)) {
      return false
    }

    // Check ammo
    const currentAmmo = this.getPlayerAmmo(playerId, weapon)
    if (currentAmmo <= 0) {
      return false
    }

    return true
  }

  private hasLineOfSight(start: Vector2, end: Vector2): boolean {
    if (!this.worldSystem) {
      return true // No world system, assume line of sight
    }

    // Simple raycasting - in a real implementation this would be more sophisticated
    const dx = end.x - start.x
    const dy = end.y - start.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const steps = Math.ceil(distance / 10) // Check every 10 units

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const checkX = start.x + dx * t
      const checkY = start.y + dy * t

      // Check if this point is blocked by world geometry
      if (this.worldSystem.isBlocked && this.worldSystem.isBlocked({ x: checkX, y: checkY })) {
        return false
      }
    }

    return true
  }

  private consumeAmmo(playerId: string, weapon: string) {
    const currentAmmo = this.getPlayerAmmo(playerId, weapon)
    this.setPlayerAmmo(playerId, weapon, Math.max(0, currentAmmo - 1))
  }

  private getWeaponStats(weapon: string): WeaponStats {
    const weaponStats: { [key: string]: WeaponStats } = {
      pistol: {
        damage: 25,
        speed: 1000,
        cooldown: 500,
        accuracy: 0.9,
        spread: 0.05,
        maxAmmo: 12,
        reloadTime: 2000
      },
      rifle: {
        damage: 40,
        speed: 1500,
        cooldown: 800,
        accuracy: 0.95,
        spread: 0.03,
        maxAmmo: 30,
        reloadTime: 3000
      },
      smg: {
        damage: 15,
        speed: 800,
        cooldown: 200,
        accuracy: 0.85,
        spread: 0.08,
        maxAmmo: 25,
        reloadTime: 2500
      },
      cyber: {
        damage: 60,
        speed: 2000,
        cooldown: 1000,
        accuracy: 0.98,
        spread: 0.01,
        maxAmmo: 8,
        reloadTime: 4000
      }
    }
    return weaponStats[weapon] || weaponStats.pistol
  }

  private getWeaponCooldown(weapon: string): number {
    return this.getWeaponStats(weapon).cooldown
  }

  private createProjectile(playerId: string, playerPosition: Vector2, target: Vector2, weapon: string): Projectile {
    const weaponStats = this.getWeaponStats(weapon)
    
    // Apply weapon spread/accuracy
    const spreadTarget = this.applyWeaponSpread(playerPosition, target, weaponStats)
    
    const projectile: Projectile = {
      id: this.generateId(),
      playerId,
      position: { ...playerPosition },
      target: spreadTarget,
      velocity: this.calculateVelocity(playerPosition, spreadTarget, weaponStats.speed),
      damage: weaponStats.damage,
      weapon,
      lifetime: 2000, // 2 seconds
      createdAt: Date.now()
    }

    return projectile
  }

  private applyWeaponSpread(start: Vector2, target: Vector2, weaponStats: WeaponStats): Vector2 {
    const dx = target.x - start.x
    const dy = target.y - start.y
    const angle = Math.atan2(dy, dx)
    
    // Apply random spread based on weapon accuracy
    const maxSpread = weaponStats.spread * (1 - weaponStats.accuracy)
    const spreadAngle = (Math.random() - 0.5) * maxSpread * 2
    const newAngle = angle + spreadAngle
    
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    return {
      x: start.x + Math.cos(newAngle) * distance,
      y: start.y + Math.sin(newAngle) * distance
    }
  }

  private calculateVelocity(start: Vector2, target: Vector2, speed: number): Vector2 {
    const dx = target.x - start.x
    const dy = target.y - start.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance === 0) {
      return { x: 0, y: 0 }
    }
    
    const normalizedX = dx / distance
    const normalizedY = dy / distance

    return {
      x: normalizedX * speed,
      y: normalizedY * speed
    }
  }

  // Damage handling
  processDamageEvent(event: any) {
    const { targetId, damage, damageType, sourceId } = event
    
    const targetHealth = this.getPlayerHealth(targetId)
    if (!targetHealth) {
      return // Player doesn't exist or is already dead
    }

    // Calculate actual damage (accounting for armor)
    let actualDamage = damage
    if (targetHealth.armor > 0) {
      const armorReduction = Math.min(damage * 0.5, targetHealth.armor)
      actualDamage = damage - armorReduction
      targetHealth.armor = Math.max(0, targetHealth.armor - armorReduction)
    }

    // Apply damage
    targetHealth.currentHealth = Math.max(0, targetHealth.currentHealth - actualDamage)
    targetHealth.lastDamageTime = Date.now()
    
    this.emit('damageDealt', {
      targetId,
      damage: actualDamage,
      originalDamage: damage,
      damageType,
      sourceId,
      currentHealth: targetHealth.currentHealth,
      timestamp: Date.now()
    })

    // Check for death
    if (targetHealth.currentHealth <= 0) {
      this.emit('playerKilled', { targetId, killerId: sourceId })
      this.handlePlayerDeath(targetId)
    }
  }

  private handlePlayerDeath(playerId: string) {
    // Remove player from health tracking
    this.playerHealth.delete(playerId)
    // Stop any ongoing reload
    this.playerReloading.delete(playerId)
    // Clear ammo (will be restored on respawn)
    this.playerAmmo.delete(playerId)
  }

  // Projectile collision
  checkProjectileCollisions() {
    this.projectiles.forEach((projectile, id) => {
      // Check collision with players, buildings, etc.
      const collision = this.detectCollision(projectile)
      
      if (collision) {
        this.handleProjectileHit(projectile, collision)
        this.projectiles.delete(id)
      }
    })
  }

  private detectCollision(projectile: Projectile): any {
    // Check collision with players
    if (this.worldSystem && this.worldSystem.getPlayers) {
      const players = this.worldSystem.getPlayers()
      
      for (const player of players) {
        if (player.id === projectile.playerId) continue // Don't hit yourself
        
        const distance = Math.sqrt(
          Math.pow(projectile.position.x - player.position.x, 2) +
          Math.pow(projectile.position.y - player.position.y, 2)
        )
        
        // Simple radius-based collision (adjust radius as needed)
        const playerRadius = 20
        if (distance <= playerRadius) {
          return {
            type: 'player',
            targetId: player.id,
            position: player.position
          }
        }
      }
    }
    
    // Check collision with world geometry
    if (this.worldSystem && this.worldSystem.isBlocked) {
      if (this.worldSystem.isBlocked(projectile.position)) {
        return {
          type: 'world',
          position: projectile.position
        }
      }
    }
    
    return null
  }

  private handleProjectileHit(projectile: any, collision: any) {
    const damageEvent = {
      targetId: collision.targetId,
      damage: projectile.damage,
      damageType: this.getDamageType(projectile.weapon),
      sourceId: projectile.playerId
    }

    this.damageEvents.push(damageEvent)
    this.emit('projectileHit', { projectile, collision })
  }

  private getDamageType(weapon: string): string {
    const damageTypes = {
      pistol: 'kinetic',
      rifle: 'kinetic',
      smg: 'kinetic',
      cyber: 'energy'
    }
    return damageTypes[weapon as keyof typeof damageTypes] || 'kinetic'
  }

  // Player Management Methods
  initializePlayer(playerId: string, maxHealth: number = 100, initialArmor: number = 0) {
    this.playerHealth.set(playerId, {
      playerId,
      currentHealth: maxHealth,
      maxHealth,
      armor: initialArmor,
      lastDamageTime: 0
    })
    
    // Initialize ammo for all weapons
    const ammoMap = new Map<string, number>()
    const weapons = ['pistol', 'rifle', 'smg', 'cyber']
    weapons.forEach(weapon => {
      const stats = this.getWeaponStats(weapon)
      ammoMap.set(weapon, stats.maxAmmo)
    })
    this.playerAmmo.set(playerId, ammoMap)
  }

  getPlayerHealth(playerId: string): PlayerHealth | undefined {
    return this.playerHealth.get(playerId)
  }

  getPlayerAmmo(playerId: string, weapon: string): number {
    const playerAmmo = this.playerAmmo.get(playerId)
    return playerAmmo?.get(weapon) || 0
  }

  setPlayerAmmo(playerId: string, weapon: string, amount: number) {
    let playerAmmo = this.playerAmmo.get(playerId)
    if (!playerAmmo) {
      playerAmmo = new Map()
      this.playerAmmo.set(playerId, playerAmmo)
    }
    playerAmmo.set(weapon, amount)
  }

  healPlayer(playerId: string, amount: number) {
    const health = this.getPlayerHealth(playerId)
    if (health) {
      health.currentHealth = Math.min(health.maxHealth, health.currentHealth + amount)
      this.emit('playerHealed', { playerId, healAmount: amount, currentHealth: health.currentHealth })
    }
  }

  addArmor(playerId: string, amount: number) {
    const health = this.getPlayerHealth(playerId)
    if (health) {
      health.armor += amount
      this.emit('armorAdded', { playerId, armorAmount: amount, currentArmor: health.armor })
    }
  }

  // Reload System
  startReload(playerId: string, weapon: string) {
    const currentAmmo = this.getPlayerAmmo(playerId, weapon)
    const weaponStats = this.getWeaponStats(weapon)
    
    if (currentAmmo >= weaponStats.maxAmmo) {
      return false // Already full
    }
    
    if (this.playerReloading.has(playerId)) {
      return false // Already reloading
    }
    
    this.playerReloading.set(playerId, {
      weapon,
      endTime: Date.now() + weaponStats.reloadTime
    })
    
    this.emit('reloadStarted', { playerId, weapon, reloadTime: weaponStats.reloadTime })
    return true
  }

  cancelReload(playerId: string) {
    if (this.playerReloading.has(playerId)) {
      this.playerReloading.delete(playerId)
      this.emit('reloadCancelled', { playerId })
    }
  }

  isReloading(playerId: string): boolean {
    return this.playerReloading.has(playerId)
  }

  // Utility methods
  getProjectiles() {
    return Array.from(this.projectiles.values())
  }

  getCombatState() {
    return this.combatState
  }

  isInCombat(): boolean {
    return this.combatState.inCombat
  }

  getPlayerStats(playerId: string) {
    const health = this.getPlayerHealth(playerId)
    const ammoMap = this.playerAmmo.get(playerId)
    const reloading = this.playerReloading.get(playerId)
    
    return {
      health: health ? {
        current: health.currentHealth,
        max: health.maxHealth,
        armor: health.armor
      } : null,
      ammo: ammoMap ? Object.fromEntries(ammoMap.entries()) : {},
      reloading: reloading ? {
        weapon: reloading.weapon,
        timeRemaining: Math.max(0, reloading.endTime - Date.now())
      } : null
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  // Cleanup
  clearProjectiles() {
    this.projectiles.clear()
  }

  resetCombatState() {
    this.combatState = {
      inCombat: false,
      combatStartTime: 0,
      lastShotTime: 0
    }
  }

  removePlayer(playerId: string) {
    this.playerHealth.delete(playerId)
    this.playerAmmo.delete(playerId)
    this.playerReloading.delete(playerId)
  }

  reset() {
    this.projectiles.clear()
    this.playerHealth.clear()
    this.playerAmmo.clear()
    this.playerReloading.clear()
    this.resetCombatState()
  }
}


