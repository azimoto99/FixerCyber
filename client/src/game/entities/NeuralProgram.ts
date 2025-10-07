// Neural program entity for hacking system
export class NeuralProgram {
  public id: string
  public name: string
  public description: string
  public type: string
  public heatCost: number
  public duration: number
  public rarity: string
  public effects: any
  public cooldown: number
  public maxCooldown: number
  public isActive: boolean = false
  public isInstalled: boolean = false

  constructor(
    id: string,
    name: string,
    description: string,
    type: string,
    heatCost: number,
    duration: number,
    rarity: string
  ) {
    this.id = id
    this.name = name
    this.description = description
    this.type = type
    this.heatCost = heatCost
    this.duration = duration
    this.rarity = rarity
    this.effects = this.generateEffects(type)
    this.cooldown = 0
    this.maxCooldown = this.getCooldownForRarity(rarity)
  }

  // Program activation
  activate(player: any): boolean {
    if (this.isActive) return false
    if (this.cooldown > 0) return false
    if (player.getHeat() + this.heatCost > player.getMaxHeat()) return false

    this.isActive = true
    this.cooldown = this.maxCooldown
    this.applyEffects(player)
    
    // Set timer to deactivate
    setTimeout(() => {
      this.deactivate(player)
    }, this.duration * 1000)
    
    return true
  }

  deactivate(player: any): boolean {
    if (!this.isActive) return false
    
    this.isActive = false
    this.removeEffects(player)
    return true
  }

  // Install/Uninstall
  install(_player: any): boolean {
    if (this.isInstalled) return false
    
    this.isInstalled = true
    return true
  }

  uninstall(player: any): boolean {
    if (!this.isInstalled) return false
    if (this.isActive) {
      this.deactivate(player)
    }
    
    this.isInstalled = false
    return true
  }

  // Update cooldown
  update(deltaTime: number): void {
    if (this.cooldown > 0) {
      this.cooldown -= deltaTime
      if (this.cooldown < 0) {
        this.cooldown = 0
      }
    }
  }

  // Effects
  private applyEffects(player: any): void {
    switch (this.type) {
      case 'vision':
        this.applyVisionEffects(player)
        break
      case 'combat':
        this.applyCombatEffects(player)
        break
      case 'temporal':
        this.applyTemporalEffects(player)
        break
      case 'stealth':
        this.applyStealthEffects(player)
        break
      case 'hacking':
        this.applyHackingEffects(player)
        break
      case 'defense':
        this.applyDefenseEffects(player)
        break
    }
  }

  private removeEffects(player: any): void {
    switch (this.type) {
      case 'vision':
        this.removeVisionEffects(player)
        break
      case 'combat':
        this.removeCombatEffects(player)
        break
      case 'temporal':
        this.removeTemporalEffects(player)
        break
      case 'stealth':
        this.removeStealthEffects(player)
        break
      case 'hacking':
        this.removeHackingEffects(player)
        break
      case 'defense':
        this.removeDefenseEffects(player)
        break
    }
  }

  // Vision effects
  private applyVisionEffects(player: any): void {
    player.wallhack = true
    player.seeThroughWalls = true
    player.enhancedVision = true
  }

  private removeVisionEffects(player: any): void {
    player.wallhack = false
    player.seeThroughWalls = false
    player.enhancedVision = false
  }

  // Combat effects
  private applyCombatEffects(player: any): void {
    player.aimbot = true
    player.autoTarget = true
    player.combatAssist = true
  }

  private removeCombatEffects(player: any): void {
    player.aimbot = false
    player.autoTarget = false
    player.combatAssist = false
  }

  // Temporal effects
  private applyTemporalEffects(player: any): void {
    player.bullettime = true
    player.timeSlowdown = this.effects.timeSlowdown || 0.5
    player.temporalControl = true
  }

  private removeTemporalEffects(player: any): void {
    player.bullettime = false
    player.timeSlowdown = 1.0
    player.temporalControl = false
  }

  // Stealth effects
  private applyStealthEffects(player: any): void {
    player.stealth = true
    player.detectionChance = Math.max(0, (player.detectionChance || 1) - this.effects.detectionReduction)
    player.invisibility = this.effects.invisibility || 0
  }

  private removeStealthEffects(player: any): void {
    player.stealth = false
    player.detectionChance = Math.min(1, (player.detectionChance || 1) + this.effects.detectionReduction)
    player.invisibility = 0
  }

  // Hacking effects
  private applyHackingEffects(player: any): void {
    player.hackSpeed = (player.hackSpeed || 1) + this.effects.hackSpeed
    player.bypassChance = (player.bypassChance || 0) + this.effects.bypassChance
    player.heatReduction = (player.heatReduction || 0) + this.effects.heatReduction
  }

  private removeHackingEffects(player: any): void {
    player.hackSpeed = Math.max(1, (player.hackSpeed || 1) - this.effects.hackSpeed)
    player.bypassChance = Math.max(0, (player.bypassChance || 0) - this.effects.bypassChance)
    player.heatReduction = Math.max(0, (player.heatReduction || 0) - this.effects.heatReduction)
  }

  // Defense effects
  private applyDefenseEffects(player: any): void {
    player.firewall = true
    player.counterHack = true
    player.heatProtection = this.effects.heatProtection || 0
  }

  private removeDefenseEffects(player: any): void {
    player.firewall = false
    player.counterHack = false
    player.heatProtection = 0
  }

  // Generate effects based on program type
  private generateEffects(type: string): any {
    const effects = {
      vision: {
        wallhack: true,
        seeThroughWalls: true,
        enhancedVision: true
      },
      combat: {
        aimbot: true,
        autoTarget: true,
        combatAssist: true
      },
      temporal: {
        timeSlowdown: 0.5,
        bullettime: true,
        temporalControl: true
      },
      stealth: {
        detectionReduction: 0.5,
        invisibility: 0.3,
        stealth: true
      },
      hacking: {
        hackSpeed: 2.0,
        bypassChance: 0.3,
        heatReduction: 0.2
      },
      defense: {
        firewall: true,
        counterHack: true,
        heatProtection: 0.4
      }
    }
    return effects[type as keyof typeof effects] || {}
  }

  // Utility methods
  getCooldownPercentage(): number {
    if (this.maxCooldown === 0) return 0
    return (this.cooldown / this.maxCooldown) * 100
  }

  canActivate(): boolean {
    return !this.isActive && this.cooldown <= 0
  }

  private getCooldownForRarity(rarity: string): number {
    const cooldowns = {
      common: 30,
      uncommon: 60,
      rare: 120,
      epic: 300,
      legendary: 600
    }
    return cooldowns[rarity as keyof typeof cooldowns] || 30
  }

  // Create neural program from data
  static createFromData(data: any): NeuralProgram {
    return new NeuralProgram(
      data.id,
      data.name,
      data.description,
      data.type,
      data.heatCost,
      data.duration,
      data.rarity
    )
  }

  // Create random neural program
  static createRandom(type: string, rarity: string): NeuralProgram {
    const names = this.getNamesForType(type)
    const name = names[Math.floor(Math.random() * names.length)]
    const description = this.getDescriptionForType(type)
    const heatCost = this.getHeatCostForRarity(rarity)
    const duration = this.getDurationForRarity(rarity)

    return new NeuralProgram(
      Math.random().toString(36).substr(2, 9),
      name,
      description,
      type,
      heatCost,
      duration,
      rarity
    )
  }

  private static getNamesForType(type: string): string[] {
    const names = {
      vision: ['Wallhack.exe', 'X-Ray.exe', 'Thermal.exe', 'Night Vision.exe'],
      combat: ['Aimbot.exe', 'Auto-Aim.exe', 'Target Lock.exe', 'Combat Assist.exe'],
      temporal: ['Bullettime.exe', 'Slow Motion.exe', 'Time Dilation.exe', 'Temporal Control.exe'],
      stealth: ['Stealth.exe', 'Invisibility.exe', 'Shadow.exe', 'Ghost Mode.exe'],
      hacking: ['Datamine.exe', 'Hack Boost.exe', 'Neural Net.exe', 'Cyber Deck.exe'],
      defense: ['Firewall.exe', 'Shield.exe', 'Protection.exe', 'Guardian.exe']
    }
    return names[type as keyof typeof names] || []
  }

  private static getDescriptionForType(type: string): string {
    const descriptions = {
      vision: 'Enhances visual capabilities and perception',
      combat: 'Improves combat accuracy and targeting',
      temporal: 'Controls time perception and flow',
      stealth: 'Reduces detection and improves stealth',
      hacking: 'Boosts hacking abilities and neural interface',
      defense: 'Provides protection against cyber attacks'
    }
    return descriptions[type as keyof typeof descriptions] || 'Unknown program type'
  }

  private static getHeatCostForRarity(rarity: string): number {
    const costs = {
      common: 5,
      uncommon: 10,
      rare: 20,
      epic: 35,
      legendary: 50
    }
    return costs[rarity as keyof typeof costs] || 5
  }

  private static getDurationForRarity(rarity: string): number {
    const durations = {
      common: 10,
      uncommon: 20,
      rare: 30,
      epic: 45,
      legendary: 60
    }
    return durations[rarity as keyof typeof durations] || 10
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      heatCost: this.heatCost,
      duration: this.duration,
      rarity: this.rarity,
      effects: this.effects,
      cooldown: this.cooldown,
      maxCooldown: this.maxCooldown,
      isActive: this.isActive,
      isInstalled: this.isInstalled
    }
  }

  static fromJSON(data: any): NeuralProgram {
    const program = new NeuralProgram(
      data.id,
      data.name,
      data.description,
      data.type,
      data.heatCost,
      data.duration,
      data.rarity
    )
    
    program.effects = data.effects || program.effects
    program.cooldown = data.cooldown || 0
    program.maxCooldown = data.maxCooldown || program.maxCooldown
    program.isActive = data.isActive || false
    program.isInstalled = data.isInstalled || false
    
    return program
  }
}


