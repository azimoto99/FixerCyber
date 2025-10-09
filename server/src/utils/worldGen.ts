// World generation utilities
import { v4 as uuidv4 } from 'uuid';

export class WorldGenerator {
  private static readonly CHUNK_SIZE = 1000;
  private static readonly BUILDING_DENSITY = 0.3;
  private static readonly ROAD_DENSITY = 0.1;

  static generateChunkData(x: number, y: number, districtType: string) {
    const seed = this.generateSeed(x, y);
    const buildings = this.generateBuildings(seed, districtType);
    const roads = this.generateRoads(seed);
    const npcs = this.generateNPCs(seed, districtType);
    const loot = this.generateLoot(seed, districtType);

    return {
      buildings,
      roads,
      npcs,
      loot,
      generatedAt: new Date().toISOString(),
      seed,
    };
  }

  private static generateSeed(x: number, y: number): number {
    // Simple seed generation based on coordinates
    return (x * 1000 + y) % 2147483647;
  }

  private static generateBuildings(seed: number, districtType: string) {
    const buildings = [];
    const numBuildings = Math.floor(Math.random() * 5) + 2;

    for (let i = 0; i < numBuildings; i++) {
      buildings.push({
        id: uuidv4(),
        type: this.getBuildingType(districtType),
        position: {
          x: Math.random() * this.CHUNK_SIZE,
          y: Math.random() * this.CHUNK_SIZE,
        },
        size: {
          width: Math.random() * 100 + 50,
          height: Math.random() * 100 + 50,
        },
        hackable: Math.random() > 0.5,
        securityLevel: Math.floor(Math.random() * 5) + 1,
        lootTables: this.generateLootTables(districtType),
      });
    }

    return buildings;
  }

  private static generateRoads(seed: number) {
    const roads = [];

    // Main roads
    if (Math.random() > 0.3) {
      roads.push({
        id: uuidv4(),
        type: 'main',
        start: { x: 0, y: this.CHUNK_SIZE / 2 },
        end: { x: this.CHUNK_SIZE, y: this.CHUNK_SIZE / 2 },
        width: 80,
      });
    }

    if (Math.random() > 0.3) {
      roads.push({
        id: uuidv4(),
        type: 'main',
        start: { x: this.CHUNK_SIZE / 2, y: 0 },
        end: { x: this.CHUNK_SIZE / 2, y: this.CHUNK_SIZE },
        width: 80,
      });
    }

    // Secondary roads
    const numSecondaryRoads = Math.floor(Math.random() * 3);
    for (let i = 0; i < numSecondaryRoads; i++) {
      roads.push({
        id: uuidv4(),
        type: 'secondary',
        start: {
          x: Math.random() * this.CHUNK_SIZE,
          y: Math.random() * this.CHUNK_SIZE,
        },
        end: {
          x: Math.random() * this.CHUNK_SIZE,
          y: Math.random() * this.CHUNK_SIZE,
        },
        width: 40,
      });
    }

    return roads;
  }

  private static generateNPCs(seed: number, districtType: string) {
    const npcs = [];
    const numNPCs = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < numNPCs; i++) {
      npcs.push({
        id: uuidv4(),
        type: this.getNPCType(districtType),
        position: {
          x: Math.random() * this.CHUNK_SIZE,
          y: Math.random() * this.CHUNK_SIZE,
        },
        behavior: this.getNPCBehavior(districtType),
        faction: this.getFaction(districtType),
        health: 100,
        level: Math.floor(Math.random() * 10) + 1,
      });
    }

    return npcs;
  }

  private static generateLoot(seed: number, districtType: string) {
    const loot = [];
    const numLoot = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < numLoot; i++) {
      loot.push({
        id: uuidv4(),
        type: this.getLootType(districtType),
        position: {
          x: Math.random() * this.CHUNK_SIZE,
          y: Math.random() * this.CHUNK_SIZE,
        },
        rarity: this.getLootRarity(districtType),
        value: Math.floor(Math.random() * 1000) + 100,
      });
    }

    return loot;
  }

  private static generateLootTables(districtType: string) {
    const tables = [];
    const numTables = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < numTables; i++) {
      tables.push({
        id: uuidv4(),
        items: this.getLootItems(districtType),
        dropChance: Math.random() * 0.5 + 0.1,
      });
    }

    return tables;
  }

  private static getBuildingType(districtType: string): string {
    const buildingTypes = {
      corporate: ['office', 'tower', 'plaza', 'headquarters'],
      residential: ['apartment', 'house', 'complex', 'condo'],
      industrial: ['warehouse', 'factory', 'depot', 'plant'],
      underground: ['hideout', 'club', 'market', 'den'],
      wasteland: ['ruin', 'shack', 'outpost', 'bunker'],
    };

    const types = buildingTypes[districtType as keyof typeof buildingTypes] || [
      'building',
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  private static getNPCType(districtType: string): string {
    const npcTypes = {
      corporate: ['guard', 'executive', 'security', 'analyst'],
      residential: ['civilian', 'resident', 'worker', 'family'],
      industrial: ['worker', 'foreman', 'technician', 'engineer'],
      underground: ['fixer', 'dealer', 'thug', 'hacker'],
      wasteland: ['scavenger', 'raider', 'survivor', 'nomad'],
    };

    const types = npcTypes[districtType as keyof typeof npcTypes] || ['npc'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private static getNPCBehavior(districtType: string): string {
    const behaviors = {
      corporate: ['patrol', 'guard'],
      residential: ['idle', 'patrol'],
      industrial: ['work', 'patrol'],
      underground: ['patrol', 'aggressive'],
      wasteland: ['aggressive', 'fleeing'],
    };

    const behaviorList = behaviors[districtType as keyof typeof behaviors] || [
      'idle',
    ];
    return behaviorList[Math.floor(Math.random() * behaviorList.length)];
  }

  private static getFaction(districtType: string): string {
    const factions = {
      corporate: ['corporate', 'government', 'security'],
      residential: ['civilian', 'neutral', 'community'],
      industrial: ['corporate', 'union', 'workers'],
      underground: ['gang', 'syndicate', 'criminals'],
      wasteland: ['raider', 'scavenger', 'survivor'],
    };

    const factionList = factions[districtType as keyof typeof factions] || [
      'neutral',
    ];
    return factionList[Math.floor(Math.random() * factionList.length)];
  }

  private static getLootType(districtType: string): string {
    const lootTypes = {
      corporate: ['data', 'credits', 'tech'],
      residential: ['supplies', 'credits', 'personal'],
      industrial: ['materials', 'tech', 'tools'],
      underground: ['weapons', 'drugs', 'stolen'],
      wasteland: ['scrap', 'salvage', 'rare'],
    };

    const types = lootTypes[districtType as keyof typeof lootTypes] || ['item'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private static getLootRarity(districtType: string): string {
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const weights = {
      corporate: [0.4, 0.3, 0.2, 0.08, 0.02],
      residential: [0.6, 0.25, 0.1, 0.04, 0.01],
      industrial: [0.5, 0.3, 0.15, 0.04, 0.01],
      underground: [0.3, 0.3, 0.25, 0.12, 0.03],
      wasteland: [0.2, 0.3, 0.3, 0.15, 0.05],
    };

    const weightList = weights[districtType as keyof typeof weights] || [
      0.5, 0.3, 0.15, 0.04, 0.01,
    ];
    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < rarities.length; i++) {
      cumulative += weightList[i];
      if (random <= cumulative) {
        return rarities[i];
      }
    }

    return 'common';
  }

  private static getLootItems(districtType: string) {
    const items = {
      corporate: ['data_chip', 'access_card', 'credits', 'tech_blueprint'],
      residential: ['supplies', 'credits', 'personal_items'],
      industrial: ['materials', 'tools', 'tech_parts'],
      underground: ['weapons', 'drugs', 'stolen_goods'],
      wasteland: ['scrap', 'salvage', 'rare_materials'],
    };

    const itemList = items[districtType as keyof typeof items] || ['item'];
    return itemList.map(item => ({
      itemId: item,
      quantity: Math.floor(Math.random() * 5) + 1,
      weight: Math.random(),
    }));
  }
}
