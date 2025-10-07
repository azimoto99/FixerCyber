// Advanced cyberpunk city generation utilities
import { Building } from '../entities/Building'
import { Item, Rarity } from '../entities/Item'

interface Street {
  id: string
  type: 'main' | 'secondary' | 'alley' | 'highway'
  points: {x: number, y: number}[]
  width: number
  connections: string[]
}

interface CityBlock {
  id: string
  vertices: {x: number, y: number}[]
  lots: BuildingLot[]
  blockType: string
}

interface BuildingLot {
  id: string
  vertices: {x: number, y: number}[]
  frontage: {x: number, y: number}[]
  depth: number
  building?: any
}

interface CityPlan {
  streets: Street[]
  blocks: CityBlock[]
  landmarks: any[]
  infrastructure: any[]
}

export class WorldGenerator {
  private static readonly CHUNK_SIZE = 1000
  private static readonly BLOCK_SIZE_MIN = 80
  private static readonly BLOCK_SIZE_MAX = 200
  private static readonly STREET_WIDTH_MAIN = 40
  private static readonly STREET_WIDTH_SECONDARY = 25
  private static readonly STREET_WIDTH_ALLEY = 15

  // Generate a realistic city chunk
  static generateChunk(x: number, y: number, districtType: string): any {
    const seed = this.generateSeed(x, y)
    const random = this.createSeededRandom(seed)

    // Generate city plan for this chunk
    const cityPlan = this.generateCityPlan(x, y, districtType, random)

    const chunk = {
      id: this.generateChunkId(x, y),
      x,
      y,
      districtType,
      buildings: this.placeBuildingsInBlocks(cityPlan, districtType, random),
      roads: this.convertStreetsToRoads(cityPlan.streets),
      npcs: this.generateNPCs(random, districtType),
      loot: this.generateLoot(random, districtType),
      infrastructure: cityPlan.infrastructure,
      generatedAt: new Date().toISOString()
    }

    return chunk
  }

  // Generate a complete city plan with streets and blocks
  private static generateCityPlan(chunkX: number, chunkY: number, districtType: string, random: () => number): CityPlan {
    const baseX = chunkX * this.CHUNK_SIZE
    const baseY = chunkY * this.CHUNK_SIZE
    
    // Create street network based on district type and location
    const streets = this.generateStreetNetwork(baseX, baseY, districtType, random)
    
    // Generate city blocks from street intersections
    const blocks = this.generateCityBlocks(streets, districtType, random)
    
    // Add infrastructure elements
    const infrastructure = this.generateInfrastructure(baseX, baseY, districtType, random)
    
    return {
      streets,
      blocks,
      landmarks: [], // TODO: Add landmarks
      infrastructure
    }
  }

  // Generate realistic street network
  private static generateStreetNetwork(baseX: number, baseY: number, districtType: string, random: () => number): Street[] {
    const streets: Street[] = []
    const streetId = () => this.generateId()
    
    // Main arterial streets - these define the major structure
    if (districtType === 'corporate') {
      // Corporate districts have wide, straight streets in a modified grid
      streets.push({
        id: streetId(),
        type: 'main',
        points: [
          { x: baseX, y: baseY + this.CHUNK_SIZE * 0.3 + (random() - 0.5) * 50 },
          { x: baseX + this.CHUNK_SIZE, y: baseY + this.CHUNK_SIZE * 0.3 + (random() - 0.5) * 50 }
        ],
        width: this.STREET_WIDTH_MAIN,
        connections: []
      })
      
      streets.push({
        id: streetId(),
        type: 'main',
        points: [
          { x: baseX, y: baseY + this.CHUNK_SIZE * 0.7 + (random() - 0.5) * 50 },
          { x: baseX + this.CHUNK_SIZE, y: baseY + this.CHUNK_SIZE * 0.7 + (random() - 0.5) * 50 }
        ],
        width: this.STREET_WIDTH_MAIN,
        connections: []
      })
      
      // Vertical main streets
      streets.push({
        id: streetId(),
        type: 'main',
        points: [
          { x: baseX + this.CHUNK_SIZE * 0.4 + (random() - 0.5) * 50, y: baseY },
          { x: baseX + this.CHUNK_SIZE * 0.4 + (random() - 0.5) * 50, y: baseY + this.CHUNK_SIZE }
        ],
        width: this.STREET_WIDTH_MAIN,
        connections: []
      })
      
    } else if (districtType === 'residential') {
      // Residential has more organic, curved streets
      const numMainStreets = 2 + Math.floor(random() * 2)
      for (let i = 0; i < numMainStreets; i++) {
        const curvature = (random() - 0.5) * 0.3
        const startY = baseY + (i + 1) * this.CHUNK_SIZE / (numMainStreets + 1) + (random() - 0.5) * 100
        
        streets.push({
          id: streetId(),
          type: 'secondary',
          points: this.generateCurvedStreet(
            { x: baseX, y: startY },
            { x: baseX + this.CHUNK_SIZE, y: startY + curvature * this.CHUNK_SIZE },
            random
          ),
          width: this.STREET_WIDTH_SECONDARY,
          connections: []
        })
      }
      
    } else if (districtType === 'industrial') {
      // Industrial has wide, functional streets
      streets.push({
        id: streetId(),
        type: 'main',
        points: [
          { x: baseX, y: baseY + this.CHUNK_SIZE * 0.5 },
          { x: baseX + this.CHUNK_SIZE, y: baseY + this.CHUNK_SIZE * 0.5 }
        ],
        width: this.STREET_WIDTH_MAIN + 20, // Extra wide for trucks
        connections: []
      })
      
    } else if (districtType === 'underground') {
      // Underground has narrow, twisting passages
      const numTunnels = 3 + Math.floor(random() * 3)
      for (let i = 0; i < numTunnels; i++) {
        streets.push({
          id: streetId(),
          type: 'alley',
          points: this.generateTwistingPath(baseX, baseY, random),
          width: this.STREET_WIDTH_ALLEY,
          connections: []
        })
      }
    }
    
    // Add secondary streets to connect main ones
    const secondaryStreets = this.generateSecondaryStreets(streets, baseX, baseY, districtType, random)
    streets.push(...secondaryStreets)
    
    return streets
  }

  // Helper method to generate curved streets
  private static generateCurvedStreet(start: {x: number, y: number}, end: {x: number, y: number}, random: () => number): {x: number, y: number}[] {
    const points = [start]
    const segments = 5 + Math.floor(random() * 5)
    
    for (let i = 1; i < segments; i++) {
      const t = i / segments
      const baseX = start.x + (end.x - start.x) * t
      const baseY = start.y + (end.y - start.y) * t
      
      // Add some curvature
      const offset = Math.sin(t * Math.PI) * (random() - 0.5) * 50
      
      points.push({
        x: baseX + offset,
        y: baseY + offset * 0.5
      })
    }
    
    points.push(end)
    return points
  }

  // Helper method to generate twisting underground paths
  private static generateTwistingPath(baseX: number, baseY: number, random: () => number): {x: number, y: number}[] {
    const points = []
    const startX = baseX + random() * this.CHUNK_SIZE
    const startY = baseY + random() * this.CHUNK_SIZE
    
    let currentX = startX
    let currentY = startY
    
    points.push({ x: currentX, y: currentY })
    
    const numSegments = 8 + Math.floor(random() * 12)
    for (let i = 0; i < numSegments; i++) {
      const angle = random() * Math.PI * 2
      const distance = 20 + random() * 80
      
      currentX += Math.cos(angle) * distance
      currentY += Math.sin(angle) * distance
      
      // Keep within chunk bounds
      currentX = Math.max(baseX + 50, Math.min(baseX + this.CHUNK_SIZE - 50, currentX))
      currentY = Math.max(baseY + 50, Math.min(baseY + this.CHUNK_SIZE - 50, currentY))
      
      points.push({ x: currentX, y: currentY })
    }
    
    return points
  }

  // Generate secondary streets to connect main streets
  private static generateSecondaryStreets(_mainStreets: Street[], baseX: number, baseY: number, districtType: string, random: () => number): Street[] {
    const secondaryStreets: Street[] = []
    const streetId = () => this.generateId()
    
    if (districtType === 'corporate') {
      // Add perpendicular connecting streets
      for (let i = 0; i < 3; i++) {
        const x = baseX + (i + 1) * this.CHUNK_SIZE / 4 + (random() - 0.5) * 100
        secondaryStreets.push({
          id: streetId(),
          type: 'secondary',
          points: [
            { x, y: baseY },
            { x, y: baseY + this.CHUNK_SIZE }
          ],
          width: this.STREET_WIDTH_SECONDARY,
          connections: []
        })
      }
    } else if (districtType === 'residential') {
      // Add winding residential streets
      const numStreets = 4 + Math.floor(random() * 4)
      for (let i = 0; i < numStreets; i++) {
        const startX = baseX + random() * this.CHUNK_SIZE
        const startY = baseY + random() * this.CHUNK_SIZE
        
        secondaryStreets.push({
          id: streetId(),
          type: 'alley',
          points: this.generateResidentialStreet(startX, startY, baseX, baseY, random),
          width: this.STREET_WIDTH_ALLEY,
          connections: []
        })
      }
    }
    
    return secondaryStreets
  }

  // Generate a residential street that curves naturally
  private static generateResidentialStreet(startX: number, startY: number, baseX: number, baseY: number, random: () => number): {x: number, y: number}[] {
    const points = [{ x: startX, y: startY }]
    let currentX = startX
    let currentY = startY
    let direction = random() * Math.PI * 2
    
    for (let i = 0; i < 6; i++) {
      // Slight direction change
      direction += (random() - 0.5) * Math.PI * 0.3
      const distance = 60 + random() * 40
      
      currentX += Math.cos(direction) * distance
      currentY += Math.sin(direction) * distance
      
      // Keep within chunk bounds
      currentX = Math.max(baseX + 30, Math.min(baseX + this.CHUNK_SIZE - 30, currentX))
      currentY = Math.max(baseY + 30, Math.min(baseY + this.CHUNK_SIZE - 30, currentY))
      
      points.push({ x: currentX, y: currentY })
    }
    
    return points
  }

  // Generate city blocks from street network
  private static generateCityBlocks(_streets: Street[], districtType: string, random: () => number): CityBlock[] {
    const blocks: CityBlock[] = []
    
    // For now, create simple rectangular blocks between streets
    // This is a simplified version - a full implementation would use polygon intersection
    
    if (districtType === 'corporate') {
      // Create regular blocks in corporate areas
      const blockSize = this.BLOCK_SIZE_MIN + random() * (this.BLOCK_SIZE_MAX - this.BLOCK_SIZE_MIN)
      const numBlocksX = Math.floor(this.CHUNK_SIZE / blockSize)
      const numBlocksY = Math.floor(this.CHUNK_SIZE / blockSize)
      
      for (let x = 0; x < numBlocksX - 1; x++) {
        for (let y = 0; y < numBlocksY - 1; y++) {
          const blockX = x * blockSize + (random() - 0.5) * 20
          const blockY = y * blockSize + (random() - 0.5) * 20
          const blockW = blockSize + (random() - 0.5) * 40
          const blockH = blockSize + (random() - 0.5) * 40
          
          blocks.push({
            id: this.generateId(),
            vertices: [
              { x: blockX, y: blockY },
              { x: blockX + blockW, y: blockY },
              { x: blockX + blockW, y: blockY + blockH },
              { x: blockX, y: blockY + blockH }
            ],
            lots: this.generateBuildingLots(blockX, blockY, blockW, blockH, districtType, random),
            blockType: districtType
          })
        }
      }
    } else {
      // Create more organic blocks for other districts
      const numBlocks = 8 + Math.floor(random() * 12)
      
      for (let i = 0; i < numBlocks; i++) {
        const centerX = random() * this.CHUNK_SIZE
        const centerY = random() * this.CHUNK_SIZE
        const blockVertices = this.generateOrganicBlock(centerX, centerY, districtType, random)
        
        if (blockVertices.length >= 3) {
          blocks.push({
            id: this.generateId(),
            vertices: blockVertices,
            lots: this.generateLotsFromBlock(blockVertices, districtType, random),
            blockType: districtType
          })
        }
      }
    }
    
    return blocks
  }

  // Generate building lots within a rectangular block
  private static generateBuildingLots(blockX: number, blockY: number, blockW: number, blockH: number, districtType: string, random: () => number): BuildingLot[] {
    const lots: BuildingLot[] = []
    
    if (districtType === 'corporate') {
      // Corporate blocks often have 1-2 large buildings
      if (random() < 0.4) {
        // Single large building taking most of the block
        lots.push({
          id: this.generateId(),
          vertices: [
            { x: blockX + 10, y: blockY + 10 },
            { x: blockX + blockW - 10, y: blockY + 10 },
            { x: blockX + blockW - 10, y: blockY + blockH - 10 },
            { x: blockX + 10, y: blockY + blockH - 10 }
          ],
          frontage: [
            { x: blockX + 10, y: blockY + blockH - 10 },
            { x: blockX + blockW - 10, y: blockY + blockH - 10 }
          ],
          depth: blockH - 20
        })
      } else {
        // Split into 2-3 lots
        const numLots = 2 + Math.floor(random() * 2)
        const lotWidth = blockW / numLots
        
        for (let i = 0; i < numLots; i++) {
          const lotX = blockX + i * lotWidth
          lots.push({
            id: this.generateId(),
            vertices: [
              { x: lotX + 5, y: blockY + 5 },
              { x: lotX + lotWidth - 5, y: blockY + 5 },
              { x: lotX + lotWidth - 5, y: blockY + blockH - 5 },
              { x: lotX + 5, y: blockY + blockH - 5 }
            ],
            frontage: [
              { x: lotX + 5, y: blockY + blockH - 5 },
              { x: lotX + lotWidth - 5, y: blockY + blockH - 5 }
            ],
            depth: blockH - 10
          })
        }
      }
    } else {
      // Residential and other districts have smaller, more varied lots
      const numLots = 3 + Math.floor(random() * 5)
      const lotWidth = blockW / numLots
      
      for (let i = 0; i < numLots; i++) {
        const lotX = blockX + i * lotWidth + (random() - 0.5) * 10
        const lotW = lotWidth + (random() - 0.5) * 20
        const lotDepth = 30 + random() * (blockH - 60)
        
        lots.push({
          id: this.generateId(),
          vertices: [
            { x: lotX, y: blockY },
            { x: lotX + lotW, y: blockY },
            { x: lotX + lotW, y: blockY + lotDepth },
            { x: lotX, y: blockY + lotDepth }
          ],
          frontage: [
            { x: lotX, y: blockY },
            { x: lotX + lotW, y: blockY }
          ],
          depth: lotDepth
        })
      }
    }
    
    return lots
  }

  // Generate organic block shapes for non-corporate districts
  private static generateOrganicBlock(centerX: number, centerY: number, _districtType: string, random: () => number): {x: number, y: number}[] {
    const vertices: {x: number, y: number}[] = []
    const numVertices = 4 + Math.floor(random() * 4)
    const baseRadius = 40 + random() * 60
    
    for (let i = 0; i < numVertices; i++) {
      const angle = (i / numVertices) * Math.PI * 2
      const radius = baseRadius + (random() - 0.5) * baseRadius * 0.3
      
      vertices.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      })
    }
    
    return vertices
  }

  // Generate lots from organic block shapes
  private static generateLotsFromBlock(blockVertices: {x: number, y: number}[], _districtType: string, random: () => number): BuildingLot[] {
    const lots: BuildingLot[] = []
    
    // Simplified: create one lot that fills most of the block
    const margin = 8 + random() * 12
    const shrunkVertices = blockVertices.map(v => ({
      x: v.x + (random() - 0.5) * margin,
      y: v.y + (random() - 0.5) * margin
    }))
    
    lots.push({
      id: this.generateId(),
      vertices: shrunkVertices,
      frontage: [shrunkVertices[0], shrunkVertices[1]], // Simplified frontage
      depth: 50 + random() * 30
    })
    
    return lots
  }

  // Convert streets to the old road format for compatibility
  private static convertStreetsToRoads(streets: Street[]): any[] {
    return streets.map(street => {
      if (street.points.length === 2) {
        // Simple straight road
        return {
          id: street.id,
          type: street.type,
          start: street.points[0],
          end: street.points[1],
          width: street.width
        }
      } else {
        // Multi-segment road - convert to multiple segments
        const segments = []
        for (let i = 0; i < street.points.length - 1; i++) {
          segments.push({
            id: street.id + '_' + i,
            type: street.type,
            start: street.points[i],
            end: street.points[i + 1],
            width: street.width
          })
        }
        return segments
      }
    }).flat()
  }

  // Place buildings in the generated lots
  private static placeBuildingsInBlocks(cityPlan: CityPlan, districtType: string, random: () => number): any[] {
    const buildings: any[] = []
    
    cityPlan.blocks.forEach(block => {
      block.lots.forEach(lot => {
        // Decide if this lot should have a building
        const shouldBuild = this.shouldPlaceBuilding(lot, districtType, random)
        
        if (shouldBuild) {
          const building = this.createBuildingForLot(lot, districtType, random)
          buildings.push(building)
          lot.building = building
        }
      })
    })
    
    return buildings
  }

  // Determine if a lot should have a building
  private static shouldPlaceBuilding(_lot: BuildingLot, districtType: string, random: () => number): boolean {
    const densityByDistrict = {
      corporate: 0.9,
      residential: 0.7,
      industrial: 0.8,
      underground: 0.6,
      wasteland: 0.3
    }
    
    const density = densityByDistrict[districtType as keyof typeof densityByDistrict] || 0.5
    return random() < density
  }

  // Create a building that fits the lot
  private static createBuildingForLot(lot: BuildingLot, districtType: string, random: () => number): any {
    const buildingTypes = this.getBuildingTypesForDistrict(districtType)
    const type = buildingTypes[Math.floor(random() * buildingTypes.length)]
    const info = Building.getBuildingTypeInfo(type)
    
    // Calculate building dimensions from lot
    const minX = Math.min(...lot.vertices.map(v => v.x))
    const maxX = Math.max(...lot.vertices.map(v => v.x))
    const minY = Math.min(...lot.vertices.map(v => v.y))
    const maxY = Math.max(...lot.vertices.map(v => v.y))
    
    const lotWidth = maxX - minX
    const lotHeight = maxY - minY
    
    // Building takes up most of the lot with some margins
    const margin = 5 + random() * 10
    const buildingWidth = Math.max(20, lotWidth - margin * 2)
    const buildingHeight = Math.max(20, lotHeight - margin * 2)
    
    // Vary building height based on district
    const baseHeight = this.getBuildingHeightForDistrict(districtType, type, random)
    
    return {
      id: this.generateId(),
      type,
      position: {
        x: minX + margin,
        y: minY + margin
      },
      size: {
        x: buildingWidth,
        y: buildingHeight
      },
      height: baseHeight, // Add 3D height for rendering
      district: districtType,
      hackable: info.hackable,
      securityLevel: info.securityLevel,
      lootTables: this.generateLootTables(random, info.lootChance),
      isLocked: random() < 0.3,
      owner: random() < 0.1 ? this.generateId() : null,
      faction: this.getFactionForDistrict(districtType)
    }
  }

  // Get building height based on district and type
  private static getBuildingHeightForDistrict(districtType: string, buildingType: string, random: () => number): number {
    const baseHeights = {
      corporate: {
        tower: 200 + random() * 300,
        office: 80 + random() * 120,
        headquarters: 150 + random() * 200,
        plaza: 40 + random() * 60
      },
      residential: {
        apartment: 60 + random() * 80,
        house: 20 + random() * 30,
        complex: 80 + random() * 100,
        condo: 100 + random() * 150
      },
      industrial: {
        warehouse: 30 + random() * 50,
        factory: 40 + random() * 80,
        depot: 25 + random() * 40,
        plant: 60 + random() * 100
      },
      underground: {
        hideout: 15 + random() * 25,
        club: 20 + random() * 40,
        market: 25 + random() * 35,
        den: 15 + random() * 20
      },
      wasteland: {
        ruin: 10 + random() * 30,
        shack: 8 + random() * 15,
        outpost: 20 + random() * 40,
        bunker: 15 + random() * 25
      }
    }
    
    const districtHeights = baseHeights[districtType as keyof typeof baseHeights]
    if (districtHeights) {
      return districtHeights[buildingType as keyof typeof districtHeights] || 30 + random() * 40
    }
    
    return 30 + random() * 40
  }

  // Generate infrastructure elements (streetlights, signs, etc.)
  private static generateInfrastructure(baseX: number, baseY: number, districtType: string, random: () => number): any[] {
    const infrastructure: any[] = []
    
    // Streetlights
    const numStreetlights = 15 + Math.floor(random() * 25)
    for (let i = 0; i < numStreetlights; i++) {
      infrastructure.push({
        id: this.generateId(),
        type: 'streetlight',
        position: {
          x: baseX + random() * this.CHUNK_SIZE,
          y: baseY + random() * this.CHUNK_SIZE
        },
        height: 15 + random() * 10,
        lightColor: this.getStreetlightColor(districtType, random)
      })
    }
    
    // Signs and billboards
    if (districtType === 'corporate' || districtType === 'residential') {
      const numSigns = 8 + Math.floor(random() * 12)
      for (let i = 0; i < numSigns; i++) {
        infrastructure.push({
          id: this.generateId(),
          type: random() < 0.7 ? 'sign' : 'billboard',
          position: {
            x: baseX + random() * this.CHUNK_SIZE,
            y: baseY + random() * this.CHUNK_SIZE
          },
          size: {
            x: 20 + random() * 40,
            y: 10 + random() * 30
          },
          text: this.generateSignText(districtType, random)
        })
      }
    }
    
    // Trash and debris
    const numTrash = 20 + Math.floor(random() * 30)
    for (let i = 0; i < numTrash; i++) {
      infrastructure.push({
        id: this.generateId(),
        type: 'debris',
        position: {
          x: baseX + random() * this.CHUNK_SIZE,
          y: baseY + random() * this.CHUNK_SIZE
        },
        size: 2 + random() * 6,
        debrisType: random() < 0.5 ? 'trash' : 'scrap'
      })
    }
    
    return infrastructure
  }

  // Get streetlight color based on district
  private static getStreetlightColor(districtType: string, random: () => number): string {
    const colors = {
      corporate: ['#00ffff', '#ffffff', '#0099ff'],
      residential: ['#ffff99', '#ffffff', '#ff9999'],
      industrial: ['#ff6600', '#ffff00', '#ffffff'],
      underground: ['#ff0080', '#8800ff', '#ff4444'],
      wasteland: ['#ff4444', '#ffff00', '#ff8800']
    }
    
    const districtColors = colors[districtType as keyof typeof colors] || colors.residential
    return districtColors[Math.floor(random() * districtColors.length)]
  }

  // Generate sign text
  private static generateSignText(districtType: string, random: () => number): string {
    const corporateTexts = ['NEXUS CORP', 'CYBER TECH', 'QUANTUM INC', 'DATA SYSTEMS', 'NEURAL NET']
    const residentialTexts = ['24/7 SHOP', 'NOODLE BAR', 'CLINIC', 'APARTMENTS', 'MARKET']
    
    const texts = districtType === 'corporate' ? corporateTexts : residentialTexts
    return texts[Math.floor(random() * texts.length)]
  }




  // Generate NPCs for a chunk
  private static generateNPCs(random: () => number, districtType: string): any[] {
    const npcs = []
    const numNPCs = Math.floor(random() * 3) + 1

    for (let i = 0; i < numNPCs; i++) {
      const npc = this.createNPC(random, districtType)
      npcs.push(npc)
    }

    return npcs
  }

  private static createNPC(random: () => number, districtType: string): any {
    const npcTypes = this.getNPCTypesForDistrict(districtType)
    const type = npcTypes[Math.floor(random() * npcTypes.length)]

    return {
      id: this.generateId(),
      type,
      position: {
        x: random() * this.CHUNK_SIZE,
        y: random() * this.CHUNK_SIZE
      },
      behavior: this.getNPCBehaviorForType(type),
      faction: this.getFactionForDistrict(districtType),
      health: 100,
      level: Math.floor(random() * 10) + 1,
      reputation: Math.floor(random() * 100)
    }
  }

  // Generate loot for a chunk
  private static generateLoot(random: () => number, districtType: string): any[] {
    const loot = []
    const numLoot = Math.floor(random() * 5) + 1

    for (let i = 0; i < numLoot; i++) {
      const item = this.createLootItem(random, districtType)
      loot.push(item)
    }

    return loot
  }

  private static createLootItem(random: () => number, districtType: string): any {
    const itemTypes = this.getItemTypesForDistrict(districtType)
    const type = itemTypes[Math.floor(random() * itemTypes.length)]
    const rarity = this.getRarityForDistrict(districtType, random)

    let item
    switch (type) {
      case 'weapon':
        item = Item.createWeapon(this.getWeaponName(rarity), rarity)
        break
      case 'augmentation':
        item = Item.createAugmentation(
          this.getAugmentationName(rarity),
          this.getAugmentationCategory(random),
          rarity
        )
        break
      case 'consumable':
        item = Item.createConsumable(
          this.getConsumableName(rarity),
          this.getConsumableEffects(rarity),
          rarity
        )
        break
      case 'material':
        item = Item.createMaterial(this.getMaterialName(rarity), rarity)
        break
      case 'data':
        item = Item.createData(this.getDataName(rarity), rarity)
        break
      default:
        item = Item.createConsumable('Unknown Item', {}, rarity)
    }

    return {
      ...item.toJSON(),
      position: {
        x: random() * this.CHUNK_SIZE,
        y: random() * this.CHUNK_SIZE
      }
    }
  }

  // District-specific generation
  private static getBuildingTypesForDistrict(districtType: string): string[] {
    const types = {
      corporate: ['office', 'tower', 'plaza', 'headquarters'],
      residential: ['apartment', 'house', 'complex', 'condo'],
      industrial: ['warehouse', 'factory', 'depot', 'plant'],
      underground: ['hideout', 'club', 'market', 'den'],
      wasteland: ['ruin', 'shack', 'outpost', 'bunker']
    }
    return types[districtType as keyof typeof types] || ['building']
  }

  private static getNPCTypesForDistrict(districtType: string): string[] {
    const types = {
      corporate: ['guard', 'executive', 'security', 'analyst'],
      residential: ['civilian', 'resident', 'worker', 'family'],
      industrial: ['worker', 'foreman', 'technician', 'engineer'],
      underground: ['fixer', 'dealer', 'thug', 'hacker'],
      wasteland: ['scavenger', 'raider', 'survivor', 'nomad']
    }
    return types[districtType as keyof typeof types] || ['npc']
  }

  private static getItemTypesForDistrict(districtType: string): string[] {
    const types = {
      corporate: ['data', 'augmentation', 'weapon', 'consumable'],
      residential: ['consumable', 'material', 'data'],
      industrial: ['material', 'weapon', 'augmentation'],
      underground: ['weapon', 'augmentation', 'data', 'consumable'],
      wasteland: ['material', 'weapon', 'consumable']
    }
    return types[districtType as keyof typeof types] || ['consumable']
  }

  private static getRarityForDistrict(districtType: string, random: () => number): Rarity {
    const rarityWeights = {
      corporate: [0.3, 0.3, 0.25, 0.12, 0.03],
      residential: [0.6, 0.25, 0.1, 0.04, 0.01],
      industrial: [0.5, 0.3, 0.15, 0.04, 0.01],
      underground: [0.2, 0.3, 0.3, 0.15, 0.05],
      wasteland: [0.1, 0.2, 0.3, 0.25, 0.15]
    }

    const weights = rarityWeights[districtType as keyof typeof rarityWeights] || [0.5, 0.3, 0.15, 0.04, 0.01]
    const rarities = [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY]
    
    const randomValue = random()
    let cumulative = 0
    
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i]
      if (randomValue <= cumulative) {
        return rarities[i]
      }
    }
    
    return Rarity.COMMON
  }

  private static getFactionForDistrict(districtType: string): string {
    const factions = {
      corporate: 'corporate',
      residential: 'civilian',
      industrial: 'workers',
      underground: 'criminals',
      wasteland: 'raiders'
    }
    return factions[districtType as keyof typeof factions] || 'neutral'
  }

  private static getNPCBehaviorForType(type: string): string {
    const behaviors = {
      guard: 'patrol',
      civilian: 'idle',
      fixer: 'patrol',
      dealer: 'idle',
      thug: 'aggressive',
      executive: 'patrol'
    }
    return behaviors[type as keyof typeof behaviors] || 'idle'
  }

  // Item generation helpers
  private static getWeaponName(rarity: Rarity): string {
    const names = {
      [Rarity.COMMON]: ['Pistol', 'Knife', 'Club'],
      [Rarity.UNCOMMON]: ['Rifle', 'SMG', 'Sword'],
      [Rarity.RARE]: ['Plasma Gun', 'Cyber Blade', 'Railgun'],
      [Rarity.EPIC]: ['Quantum Rifle', 'Neural Disruptor', 'Gravity Gun'],
      [Rarity.LEGENDARY]: ['Reality Breaker', 'Soul Reaper', 'Time Cannon']
    }
    const nameList = names[rarity] || names[Rarity.COMMON]
    return nameList[Math.floor(Math.random() * nameList.length)]
  }

  private static getAugmentationName(rarity: Rarity): string {
    const names = {
      [Rarity.COMMON]: ['Basic Implant', 'Simple Mod', 'Standard Aug'],
      [Rarity.UNCOMMON]: ['Enhanced Implant', 'Advanced Mod', 'Quality Aug'],
      [Rarity.RARE]: ['Elite Implant', 'Master Mod', 'Premium Aug'],
      [Rarity.EPIC]: ['Legendary Implant', 'Ultimate Mod', 'Divine Aug'],
      [Rarity.LEGENDARY]: ['Mythic Implant', 'Transcendent Mod', 'Godlike Aug']
    }
    const nameList = names[rarity] || names[Rarity.COMMON]
    return nameList[Math.floor(Math.random() * nameList.length)]
  }

  private static getAugmentationCategory(random: () => number): string {
    const categories = ['combat', 'stealth', 'hacking', 'utility']
    return categories[Math.floor(random() * categories.length)]
  }

  private static getConsumableName(rarity: Rarity): string {
    const names = {
      [Rarity.COMMON]: ['Energy Drink', 'Health Pack', 'Basic Stim'],
      [Rarity.UNCOMMON]: ['Power Boost', 'Med Kit', 'Advanced Stim'],
      [Rarity.RARE]: ['Super Stim', 'Combat Drug', 'Neural Enhancer'],
      [Rarity.EPIC]: ['Ultimate Boost', 'Combat Serum', 'Neural Amplifier'],
      [Rarity.LEGENDARY]: ['Godlike Serum', 'Transcendent Boost', 'Reality Enhancer']
    }
    const nameList = names[rarity] || names[Rarity.COMMON]
    return nameList[Math.floor(Math.random() * nameList.length)]
  }

  private static getConsumableEffects(rarity: Rarity): any {
    const effects = {
      [Rarity.COMMON]: { health: 25, credits: 50 },
      [Rarity.UNCOMMON]: { health: 50, credits: 100, experience: 25 },
      [Rarity.RARE]: { health: 100, credits: 250, experience: 50 },
      [Rarity.EPIC]: { health: 200, credits: 500, experience: 100 },
      [Rarity.LEGENDARY]: { health: 500, credits: 1000, experience: 250 }
    }
    return effects[rarity] || effects[Rarity.COMMON]
  }

  private static getMaterialName(rarity: Rarity): string {
    const names = {
      [Rarity.COMMON]: ['Scrap Metal', 'Basic Circuit', 'Simple Wire'],
      [Rarity.UNCOMMON]: ['Refined Metal', 'Advanced Circuit', 'Quality Wire'],
      [Rarity.RARE]: ['Pure Metal', 'Quantum Circuit', 'Neural Wire'],
      [Rarity.EPIC]: ['Exotic Metal', 'Reality Circuit', 'Soul Wire'],
      [Rarity.LEGENDARY]: ['Mythic Metal', 'Transcendent Circuit', 'Godlike Wire']
    }
    const nameList = names[rarity] || names[Rarity.COMMON]
    return nameList[Math.floor(Math.random() * nameList.length)]
  }

  private static getDataName(rarity: Rarity): string {
    const names = {
      [Rarity.COMMON]: ['Basic Data', 'Simple Info', 'Standard File'],
      [Rarity.UNCOMMON]: ['Advanced Data', 'Quality Info', 'Enhanced File'],
      [Rarity.RARE]: ['Elite Data', 'Master Info', 'Premium File'],
      [Rarity.EPIC]: ['Legendary Data', 'Ultimate Info', 'Divine File'],
      [Rarity.LEGENDARY]: ['Mythic Data', 'Transcendent Info', 'Godlike File']
    }
    const nameList = names[rarity] || names[Rarity.COMMON]
    return nameList[Math.floor(Math.random() * nameList.length)]
  }

  // Utility methods
  private static generateSeed(x: number, y: number): number {
    return (x * 1000 + y) % 2147483647
  }

  private static createSeededRandom(seed: number): () => number {
    let currentSeed = seed
    return () => {
      currentSeed = (currentSeed * 16807) % 2147483647
      return currentSeed / 2147483647
    }
  }

  private static generateChunkId(x: number, y: number): string {
    return `chunk_${x}_${y}`
  }

  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  private static generateLootTables(random: () => number, lootChance: number): any[] {
    const tables = []
    const numTables = Math.floor(random() * 3) + 1

    for (let i = 0; i < numTables; i++) {
      tables.push({
        id: this.generateId(),
        items: this.generateLootItems(random),
        dropChance: lootChance
      })
    }

    return tables
  }

  private static generateLootItems(random: () => number): any[] {
    const items = []
    const numItems = Math.floor(random() * 5) + 1

    for (let i = 0; i < numItems; i++) {
      items.push({
        itemId: this.generateId(),
        quantity: Math.floor(random() * 5) + 1,
        weight: random()
      })
    }

    return items
  }
}


