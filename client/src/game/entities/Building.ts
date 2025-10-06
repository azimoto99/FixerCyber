// Building entity
import { Vector2 } from '../../types/game'

export class Building {
  public id: string
  public type: string
  public position: Vector2
  public size: Vector2
  public hackable: boolean
  public securityLevel: number
  public lootTables: any[] = []
  public isLocked: boolean = false
  public owner: string | null = null
  public faction: string | null = null

  constructor(
    id: string,
    type: string,
    position: Vector2,
    size: Vector2,
    hackable: boolean = false,
    securityLevel: number = 1
  ) {
    this.id = id
    this.type = type
    this.position = position
    this.size = size
    this.hackable = hackable
    this.securityLevel = securityLevel
  }

  // Building interactions
  canEnter(player: any): boolean {
    if (this.isLocked && !this.hackable) {
      return false
    }
    return true
  }

  enter(player: any): boolean {
    if (!this.canEnter(player)) {
      return false
    }
    // Handle building entry logic
    return true
  }

  exit(player: any): boolean {
    // Handle building exit logic
    return true
  }

  // Hacking
  canHack(): boolean {
    return this.hackable && this.securityLevel > 0
  }

  hack(securityLevel: number): boolean {
    if (!this.canHack()) {
      return false
    }

    if (securityLevel >= this.securityLevel) {
      this.securityLevel = 0
      this.isLocked = false
      return true
    }
    return false
  }

  // Loot system
  generateLoot(): any[] {
    const loot: any[] = []
    
    this.lootTables.forEach(table => {
      if (Math.random() < table.dropChance) {
        table.items.forEach((item: any) => {
          if (Math.random() < item.weight) {
            loot.push({
              ...item,
              id: this.generateId()
            })
          }
        })
      }
    })
    
    return loot
  }

  // Building types
  static getBuildingTypes(): string[] {
    return [
      'office',
      'apartment',
      'warehouse',
      'shop',
      'hideout',
      'tower',
      'factory',
      'club',
      'market',
      'outpost'
    ]
  }

  static getBuildingTypeInfo(type: string): any {
    const types = {
      office: {
        hackable: true,
        securityLevel: 3,
        lootChance: 0.3,
        description: 'Corporate office building'
      },
      apartment: {
        hackable: false,
        securityLevel: 1,
        lootChance: 0.1,
        description: 'Residential apartment'
      },
      warehouse: {
        hackable: true,
        securityLevel: 2,
        lootChance: 0.5,
        description: 'Industrial warehouse'
      },
      shop: {
        hackable: true,
        securityLevel: 2,
        lootChance: 0.4,
        description: 'Commercial shop'
      },
      hideout: {
        hackable: true,
        securityLevel: 1,
        lootChance: 0.6,
        description: 'Underground hideout'
      },
      tower: {
        hackable: true,
        securityLevel: 5,
        lootChance: 0.8,
        description: 'Corporate tower'
      },
      factory: {
        hackable: true,
        securityLevel: 3,
        lootChance: 0.4,
        description: 'Industrial factory'
      },
      club: {
        hackable: false,
        securityLevel: 1,
        lootChance: 0.2,
        description: 'Nightclub'
      },
      market: {
        hackable: false,
        securityLevel: 0,
        lootChance: 0.1,
        description: 'Public market'
      },
      outpost: {
        hackable: true,
        securityLevel: 2,
        lootChance: 0.3,
        description: 'Wasteland outpost'
      }
    }

    return types[type as keyof typeof types] || {
      hackable: false,
      securityLevel: 1,
      lootChance: 0.1,
      description: 'Unknown building'
    }
  }

  // Utility methods
  getCenter(): Vector2 {
    return {
      x: this.position.x + this.size.x / 2,
      y: this.position.y + this.size.y / 2
    }
  }

  contains(point: Vector2): boolean {
    return (
      point.x >= this.position.x &&
      point.x <= this.position.x + this.size.x &&
      point.y >= this.position.y &&
      point.y <= this.position.y + this.size.y
    )
  }

  getDistanceTo(point: Vector2): number {
    const center = this.getCenter()
    const dx = center.x - point.x
    const dy = center.y - point.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      position: this.position,
      size: this.size,
      hackable: this.hackable,
      securityLevel: this.securityLevel,
      lootTables: this.lootTables,
      isLocked: this.isLocked,
      owner: this.owner,
      faction: this.faction
    }
  }

  static fromJSON(data: any): Building {
    const building = new Building(
      data.id,
      data.type,
      data.position,
      data.size,
      data.hackable,
      data.securityLevel
    )
    
    building.lootTables = data.lootTables || []
    building.isLocked = data.isLocked || false
    building.owner = data.owner || null
    building.faction = data.faction || null
    
    return building
  }
}


