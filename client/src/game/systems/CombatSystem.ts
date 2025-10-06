// Combat system
import { EventEmitter } from 'events'
import { Vector2 } from '../../types/game'

export class CombatSystem extends EventEmitter {
  private projectiles: Map<string, any> = new Map()
  private damageEvents: any[] = []
  private combatState: any = {
    inCombat: false,
    combatStartTime: 0,
    lastShotTime: 0
  }

  constructor() {
    super()
  }

  update(deltaTime: number) {
    this.updateProjectiles(deltaTime)
    this.updateDamageEvents(deltaTime)
    this.updateCombatState(deltaTime)
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

  private updateDamageEvents(deltaTime: number) {
    // Process damage events
    this.damageEvents.forEach(event => {
      this.processDamageEvent(event)
    })
    this.damageEvents = []
  }

  private updateCombatState(deltaTime: number) {
    if (this.combatState.inCombat) {
      const timeSinceCombat = Date.now() - this.combatState.combatStartTime
      if (timeSinceCombat > 5000) { // 5 seconds of no combat
        this.combatState.inCombat = false
        this.emit('combatEnded')
      }
    }
  }

  // Combat actions
  handleShooting(data: any) {
    const { playerId, target, weapon } = data
    
    // Check if player can shoot (cooldown, ammo, etc.)
    if (!this.canShoot(playerId, weapon)) {
      return
    }

    // Create projectile
    const projectile = this.createProjectile(playerId, target, weapon)
    this.projectiles.set(projectile.id, projectile)

    // Update combat state
    this.combatState.inCombat = true
    this.combatState.combatStartTime = Date.now()
    this.combatState.lastShotTime = Date.now()

    this.emit('shotFired', { playerId, projectile, weapon })
  }

  private canShoot(playerId: string, weapon: string): boolean {
    const now = Date.now()
    const timeSinceLastShot = now - this.combatState.lastShotTime
    const weaponCooldown = this.getWeaponCooldown(weapon)

    return timeSinceLastShot >= weaponCooldown
  }

  private getWeaponCooldown(weapon: string): number {
    const cooldowns = {
      pistol: 500,
      rifle: 800,
      smg: 200,
      cyber: 1000
    }
    return cooldowns[weapon as keyof typeof cooldowns] || 500
  }

  private createProjectile(playerId: string, target: Vector2, weapon: string) {
    const projectile = {
      id: this.generateId(),
      playerId,
      position: { x: 0, y: 0 }, // Will be set by renderer
      target,
      velocity: this.calculateVelocity(target, weapon),
      damage: this.getWeaponDamage(weapon),
      weapon,
      lifetime: 2000, // 2 seconds
      createdAt: Date.now()
    }

    return projectile
  }

  private calculateVelocity(target: Vector2, weapon: string): Vector2 {
    const speed = this.getWeaponSpeed(weapon)
    const distance = Math.sqrt(target.x * target.x + target.y * target.y)
    const normalizedX = target.x / distance
    const normalizedY = target.y / distance

    return {
      x: normalizedX * speed,
      y: normalizedY * speed
    }
  }

  private getWeaponSpeed(weapon: string): number {
    const speeds = {
      pistol: 1000,
      rifle: 1500,
      smg: 800,
      cyber: 2000
    }
    return speeds[weapon as keyof typeof speeds] || 1000
  }

  private getWeaponDamage(weapon: string): number {
    const damages = {
      pistol: 25,
      rifle: 40,
      smg: 15,
      cyber: 60
    }
    return damages[weapon as keyof typeof damages] || 25
  }

  // Damage handling
  processDamageEvent(event: any) {
    const { targetId, damage, damageType, sourceId } = event
    
    this.emit('damageDealt', {
      targetId,
      damage,
      damageType,
      sourceId,
      timestamp: Date.now()
    })

    // Check for death
    if (this.isFatalDamage(targetId, damage)) {
      this.emit('playerKilled', { targetId, killerId: sourceId })
    }
  }

  private isFatalDamage(playerId: string, damage: number): boolean {
    // This would check player's current health
    // For now, assume any damage can be fatal
    return true
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

  private detectCollision(projectile: any): any {
    // Simple collision detection
    // In a real game, this would use spatial partitioning
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
}


