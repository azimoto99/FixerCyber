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
  // private static readonly BLOCK_SIZE_MIN = 80
  // private static readonly BLOCK_SIZE_MAX = 200
  private static readonly STREET_WIDTH_MAIN = 40
  private static readonly STREET_WIDTH_SECONDARY = 25
  // private static readonly STREET_WIDTH_ALLEY = 15

  // Generate a realistic city chunk
  static generateChunk(x: number, y: number, districtType: string): any {
    const seed = this.generateSeed(x, y)
    const random = this.createSeededRandom(seed)

    // Generate city plan for this chunk
    const cityPlan = this.generateCityPlan(x, y, districtType, random)

    // Place content
    const buildings = this.placeBuildingsInBlocks(cityPlan, districtType, random)
    const roads = this.convertStreetsToRoads(cityPlan.streets)

    // Tile and collision maps
    const { tileMap, collisionMap, doors } = this.generateTileAndCollisionMaps(x, y, buildings, roads, districtType)

    const chunk = {
      id: this.generateChunkId(x, y),
      x,
      y,
      districtType,
      buildings,
      roads,
      tileMap,
      collisionMap,
      doors, // door metadata for interaction
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
    const streets = this.generateStreetNetwork(baseX, baseY)
    
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

  // Generate realistic street network with proper grid layout
  private static generateStreetNetwork(baseX: number, baseY: number): Street[] {
    const streets: Street[] = []
    const streetId = () => this.generateId()

    // Create a proper cyberpunk city grid system
    const mainStreetSpacing = 300 // Distance between major arterial streets
    const secondaryStreetSpacing = 150 // Distance between secondary streets
    // const alleySpacing = 75 // Distance between alleys
    
    // Generate main arterial streets (every 300 units)
    const numMainHorizontal = Math.floor(this.CHUNK_SIZE / mainStreetSpacing) + 1
    const numMainVertical = Math.floor(this.CHUNK_SIZE / mainStreetSpacing) + 1
    
    // Main horizontal streets
    for (let i = 0; i < numMainHorizontal; i++) {
      const y = baseY + i * mainStreetSpacing
      if (y >= baseY && y <= baseY + this.CHUNK_SIZE) {
        streets.push({
          id: streetId(),
          type: 'main',
          points: [
            { x: baseX, y: y },
            { x: baseX + this.CHUNK_SIZE, y: y }
          ],
          width: this.STREET_WIDTH_MAIN,
          connections: []
        })
      }
    }
    
    // Main vertical streets
    for (let i = 0; i < numMainVertical; i++) {
      const x = baseX + i * mainStreetSpacing
      if (x >= baseX && x <= baseX + this.CHUNK_SIZE) {
        streets.push({
          id: streetId(),
          type: 'main',
          points: [
            { x: x, y: baseY },
            { x: x, y: baseY + this.CHUNK_SIZE }
          ],
          width: this.STREET_WIDTH_MAIN,
          connections: []
        })
      }
    }
    
    // Generate secondary streets (every 150 units)
    const numSecondaryHorizontal = Math.floor(this.CHUNK_SIZE / secondaryStreetSpacing) + 1
    const numSecondaryVertical = Math.floor(this.CHUNK_SIZE / secondaryStreetSpacing) + 1
    
    // Secondary horizontal streets
    for (let i = 0; i < numSecondaryHorizontal; i++) {
      const y = baseY + i * secondaryStreetSpacing
      if (y >= baseY && y <= baseY + this.CHUNK_SIZE) {
        streets.push({
          id: streetId(),
          type: 'secondary',
          points: [
            { x: baseX, y: y },
            { x: baseX + this.CHUNK_SIZE, y: y }
          ],
          width: this.STREET_WIDTH_SECONDARY,
          connections: []
        })
      }
    }
    
    // Secondary vertical streets
    for (let i = 0; i < numSecondaryVertical; i++) {
      const x = baseX + i * secondaryStreetSpacing
      if (x >= baseX && x <= baseX + this.CHUNK_SIZE) {
        streets.push({
          id: streetId(),
          type: 'secondary',
          points: [
            { x: x, y: baseY },
            { x: x, y: baseY + this.CHUNK_SIZE }
          ],
          width: this.STREET_WIDTH_SECONDARY,
          connections: []
        })
      }
    }
    
    return streets
  }

  // Removed unused street generation methods - using simple grid layout

  // Generate city blocks from street network - buildings only along streets
  private static generateCityBlocks(streets: Street[], districtType: string, random: () => number): CityBlock[] {
    const blocks: CityBlock[] = []
    
    // Create building lots only along street edges with proper spacing
    const buildingDepth = 50 + random() * 30 // How deep buildings are from street
    const minBuildingWidth = 40
    const maxBuildingWidth = 100
    const buildingSpacing = 20 // Gap between buildings
    
    streets.forEach(street => {
      if (street.points.length < 2) return
      
      // Calculate street direction
      const dx = street.points[street.points.length - 1].x - street.points[0].x
      const dy = street.points[street.points.length - 1].y - street.points[0].y
      const streetLength = Math.sqrt(dx * dx + dy * dy)
      // const streetDirX = dx / streetLength
      // const streetDirY = dy / streetLength
      const perpX = -dy / streetLength
      const perpY = dx / streetLength
      
      // Calculate how many buildings can fit along this street
      const totalBuildingSpace = streetLength - buildingSpacing
      const numBuildings = Math.floor(totalBuildingSpace / (minBuildingWidth + buildingSpacing))
      
      for (let i = 0; i < numBuildings; i++) {
        // Calculate building position along street
        const t = (buildingSpacing + i * (minBuildingWidth + buildingSpacing)) / streetLength
        const streetX = street.points[0].x + dx * t
        const streetY = street.points[0].y + dy * t
        
        // Place building on alternating sides of street for variety
        const side = (i % 2 === 0) ? 1 : -1
        const buildingX = streetX + perpX * (street.width / 2 + buildingDepth / 2) * side
        const buildingY = streetY + perpY * (street.width / 2 + buildingDepth / 2) * side
        
        const buildingWidth = minBuildingWidth + random() * (maxBuildingWidth - minBuildingWidth)
        
        // Create building lot with proper orientation
        const lot: BuildingLot = {
          id: this.generateId(),
          vertices: [
            { x: buildingX - buildingWidth / 2, y: buildingY - buildingDepth / 2 },
            { x: buildingX + buildingWidth / 2, y: buildingY - buildingDepth / 2 },
            { x: buildingX + buildingWidth / 2, y: buildingY + buildingDepth / 2 },
            { x: buildingX - buildingWidth / 2, y: buildingY + buildingDepth / 2 }
          ],
          frontage: [
            { x: buildingX - buildingWidth / 2, y: buildingY - buildingDepth / 2 },
            { x: buildingX + buildingWidth / 2, y: buildingY - buildingDepth / 2 }
          ],
          depth: buildingDepth
        }
        
        // Create block for this building
        blocks.push({
          id: this.generateId(),
          vertices: lot.vertices,
          lots: [lot],
          blockType: districtType
        })
      }
    })
    
    return blocks
  }

  // Removed unused building lot generation methods - using street-based placement

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
      corporate: 0.4, // Reduced from 0.9
      residential: 0.3, // Reduced from 0.7
      industrial: 0.4, // Reduced from 0.8
      underground: 0.3, // Reduced from 0.6
      wasteland: 0.2 // Reduced from 0.3
    }
    
    const density = densityByDistrict[districtType as keyof typeof densityByDistrict] || 0.3
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
    
    // Streetlights - REDUCED DENSITY
    const numStreetlights = 5 + Math.floor(random() * 8) // Reduced from 15-40 to 5-13
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
    
    // Signs and billboards - REDUCED DENSITY
    if (districtType === 'corporate' || districtType === 'residential') {
      const numSigns = 3 + Math.floor(random() * 5) // Reduced from 8-20 to 3-8
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
    
    // Trash and debris - REDUCED DENSITY
    const numTrash = 5 + Math.floor(random() * 10) // Reduced from 20-50 to 5-15
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




  // Generate tile and collision maps for a chunk (20x20 tiles, 50px per tile)
  private static generateTileAndCollisionMaps(
    chunkX: number,
    chunkY: number,
    buildings: any[],
    roads: any[],
    districtType: string
  ): { tileMap: string[][], collisionMap: boolean[][], doors: any[] } {
    const tilesPerChunk = 20
    const tileMap: string[][] = Array.from({ length: tilesPerChunk }, () => Array(tilesPerChunk).fill('concrete'))
    const collisionMap: boolean[][] = Array.from({ length: tilesPerChunk }, () => Array(tilesPerChunk).fill(false))
    const doors: any[] = [] // Store door metadata

    const baseX = chunkX * this.CHUNK_SIZE
    const baseY = chunkY * this.CHUNK_SIZE
    const tileSize = this.CHUNK_SIZE / tilesPerChunk // 50

    // Helper: point inside rect (for buildings defined as position/size)
    const pointInRect = (px: number, py: number, bx: number, by: number, bw: number, bh: number) => {
      return px >= bx && px <= bx + bw && py >= by && py <= by + bh
    }

    // Helper: distance from point to segment
    const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
      const A = px - x1
      const B = py - y1
      const C = x2 - x1
      const D = y2 - y1
      const dot = A * C + B * D
      const lenSq = C * C + D * D
      let t = lenSq ? dot / lenSq : 0
      t = Math.max(0, Math.min(1, t))
      const projX = x1 + t * C
      const projY = y1 + t * D
      const dx = px - projX
      const dy = py - projY
      return Math.sqrt(dx * dx + dy * dy)
    }

    // Precompute: buildings in local chunk coords (0..CHUNK_SIZE)
    const localBuildings = buildings.map(b => ({
      x: (b.position?.x ?? b.x ?? 0),
      y: (b.position?.y ?? b.y ?? 0),
      w: (b.size?.x ?? b.width ?? 40),
      h: (b.size?.y ?? b.height ?? 40)
    }))

    // For each tile, decide type and collision
    for (let ty = 0; ty < tilesPerChunk; ty++) {
      for (let tx = 0; tx < tilesPerChunk; tx++) {
        const centerX = baseX + (tx + 0.5) * tileSize
        const centerY = baseY + (ty + 0.5) * tileSize

        // Streets/sidewalks based on roads
        let minRoadDist = Infinity
        let roadHalfWidth = 0
        for (const r of roads) {
          const d = distToSegment(centerX, centerY, r.start.x, r.start.y, r.end.x, r.end.y)
          if (d < minRoadDist) {
            minRoadDist = d
            roadHalfWidth = (r.width ?? 20) / 2
          }
        }

        // Default ground by district
        let baseType = 'concrete'
        if (districtType === 'residential' && Math.random() < 0.08) baseType = 'grass'
        if (districtType === 'industrial' && Math.random() < 0.06) baseType = 'dirt'

        let tileType = baseType
        
        if (minRoadDist <= roadHalfWidth) {
          tileType = 'street'
        } else if (minRoadDist <= roadHalfWidth + 12) {
          tileType = 'sidewalk'
        }

        // Buildings block tiles
        const localX = (tx + 0.5) * tileSize
        const localY = (ty + 0.5) * tileSize
        for (const b of localBuildings) {
          if (pointInRect(localX, localY, b.x, b.y, b.w, b.h)) {
            tileType = 'building'
            collisionMap[ty][tx] = true
            break
          }
        }

        tileMap[ty][tx] = tileType
      }
    }

    // Mark building entrances with door tiles
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i]
      const bx = (b.position?.x ?? b.x ?? 0)
      const by = (b.position?.y ?? b.y ?? 0)
      const bw = (b.size?.x ?? b.width ?? 40)
      const bh = (b.size?.y ?? b.height ?? 40)

      // Find suitable door location (front face, typically bottom edge for isometric)
      // Use midpoint of bottom edge
      const doorWorldX = bx + bw / 2
      const doorWorldY = by + bh // bottom edge

      const doorLocalX = doorWorldX - baseX
      const doorLocalY = doorWorldY - baseY
      const doorTileX = Math.max(0, Math.min(19, Math.floor(doorLocalX / tileSize)))
      const doorTileY = Math.max(0, Math.min(19, Math.floor(doorLocalY / tileSize)))

      // Mark tile as door and make walkable
      tileMap[doorTileY][doorTileX] = 'door'
      collisionMap[doorTileY][doorTileX] = false

      // Store door metadata
      doors.push({
        tileX: doorTileX,
        tileY: doorTileY,
        worldX: doorWorldX,
        worldY: doorWorldY,
        buildingId: b.id,
        buildingType: b.type,
        interactive: b.interactive !== false
      })
    }

    return { tileMap, collisionMap, doors }
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

  // Removed unused row/column random methods

  // Removed unused hashCoords method

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


