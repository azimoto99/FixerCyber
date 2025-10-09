// UI system for rendering game interface elements
import { Vector2 } from '../../types/game'

export class UISystem {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private combatSystem: any
  private playerData: any = null
  private damageNumbers: DamageNumber[] = []
  private killFeed: KillFeedEntry[] = []
  private time = 0

  constructor(canvas: HTMLCanvasElement, combatSystem?: any) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.combatSystem = combatSystem
  }

  update(deltaTime: number, _playerPosition: Vector2) {
    this.time += deltaTime
    
    // Update damage numbers
    this.damageNumbers.forEach((dmg, index) => {
      dmg.life += deltaTime
      dmg.y -= 50 * deltaTime / 1000 // Float upwards
      dmg.alpha = Math.max(0, 1 - dmg.life / dmg.maxLife)
      
      if (dmg.life >= dmg.maxLife) {
        this.damageNumbers.splice(index, 1)
      }
    })
    
    // Update kill feed
    this.killFeed.forEach((entry, index) => {
      entry.life += deltaTime
      if (entry.life >= entry.maxLife) {
        this.killFeed.splice(index, 1)
      }
    })
    
    // Get current player data if available
    if (this.combatSystem) {
      this.playerData = this.combatSystem.getPlayerStats('demo-player')
    }
  }

  render() {
    this.ctx.save()
    
    // Render HUD elements
    this.renderHealthBar()
    this.renderAmmoCounter()
    // this.renderCrosshair() // Removed - only cursor should be crosshair
    this.renderMiniMap()
    this.renderDamageNumbers()
    this.renderKillFeed()
    this.renderPlayerStats()
    
    this.ctx.restore()
  }

  private renderHealthBar() {
    if (!this.playerData?.health) return

    const x = 20
    const y = this.canvas.height - 80
    const width = 200
    const height = 20
    const health = this.playerData.health.current
    const maxHealth = this.playerData.health.max
    const armor = this.playerData.health.armor || 0

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    this.ctx.fillRect(x - 5, y - 5, width + 10, height + 10)

    // Health bar background
    this.ctx.fillStyle = '#330000'
    this.ctx.fillRect(x, y, width, height)

    // Health bar
    const healthPercent = health / maxHealth
    this.ctx.fillStyle = this.getHealthColor(healthPercent)
    this.ctx.fillRect(x, y, width * healthPercent, height)

    // Armor bar (if any)
    if (armor > 0) {
      const armorY = y - 8
      const armorHeight = 6
      this.ctx.fillStyle = '#003366'
      this.ctx.fillRect(x, armorY, width, armorHeight)
      
      const armorPercent = Math.min(armor / 100, 1) // Assume max armor is 100
      this.ctx.fillStyle = '#0099ff'
      this.ctx.fillRect(x, armorY, width * armorPercent, armorHeight)
    }

    // Health text
    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = '14px monospace'
    this.ctx.textAlign = 'left'
    this.ctx.fillText(`${Math.round(health)}/${maxHealth}`, x + 5, y + 15)

    // Labels
    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = '12px monospace'
    this.ctx.fillText('HEALTH', x, y - 8)
  }

  private renderAmmoCounter() {
    if (!this.playerData?.ammo) return

    const x = this.canvas.width - 120
    const y = this.canvas.height - 80
    const weapon = 'pistol' // Current weapon
    const ammo = this.playerData.ammo[weapon] || 0
    const maxAmmo = this.getMaxAmmo(weapon)
    const reloading = this.playerData.reloading

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    this.ctx.fillRect(x - 10, y - 30, 120, 50)

    // Ammo count
    this.ctx.fillStyle = ammo <= 3 ? '#ff0000' : '#ffffff'
    this.ctx.font = '24px monospace'
    this.ctx.textAlign = 'right'
    this.ctx.fillText(`${ammo}`, x + 50, y)

    // Max ammo
    this.ctx.fillStyle = '#999999'
    this.ctx.font = '16px monospace'
    this.ctx.fillText(`/${maxAmmo}`, x + 100, y)

    // Weapon name
    this.ctx.fillStyle = '#00ff88'
    this.ctx.font = '12px monospace'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(weapon.toUpperCase(), x + 50, y + 20)

    // Reload indicator
    if (reloading) {
      const progress = 1 - (reloading.timeRemaining / 2000) // Assume 2 second reload
      this.ctx.fillStyle = '#ffff00'
      this.ctx.fillRect(x, y - 25, 100 * progress, 3)
      
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = '10px monospace'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('RELOADING...', x + 50, y - 15)
    }
  }

  // Removed renderCrosshair method - only cursor should be crosshair
  /*
  private renderCrosshair() {
    const centerX = this.canvas.width / 2
    const centerY = this.canvas.height / 2
    const pulse = Math.sin(this.time * 0.008) * 0.2 + 0.8  // Less pulsing

    this.ctx.save()
    this.ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`  // White instead of cyan
    this.ctx.lineWidth = 2
    this.ctx.shadowColor = '#ffffff'
    this.ctx.shadowBlur = 4  // Less glow
    
    // Dynamic crosshair that expands when moving/shooting
    const spread = 15 // TODO: Make this dynamic based on movement/shooting
    
    // Main crosshair
    this.ctx.beginPath()
    this.ctx.moveTo(centerX - spread, centerY)
    this.ctx.lineTo(centerX - 5, centerY)
    this.ctx.moveTo(centerX + 5, centerY)
    this.ctx.lineTo(centerX + spread, centerY)
    this.ctx.moveTo(centerX, centerY - spread)
    this.ctx.lineTo(centerX, centerY - 5)
    this.ctx.moveTo(centerX, centerY + 5)
    this.ctx.lineTo(centerX, centerY + spread)
    this.ctx.stroke()
    
    // Center dot
    this.ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.8})`  // White dot
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, 2, 0, Math.PI * 2)
    this.ctx.fill()
    
    this.ctx.restore()
  }
  */

  private renderMiniMap() {
    const size = 120
    const x = this.canvas.width - size - 20
    const y = 20

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    this.ctx.fillRect(x, y, size, size)
    
    // Border
    this.ctx.strokeStyle = '#00ff88'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(x, y, size, size)

    // Grid
    this.ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)'
    this.ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      const gridX = x + (size / 4) * i
      const gridY = y + (size / 4) * i
      
      this.ctx.beginPath()
      this.ctx.moveTo(gridX, y)
      this.ctx.lineTo(gridX, y + size)
      this.ctx.moveTo(x, gridY)
      this.ctx.lineTo(x + size, gridY)
      this.ctx.stroke()
    }

    // Player position (center)
    const centerX = x + size / 2
    const centerY = y + size / 2
    
    this.ctx.fillStyle = '#00ff88'
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, 3, 0, Math.PI * 2)
    this.ctx.fill()

    // Label
    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = '10px monospace'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('RADAR', x + size / 2, y + size + 15)
  }

  private renderDamageNumbers() {
    this.damageNumbers.forEach(dmg => {
      this.ctx.save()
      this.ctx.globalAlpha = dmg.alpha
      this.ctx.fillStyle = dmg.color
      this.ctx.font = `${dmg.size}px monospace`
      this.ctx.textAlign = 'center'
      this.ctx.strokeStyle = '#000000'
      this.ctx.lineWidth = 2
      
      // Text outline
      this.ctx.strokeText(dmg.text, dmg.x, dmg.y)
      this.ctx.fillText(dmg.text, dmg.x, dmg.y)
      
      this.ctx.restore()
    })
  }

  private renderKillFeed() {
    if (this.killFeed.length === 0) return

    const x = this.canvas.width - 300
    let y = 100

    this.killFeed.forEach((entry, _index) => {
      const alpha = Math.max(0, 1 - entry.life / entry.maxLife)
      
      this.ctx.save()
      this.ctx.globalAlpha = alpha
      
      // Background
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      this.ctx.fillRect(x - 10, y - 15, 280, 20)
      
      // Kill text
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = '12px monospace'
      this.ctx.textAlign = 'right'
      this.ctx.fillText(entry.text, x + 260, y)
      
      this.ctx.restore()
      y += 25
    })
  }

  private renderPlayerStats() {
    if (!this.playerData) return

    const x = 20
    const y = 20

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    this.ctx.fillRect(x - 10, y - 5, 200, 60)

    // Stats
    this.ctx.fillStyle = '#00ff88'
    this.ctx.font = '12px monospace'
    this.ctx.textAlign = 'left'
    
    let textY = y + 10
    this.ctx.fillText('PLAYER: DEMO-PLAYER', x, textY)
    textY += 15
    this.ctx.fillText(`CREDITS: ${1000}`, x, textY) // TODO: Get actual credits
    textY += 15
    this.ctx.fillText(`KILLS: ${0}`, x, textY) // TODO: Track kills
  }

  // Public methods for UI events
  addDamageNumber(x: number, y: number, damage: number, isCritical = false) {
    this.damageNumbers.push({
      x,
      y,
      text: `-${Math.round(damage)}`,
      color: isCritical ? '#ff0000' : '#ffff00',
      size: isCritical ? 18 : 14,
      life: 0,
      maxLife: 2000,
      alpha: 1
    })
  }

  addKillFeedEntry(killer: string, victim: string, weapon: string) {
    this.killFeed.unshift({
      text: `${killer} [${weapon}] ${victim}`,
      life: 0,
      maxLife: 5000
    })
    
    // Keep only last 5 entries
    if (this.killFeed.length > 5) {
      this.killFeed.splice(5)
    }
  }

  private getHealthColor(healthPercent: number): string {
    if (healthPercent > 0.6) return '#00ff00'
    if (healthPercent > 0.3) return '#ffff00'
    return '#ff0000'
  }

  private getMaxAmmo(weapon: string): number {
    const maxAmmos = {
      pistol: 12,
      rifle: 30,
      smg: 25,
      cyber: 8
    }
    return maxAmmos[weapon as keyof typeof maxAmmos] || 12
  }
}

// Types
interface DamageNumber {
  x: number
  y: number
  text: string
  color: string
  size: number
  life: number
  maxLife: number
  alpha: number
}

interface KillFeedEntry {
  text: string
  life: number
  maxLife: number
}