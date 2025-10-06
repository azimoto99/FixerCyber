import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

export class WorldService {
  private prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient()
  }

  async getChunk(x: number, y: number) {
    try {
      let chunk = await this.prisma.worldChunk.findFirst({
        where: { x, y }
      })

      if (!chunk) {
        // Generate new chunk if it doesn't exist
        chunk = await this.generateChunk(x, y)
      }

      return chunk
    } catch (error) {
      console.error('Get chunk error:', error)
      return null
    }
  }

  async generateChunk(x: number, y: number) {
    try {
      // Generate procedural world data
      const districtType = this.getDistrictType(x, y)
      const generatedData = this.generateChunkData(x, y, districtType)

      const chunk = await this.prisma.worldChunk.create({
        data: {
          id: uuidv4(),
          x,
          y,
          districtType,
          generatedData
        }
      })

      return chunk
    } catch (error) {
      console.error('Generate chunk error:', error)
      return null
    }
  }

  async getNearbyPlayers(x: number, y: number, radius: number) {
    try {
      const players = await this.prisma.player.findMany({
        where: {
          isAlive: true,
          positionX: {
            gte: x - radius,
            lte: x + radius
          },
          positionY: {
            gte: y - radius,
            lte: y + radius
          }
        },
        select: {
          id: true,
          username: true,
          positionX: true,
          positionY: true,
          health: true,
          lastSeen: true
        }
      })

      return players
    } catch (error) {
      console.error('Get nearby players error:', error)
      return []
    }
  }

  async getWorldInfo() {
    try {
      const stats = await this.prisma.worldChunk.aggregate({
        _count: {
          id: true
        }
      })

      const activePlayers = await this.prisma.player.count({
        where: {
          isAlive: true,
          lastSeen: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // Active in last 5 minutes
          }
        }
      })

      return {
        totalChunks: stats._count.id,
        activePlayers,
        worldSize: {
          minX: -100,
          maxX: 100,
          minY: -100,
          maxY: 100
        }
      }
    } catch (error) {
      console.error('Get world info error:', error)
      return {
        totalChunks: 0,
        activePlayers: 0,
        worldSize: { minX: -100, maxX: 100, minY: -100, maxY: 100 }
      }
    }
  }

  private getDistrictType(x: number, y: number): string {
    // Simple district generation based on coordinates
    const distance = Math.sqrt(x * x + y * y)
    
    if (distance < 10) {
      return 'corporate'
    } else if (distance < 25) {
      return 'residential'
    } else if (distance < 40) {
      return 'industrial'
    } else if (distance < 60) {
      return 'underground'
    } else {
      return 'wasteland'
    }
  }

  private generateChunkData(x: number, y: number, districtType: string) {
    // Generate buildings, roads, and other world elements
    const buildings = this.generateBuildings(x, y, districtType)
    const roads = this.generateRoads(x, y)
    const npcs = this.generateNPCs(x, y, districtType)

    return {
      buildings,
      roads,
      npcs,
      generatedAt: new Date().toISOString()
    }
  }

  private generateBuildings(x: number, y: number, districtType: string) {
    const buildings = []
    const buildingCount = Math.floor(Math.random() * 5) + 2

    for (let i = 0; i < buildingCount; i++) {
      buildings.push({
        id: uuidv4(),
        type: this.getBuildingType(districtType),
        position: {
          x: Math.random() * 1000,
          y: Math.random() * 1000
        },
        size: {
          width: Math.random() * 100 + 50,
          height: Math.random() * 100 + 50
        },
        hackable: Math.random() > 0.5,
        securityLevel: Math.floor(Math.random() * 5) + 1
      })
    }

    return buildings
  }

  private generateRoads(x: number, y: number) {
    const roads = []
    
    // Generate main roads
    if (Math.random() > 0.3) {
      roads.push({
        id: uuidv4(),
        type: 'main',
        start: { x: 0, y: 500 },
        end: { x: 1000, y: 500 },
        width: 80
      })
    }

    if (Math.random() > 0.3) {
      roads.push({
        id: uuidv4(),
        type: 'main',
        start: { x: 500, y: 0 },
        end: { x: 500, y: 1000 },
        width: 80
      })
    }

    return roads
  }

  private generateNPCs(x: number, y: number, districtType: string) {
    const npcs = []
    const npcCount = Math.floor(Math.random() * 3) + 1

    for (let i = 0; i < npcCount; i++) {
      npcs.push({
        id: uuidv4(),
        type: this.getNPCType(districtType),
        position: {
          x: Math.random() * 1000,
          y: Math.random() * 1000
        },
        behavior: 'patrol',
        faction: this.getFaction(districtType)
      })
    }

    return npcs
  }

  private getBuildingType(districtType: string): string {
    const buildingTypes = {
      corporate: ['office', 'tower', 'plaza'],
      residential: ['apartment', 'house', 'complex'],
      industrial: ['warehouse', 'factory', 'depot'],
      underground: ['hideout', 'club', 'market'],
      wasteland: ['ruin', 'shack', 'outpost']
    }

    const types = buildingTypes[districtType as keyof typeof buildingTypes] || ['building']
    return types[Math.floor(Math.random() * types.length)]
  }

  private getNPCType(districtType: string): string {
    const npcTypes = {
      corporate: ['guard', 'executive', 'security'],
      residential: ['civilian', 'resident', 'worker'],
      industrial: ['worker', 'foreman', 'technician'],
      underground: ['fixer', 'dealer', 'thug'],
      wasteland: ['scavenger', 'raider', 'survivor']
    }

    const types = npcTypes[districtType as keyof typeof npcTypes] || ['npc']
    return types[Math.floor(Math.random() * types.length)]
  }

  private getFaction(districtType: string): string {
    const factions = {
      corporate: ['corporate', 'government'],
      residential: ['civilian', 'neutral'],
      industrial: ['corporate', 'union'],
      underground: ['gang', 'syndicate'],
      wasteland: ['raider', 'scavenger']
    }

    const factionList = factions[districtType as keyof typeof factions] || ['neutral']
    return factionList[Math.floor(Math.random() * factionList.length)]
  }
}



