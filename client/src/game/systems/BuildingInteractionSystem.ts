// Building interaction and interior system
export interface DoorInfo {
  tileX: number
  tileY: number
  worldX: number
  worldY: number
  buildingId: string
  buildingType: string
  interactive: boolean
}

export interface Interior {
  buildingId: string
  buildingType: string
  layout: string[][] // Tile map for interior
  spawnPoint: { x: number, y: number }
  exits: { x: number, y: number }[]
  npcs: any[]
  loot: any[]
}

export class BuildingInteractionSystem {
  private worldSystem: any
  private currentInterior: Interior | null = null
  private nearbyDoor: DoorInfo | null = null
  private interactionRange = 60 // pixels

  constructor(worldSystem: any) {
    this.worldSystem = worldSystem
  }

  update(playerPosition: { x: number, y: number }) {
    if (this.currentInterior) {
      // Player is inside a building - check for exit proximity
      this.checkExitProximity(playerPosition)
    } else {
      // Player is outside - check for door proximity
      this.checkDoorProximity(playerPosition)
    }
  }

  private checkDoorProximity(playerPosition: { x: number, y: number }) {
    const doors = this.getDoorsNearPlayer(playerPosition)
    
    if (doors.length > 0) {
      // Find closest door
      const closest = doors.reduce((prev, curr) => {
        const prevDist = this.distanceToPoint(playerPosition, { x: prev.worldX, y: prev.worldY })
        const currDist = this.distanceToPoint(playerPosition, { x: curr.worldX, y: curr.worldY })
        return currDist < prevDist ? curr : prev
      })

      const distance = this.distanceToPoint(playerPosition, { x: closest.worldX, y: closest.worldY })
      
      if (distance <= this.interactionRange && closest.interactive) {
        this.nearbyDoor = closest
      } else {
        this.nearbyDoor = null
      }
    } else {
      this.nearbyDoor = null
    }
  }

  private checkExitProximity(playerPosition: { x: number, y: number }) {
    if (!this.currentInterior) return

    for (const exit of this.currentInterior.exits) {
      const distance = this.distanceToPoint(playerPosition, exit)
      if (distance <= this.interactionRange) {
        // Player can exit here
        return
      }
    }
  }

  private getDoorsNearPlayer(playerPosition: { x: number, y: number }): DoorInfo[] {
    const CHUNK_SIZE = 1000
    const chunkX = Math.floor(playerPosition.x / CHUNK_SIZE)
    const chunkY = Math.floor(playerPosition.y / CHUNK_SIZE)
    
    const doors: DoorInfo[] = []
    
    // Check current chunk and adjacent chunks
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const chunk = this.worldSystem?.getChunk(`chunk_${chunkX + dx}_${chunkY + dy}`)
        if (chunk?.generatedData?.doors) {
          doors.push(...chunk.generatedData.doors)
        }
      }
    }

    return doors
  }

  private distanceToPoint(from: { x: number, y: number }, to: { x: number, y: number }): number {
    const dx = from.x - to.x
    const dy = from.y - to.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Enter building - generate interior if needed
  enterBuilding(door: DoorInfo): Interior | null {
    if (!door.interactive) return null

    // Generate interior based on building type
    const interior = this.generateInterior(door)
    this.currentInterior = interior
    
    return interior
  }

  // Exit building
  exitBuilding(): { x: number, y: number } | null {
    if (!this.currentInterior) return null

    const nearbyDoor = this.nearbyDoor
    this.currentInterior = null
    this.nearbyDoor = null

    // Return player to door position outside
    return nearbyDoor ? { x: nearbyDoor.worldX, y: nearbyDoor.worldY } : null
  }

  private generateInterior(door: DoorInfo): Interior {
    const layoutSize = this.getInteriorSize(door.buildingType)
    const layout = this.generateInteriorLayout(door.buildingType, layoutSize)

    return {
      buildingId: door.buildingId,
      buildingType: door.buildingType,
      layout,
      spawnPoint: { x: layoutSize.width / 2, y: layoutSize.height - 2 }, // Near entrance
      exits: [{ x: layoutSize.width / 2, y: layoutSize.height - 1 }], // Bottom center
      npcs: this.generateInteriorNPCs(door.buildingType),
      loot: this.generateInteriorLoot(door.buildingType)
    }
  }

  private getInteriorSize(buildingType: string): { width: number, height: number } {
    const sizes = {
      shop: { width: 15, height: 12 },
      safehouse: { width: 12, height: 10 },
      office: { width: 20, height: 15 },
      apartment: { width: 10, height: 8 },
      warehouse: { width: 25, height: 20 },
      club: { width: 18, height: 14 },
      hideout: { width: 14, height: 11 }
    }
    return sizes[buildingType as keyof typeof sizes] || { width: 12, height: 10 }
  }

  private generateInteriorLayout(buildingType: string, size: { width: number, height: number }): string[][] {
    const layout: string[][] = []
    
    // Initialize with floor tiles
    for (let y = 0; y < size.height; y++) {
      const row: string[] = []
      for (let x = 0; x < size.width; x++) {
        // Walls on edges
        if (x === 0 || x === size.width - 1 || y === 0 || y === size.height - 1) {
          // Exit at bottom center
          if (y === size.height - 1 && x === Math.floor(size.width / 2)) {
            row.push('door')
          } else {
            row.push('wall')
          }
        } else {
          // Interior floor
          row.push(this.getFloorType(buildingType))
        }
      }
      layout.push(row)
    }

    // Add furniture/features based on building type
    this.addInteriorFeatures(layout, buildingType)

    return layout
  }

  private getFloorType(buildingType: string): string {
    const floors = {
      shop: 'tile',
      safehouse: 'wood',
      office: 'carpet',
      apartment: 'wood',
      warehouse: 'concrete',
      club: 'tile',
      hideout: 'metal'
    }
    return floors[buildingType as keyof typeof floors] || 'concrete'
  }

  private addInteriorFeatures(layout: string[][], buildingType: string) {
    const height = layout.length
    const width = layout[0].length

    // Add type-specific features
    if (buildingType === 'shop') {
      // Counter at the top
      for (let x = 2; x < width - 2; x++) {
        if (layout[2] && x < layout[2].length) {
          layout[2][x] = 'counter'
        }
      }
      // Shelves on sides
      for (let y = 4; y < height - 3; y++) {
        if (layout[y]) {
          layout[y][2] = 'shelf'
          layout[y][width - 3] = 'shelf'
        }
      }
    } else if (buildingType === 'safehouse') {
      // Bed in corner
      if (layout[2] && layout[3]) {
        layout[2][2] = 'bed'
        layout[3][2] = 'bed'
      }
      // Storage chest
      if (layout[2]) {
        layout[2][width - 3] = 'chest'
      }
      // Table in center
      const centerY = Math.floor(height / 2)
      const centerX = Math.floor(width / 2)
      if (layout[centerY]) {
        layout[centerY][centerX] = 'table'
      }
    } else if (buildingType === 'office' || buildingType === 'apartment') {
      // Desks/furniture scattered
      for (let i = 0; i < 5; i++) {
        const x = 2 + Math.floor(Math.random() * (width - 4))
        const y = 2 + Math.floor(Math.random() * (height - 4))
        if (layout[y] && layout[y][x] === this.getFloorType(buildingType)) {
          layout[y][x] = 'furniture'
        }
      }
    }
  }

  private generateInteriorNPCs(buildingType: string): any[] {
    const npcs: any[] = []

    if (buildingType === 'shop') {
      npcs.push({
        id: 'shopkeeper_' + Math.random().toString(36).substr(2, 9),
        type: 'shopkeeper',
        position: { x: 7.5, y: 2.5 }, // Behind counter
        name: 'Shopkeeper',
        dialogue: ['Welcome to my shop!', 'Looking to buy or sell?']
      })
    } else if (buildingType === 'office') {
      npcs.push({
        id: 'fixer_' + Math.random().toString(36).substr(2, 9),
        type: 'fixer',
        position: { x: 10, y: 7 },
        name: 'Fixer',
        dialogue: ['Got work for you.', 'These contracts pay well.']
      })
    }

    return npcs
  }

  private generateInteriorLoot(buildingType: string): any[] {
    const loot: any[] = []

    // Add some basic loot based on building type
    const lootCount = Math.floor(Math.random() * 3) + 1
    
    for (let i = 0; i < lootCount; i++) {
      loot.push({
        id: 'loot_' + Math.random().toString(36).substr(2, 9),
        type: this.getLootType(buildingType),
        position: {
          x: 2 + Math.random() * 8,
          y: 2 + Math.random() * 6
        }
      })
    }

    return loot
  }

  private getLootType(buildingType: string): string {
    const types = {
      shop: 'credits',
      safehouse: 'ammo',
      office: 'data',
      apartment: 'consumable',
      warehouse: 'material',
      club: 'credits',
      hideout: 'weapon'
    }
    return types[buildingType as keyof typeof types] || 'credits'
  }

  // Public getters
  getNearbyDoor(): DoorInfo | null {
    return this.nearbyDoor
  }

  getCurrentInterior(): Interior | null {
    return this.currentInterior
  }

  isInside(): boolean {
    return this.currentInterior !== null
  }

  canInteract(): boolean {
    if (this.currentInterior) {
      // Check if near exit
      return false // TODO: implement exit proximity check
    }
    return this.nearbyDoor !== null
  }

  interact(): boolean {
    if (this.nearbyDoor && !this.currentInterior) {
      this.enterBuilding(this.nearbyDoor)
      return true
    } else if (this.currentInterior) {
      this.exitBuilding()
      return true
    }
    return false
  }
}
