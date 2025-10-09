// Fast-paced loot system for cyberpunk looter shooter
import { Vector2 } from '../../types/game';

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type WeaponType = 'pistol' | 'rifle' | 'smg' | 'shotgun' | 'cyber' | 'melee';
type ArmorType = 'helmet' | 'vest' | 'boots' | 'gloves' | 'cyberware';
type ItemType =
  | 'stimpack'
  | 'ammo'
  | 'credits'
  | 'augment_chip'
  | 'hack_tool'
  | 'crafting_mat';

interface LootItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'item';
  rarity: Rarity;
  value: number;
  stackable: boolean;
  maxStack: number;
  description: string;
  iconColor: string; // For UI representation
}

interface WeaponLoot extends LootItem {
  type: 'weapon';
  weaponType: WeaponType;
  damage: number;
  accuracy: number;
  fireRate: number;
  range: number;
  durability: number;
  ammoType: string;
  specialEffect?: string;
}

interface ArmorLoot extends LootItem {
  type: 'armor';
  armorType: ArmorType;
  protection: number;
  durability: number;
  resistances: {
    kinetic: number;
    energy: number;
    cyber: number;
  };
  specialEffect?: string;
}

interface ItemLoot extends LootItem {
  type: 'item';
  itemType: ItemType;
  effect?: string;
  usable: boolean;
  consumable: boolean;
}

interface LootDrop {
  id: string;
  item: LootItem;
  position: Vector2;
  spawnedAt: number;
  despawnTime: number; // When it disappears
  glowIntensity: number; // Visual effect
  floatOffset: number; // Bobbing animation
}

// Simple event emitter implementation
class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }
}

export class LootSystem extends EventEmitter {
  private activeLoot: Map<string, LootDrop> = new Map();
  private lootIdCounter = 0;

  // Loot spawn chances based on source
  private readonly LOOT_TABLES = {
    enemy_kill: { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 },
    building_search: {
      common: 70,
      uncommon: 20,
      rare: 7,
      epic: 2.5,
      legendary: 0.5,
    },
    contract_reward: {
      common: 30,
      uncommon: 40,
      rare: 20,
      epic: 8,
      legendary: 2,
    },
    boss_kill: { common: 20, uncommon: 30, rare: 25, epic: 20, legendary: 5 },
    rare_chest: { common: 10, uncommon: 20, rare: 35, epic: 25, legendary: 10 },
  };

  // Rarity multipliers for stats
  private readonly RARITY_MULTIPLIERS = {
    common: 1.0,
    uncommon: 1.2,
    rare: 1.5,
    epic: 1.8,
    legendary: 2.5,
  };

  // Base weapon templates
  private readonly WEAPON_TEMPLATES = {
    pistol: {
      name: 'Cyberpistol',
      damage: 35,
      accuracy: 85,
      fireRate: 400,
      range: 300,
      durability: 100,
      ammoType: 'light',
      value: 200,
    },
    rifle: {
      name: 'Assault Rifle',
      damage: 55,
      accuracy: 75,
      fireRate: 600,
      range: 500,
      durability: 120,
      ammoType: 'medium',
      value: 800,
    },
    smg: {
      name: 'Submachine Gun',
      damage: 25,
      accuracy: 60,
      fireRate: 150,
      range: 200,
      durability: 80,
      ammoType: 'light',
      value: 400,
    },
    shotgun: {
      name: 'Combat Shotgun',
      damage: 95,
      accuracy: 40,
      fireRate: 1000,
      range: 100,
      durability: 110,
      ammoType: 'shells',
      value: 600,
    },
    cyber: {
      name: 'Cyber Weapon',
      damage: 75,
      accuracy: 95,
      fireRate: 800,
      range: 400,
      durability: 150,
      ammoType: 'energy',
      value: 1500,
    },
    melee: {
      name: 'Cyber Blade',
      damage: 120,
      accuracy: 100,
      fireRate: 500,
      range: 50,
      durability: 200,
      ammoType: 'none',
      value: 300,
    },
  };

  // Base armor templates
  private readonly ARMOR_TEMPLATES = {
    helmet: {
      name: 'Tactical Helmet',
      protection: 25,
      durability: 100,
      resistances: { kinetic: 20, energy: 15, cyber: 10 },
      value: 300,
    },
    vest: {
      name: 'Body Armor',
      protection: 45,
      durability: 150,
      resistances: { kinetic: 35, energy: 25, cyber: 15 },
      value: 600,
    },
    boots: {
      name: 'Combat Boots',
      protection: 15,
      durability: 120,
      resistances: { kinetic: 15, energy: 10, cyber: 5 },
      value: 200,
    },
    gloves: {
      name: 'Tactical Gloves',
      protection: 10,
      durability: 80,
      resistances: { kinetic: 10, energy: 8, cyber: 12 },
      value: 150,
    },
    cyberware: {
      name: 'Cyber Implant',
      protection: 20,
      durability: 200,
      resistances: { kinetic: 5, energy: 35, cyber: 45 },
      value: 1200,
    },
  };

  // Item templates
  private readonly ITEM_TEMPLATES = {
    stimpack: {
      name: 'Stimpack',
      effect: 'heal_50',
      stackable: true,
      maxStack: 5,
      value: 100,
      usable: true,
      consumable: true,
    },
    ammo: {
      name: 'Ammo Pack',
      effect: 'restore_ammo',
      stackable: true,
      maxStack: 10,
      value: 50,
      usable: true,
      consumable: true,
    },
    credits: {
      name: 'Credit Chip',
      effect: 'credits_100',
      stackable: true,
      maxStack: 1,
      value: 100,
      usable: true,
      consumable: true,
    },
    augment_chip: {
      name: 'Augment Chip',
      effect: 'random_augment',
      stackable: false,
      maxStack: 1,
      value: 500,
      usable: true,
      consumable: true,
    },
    hack_tool: {
      name: 'Hacking Tool',
      effect: 'boost_hack_chance',
      stackable: true,
      maxStack: 3,
      value: 200,
      usable: true,
      consumable: true,
    },
    crafting_mat: {
      name: 'Tech Scrap',
      effect: 'crafting_material',
      stackable: true,
      maxStack: 20,
      value: 25,
      usable: false,
      consumable: false,
    },
  };

  // Despawn time in milliseconds
  private readonly LOOT_DESPAWN_TIME = 120000; // 2 minutes

  constructor() {
    super();
  }

  update(deltaTime: number) {
    this.updateLootDrops(deltaTime);
    this.checkDespawns();
  }

  // Generate loot drop from enemy kill
  generateEnemyLoot(position: Vector2): LootDrop[] {
    const lootCount = this.getRandomLootCount('enemy_kill');
    const drops: LootDrop[] = [];

    for (let i = 0; i < lootCount; i++) {
      const rarity = this.rollRarity('enemy_kill');
      const lootType = this.rollLootType();

      let item: LootItem;

      switch (lootType) {
        case 'weapon':
          item = this.generateWeapon(rarity);
          break;
        case 'armor':
          item = this.generateArmor(rarity);
          break;
        case 'item':
          item = this.generateItem(rarity);
          break;
      }

      const drop = this.createLootDrop(item, position, i * 30); // Spread drops slightly
      drops.push(drop);
    }

    return drops;
  }

  // Generate loot from building search
  generateBuildingLoot(position: Vector2): LootDrop[] {
    const lootCount = this.getRandomLootCount('building_search');
    const drops: LootDrop[] = [];

    for (let i = 0; i < lootCount; i++) {
      const rarity = this.rollRarity('building_search');

      // Buildings more likely to have items and credits
      let lootType: 'weapon' | 'armor' | 'item';
      const typeRoll = Math.random();
      if (typeRoll < 0.6) lootType = 'item';
      else if (typeRoll < 0.8) lootType = 'armor';
      else lootType = 'weapon';

      let item: LootItem;

      switch (lootType) {
        case 'weapon':
          item = this.generateWeapon(rarity);
          break;
        case 'armor':
          item = this.generateArmor(rarity);
          break;
        case 'item':
          item = this.generateItem(rarity);
          break;
      }

      const drop = this.createLootDrop(item, position, i * 25);
      drops.push(drop);
    }

    return drops;
  }

  // Generate guaranteed contract reward
  generateContractReward(
    position: Vector2,
    contractDifficulty: number
  ): LootDrop[] {
    const baseCount = Math.max(1, contractDifficulty);
    const bonusCount = Math.random() < 0.3 ? 1 : 0; // 30% chance for bonus item
    const lootCount = baseCount + bonusCount;

    const drops: LootDrop[] = [];

    for (let i = 0; i < lootCount; i++) {
      const rarity = this.rollRarity('contract_reward');
      const lootType = this.rollLootType();

      let item: LootItem;

      switch (lootType) {
        case 'weapon':
          item = this.generateWeapon(rarity);
          break;
        case 'armor':
          item = this.generateArmor(rarity);
          break;
        case 'item':
          item = this.generateItem(rarity);
          break;
      }

      const drop = this.createLootDrop(item, position, i * 40);
      drops.push(drop);
    }

    // Always include credits for contracts
    const creditsItem = this.generateCreditsItem(contractDifficulty * 200);
    const creditsDrop = this.createLootDrop(
      creditsItem,
      position,
      lootCount * 40
    );
    drops.push(creditsDrop);

    return drops;
  }

  // Attempt to pick up loot
  pickupLoot(lootId: string, playerId: string): LootItem | null {
    const lootDrop = this.activeLoot.get(lootId);
    if (!lootDrop) return null;

    // Remove from world
    this.activeLoot.delete(lootId);

    console.log(
      `📦 ${playerId} picked up ${lootDrop.item.name} (${lootDrop.item.rarity})`
    );

    this.emit('lootPickup', {
      playerId,
      item: lootDrop.item,
      position: lootDrop.position,
    });

    return lootDrop.item;
  }

  // Get all active loot drops for rendering
  getActiveLoot(): LootDrop[] {
    return Array.from(this.activeLoot.values());
  }

  // Get loot drops near position
  getLootNearPosition(position: Vector2, radius: number = 100): LootDrop[] {
    return Array.from(this.activeLoot.values()).filter(drop => {
      const distance = Math.sqrt(
        Math.pow(drop.position.x - position.x, 2) +
          Math.pow(drop.position.y - position.y, 2)
      );
      return distance <= radius;
    });
  }

  // Roll for rarity based on loot table
  private rollRarity(source: keyof typeof this.LOOT_TABLES): Rarity {
    const table = this.LOOT_TABLES[source];
    const roll = Math.random() * 100;

    if (roll < table.legendary) return 'legendary';
    if (roll < table.legendary + table.epic) return 'epic';
    if (roll < table.legendary + table.epic + table.rare) return 'rare';
    if (roll < table.legendary + table.epic + table.rare + table.uncommon)
      return 'uncommon';
    return 'common';
  }

  // Roll for loot type
  private rollLootType(): 'weapon' | 'armor' | 'item' {
    const roll = Math.random();
    if (roll < 0.4) return 'weapon';
    if (roll < 0.7) return 'armor';
    return 'item';
  }

  // Get random number of loot items
  private getRandomLootCount(source: keyof typeof this.LOOT_TABLES): number {
    // Different sources have different loot amounts
    switch (source) {
      case 'enemy_kill':
        return Math.random() < 0.7 ? 1 : 2;
      case 'building_search':
        return Math.random() < 0.5 ? 1 : Math.random() < 0.8 ? 2 : 3;
      case 'contract_reward':
        return 2 + Math.floor(Math.random() * 2); // 2-3 items
      case 'boss_kill':
        return 3 + Math.floor(Math.random() * 3); // 3-5 items
      case 'rare_chest':
        return 4 + Math.floor(Math.random() * 3); // 4-6 items
      default:
        return 1;
    }
  }

  // Generate weapon with random stats based on rarity
  private generateWeapon(rarity: Rarity): WeaponLoot {
    const weaponTypes = Object.keys(this.WEAPON_TEMPLATES) as WeaponType[];
    const weaponType =
      weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
    const template = this.WEAPON_TEMPLATES[weaponType];
    const multiplier = this.RARITY_MULTIPLIERS[rarity];

    // Add some randomness to stats (±15%)
    const randomize = (value: number) => value * (0.85 + Math.random() * 0.3);

    const weapon: WeaponLoot = {
      id: this.generateId(),
      name: this.generateWeaponName(weaponType, rarity),
      type: 'weapon',
      weaponType,
      rarity,
      damage: Math.floor(randomize(template.damage) * multiplier),
      accuracy: Math.min(
        100,
        Math.floor(randomize(template.accuracy) * multiplier)
      ),
      fireRate: Math.floor(template.fireRate / multiplier), // Lower is better for fire rate
      range: Math.floor(randomize(template.range) * multiplier),
      durability: Math.floor(randomize(template.durability) * multiplier),
      ammoType: template.ammoType,
      value: Math.floor(
        template.value * multiplier * (0.8 + Math.random() * 0.4)
      ),
      stackable: false,
      maxStack: 1,
      description: this.generateWeaponDescription(weaponType),
      iconColor: this.getRarityColor(rarity),
      specialEffect:
        rarity === 'epic' || rarity === 'legendary'
          ? this.rollSpecialEffect(rarity)
          : undefined,
    };

    return weapon;
  }

  // Generate armor with random stats
  private generateArmor(rarity: Rarity): ArmorLoot {
    const armorTypes = Object.keys(this.ARMOR_TEMPLATES) as ArmorType[];
    const armorType = armorTypes[Math.floor(Math.random() * armorTypes.length)];
    const template = this.ARMOR_TEMPLATES[armorType];
    const multiplier = this.RARITY_MULTIPLIERS[rarity];

    const randomize = (value: number) => value * (0.85 + Math.random() * 0.3);

    const armor: ArmorLoot = {
      id: this.generateId(),
      name: this.generateArmorName(armorType, rarity),
      type: 'armor',
      armorType,
      rarity,
      protection: Math.floor(randomize(template.protection) * multiplier),
      durability: Math.floor(randomize(template.durability) * multiplier),
      resistances: {
        kinetic: Math.floor(
          randomize(template.resistances.kinetic) * multiplier
        ),
        energy: Math.floor(randomize(template.resistances.energy) * multiplier),
        cyber: Math.floor(randomize(template.resistances.cyber) * multiplier),
      },
      value: Math.floor(
        template.value * multiplier * (0.8 + Math.random() * 0.4)
      ),
      stackable: false,
      maxStack: 1,
      description: this.generateArmorDescription(armorType),
      iconColor: this.getRarityColor(rarity),
      specialEffect:
        rarity === 'epic' || rarity === 'legendary'
          ? this.rollSpecialEffect(rarity)
          : undefined,
    };

    return armor;
  }

  // Generate consumable items
  private generateItem(rarity: Rarity): ItemLoot {
    const itemTypes = Object.keys(this.ITEM_TEMPLATES) as ItemType[];
    let itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];

    // Higher rarity = better items more likely
    if (rarity === 'epic' || rarity === 'legendary') {
      itemType = ['augment_chip', 'hack_tool'][
        Math.floor(Math.random() * 2)
      ] as ItemType;
    }

    const template = this.ITEM_TEMPLATES[itemType];
    const multiplier = this.RARITY_MULTIPLIERS[rarity];

    const item: ItemLoot = {
      id: this.generateId(),
      name: this.generateItemName(itemType, rarity),
      type: 'item',
      itemType,
      rarity,
      value: Math.floor(template.value * multiplier),
      stackable: template.stackable,
      maxStack: template.maxStack,
      description: this.generateItemDescription(itemType),
      iconColor: this.getRarityColor(rarity),
      effect: template.effect,
      usable: template.usable,
      consumable: template.consumable,
    };

    return item;
  }

  // Generate credits item (special case)
  private generateCreditsItem(amount: number): ItemLoot {
    return {
      id: this.generateId(),
      name: `${amount} Credits`,
      type: 'item',
      itemType: 'credits',
      rarity: 'common',
      value: amount,
      stackable: true,
      maxStack: 1,
      description: `A credit chip containing ${amount} credits`,
      iconColor: '#FFD700',
      effect: `credits_${amount}`,
      usable: true,
      consumable: true,
    };
  }

  // Create loot drop in world
  private createLootDrop(
    item: LootItem,
    position: Vector2,
    angleOffset: number = 0
  ): LootDrop {
    // Spread loot in small circle
    const angle = Math.random() * Math.PI * 2 + (angleOffset * Math.PI) / 180;
    const distance = Math.random() * 40 + 20;

    const drop: LootDrop = {
      id: this.generateId(),
      item,
      position: {
        x: position.x + Math.cos(angle) * distance,
        y: position.y + Math.sin(angle) * distance,
      },
      spawnedAt: Date.now(),
      despawnTime: Date.now() + this.LOOT_DESPAWN_TIME,
      glowIntensity: this.getRarityGlow(item.rarity),
      floatOffset: Math.random() * Math.PI * 2, // For bobbing animation
    };

    this.activeLoot.set(drop.id, drop);

    console.log(
      `✨ ${item.rarity} ${item.name} dropped at (${Math.floor(position.x)}, ${Math.floor(position.y)})`
    );

    this.emit('lootDropped', {
      drop,
      item,
      position: drop.position,
    });

    return drop;
  }

  // Update loot drop animations
  private updateLootDrops(deltaTime: number) {
    this.activeLoot.forEach(drop => {
      // Update floating animation
      drop.floatOffset += deltaTime * 0.003;

      // Pulse glow for rare items
      if (drop.item.rarity !== 'common') {
        drop.glowIntensity =
          this.getRarityGlow(drop.item.rarity) *
          (0.7 + 0.3 * Math.sin(drop.floatOffset * 2));
      }
    });
  }

  // Remove expired loot
  private checkDespawns() {
    const now = Date.now();
    const toRemove: string[] = [];

    this.activeLoot.forEach((drop, id) => {
      if (now > drop.despawnTime) {
        toRemove.push(id);
      }
    });

    toRemove.forEach(id => {
      const drop = this.activeLoot.get(id);
      if (drop) {
        console.log(`🗑️ ${drop.item.name} despawned`);
        this.activeLoot.delete(id);
        this.emit('lootDespawned', { drop });
      }
    });
  }

  // Helper methods for generation
  private generateWeaponName(type: WeaponType, rarity: Rarity): string {
    const prefixes = {
      common: ['Standard', 'Basic', 'Simple'],
      uncommon: ['Enhanced', 'Improved', 'Advanced'],
      rare: ['Superior', 'Elite', 'Refined'],
      epic: ['Master', 'Legendary', 'Apex'],
      legendary: ['Mythic', 'Divine', 'Ultimate'],
    };

    const suffixes = {
      pistol: ['Pistol', 'Sidearm', 'Handgun'],
      rifle: ['Rifle', 'Carbine', 'Assault Rifle'],
      smg: ['SMG', 'PDW', 'Machine Pistol'],
      shotgun: ['Shotgun', 'Scattergun', 'Combat Shotgun'],
      cyber: ['Cyber Gun', 'Neural Blaster', 'Data Rifle'],
      melee: ['Blade', 'Cutter', 'Slicer'],
    };

    const prefix =
      prefixes[rarity][Math.floor(Math.random() * prefixes[rarity].length)];
    const suffix =
      suffixes[type][Math.floor(Math.random() * suffixes[type].length)];

    return `${prefix} ${suffix}`;
  }

  private generateArmorName(type: ArmorType, rarity: Rarity): string {
    const prefixes = {
      common: ['Basic', 'Standard', 'Simple'],
      uncommon: ['Reinforced', 'Enhanced', 'Improved'],
      rare: ['Combat', 'Tactical', 'Elite'],
      epic: ['Military', 'Spec-Ops', 'Advanced'],
      legendary: ['Prototype', 'Experimental', 'Legendary'],
    };

    const prefix =
      prefixes[rarity][Math.floor(Math.random() * prefixes[rarity].length)];
    const base = this.ARMOR_TEMPLATES[type].name;

    return `${prefix} ${base}`;
  }

  private generateItemName(type: ItemType, rarity: Rarity): string {
    const base = this.ITEM_TEMPLATES[type].name;

    if (rarity === 'common') return base;

    const prefixes = {
      uncommon: ['Enhanced', 'Improved'],
      rare: ['Superior', 'Advanced'],
      epic: ['Military-Grade', 'High-Tech'],
      legendary: ['Prototype', 'Experimental'],
    };

    const prefix = prefixes[rarity as keyof typeof prefixes]?.[0] || '';
    return prefix ? `${prefix} ${base}` : base;
  }

  private generateWeaponDescription(type: WeaponType): string {
    const descriptions = {
      pistol: 'Reliable sidearm for close combat',
      rifle: 'Versatile assault weapon with good range',
      smg: 'High rate of fire, close quarters weapon',
      shotgun: 'Devastating close-range damage dealer',
      cyber: 'Advanced cyber-enhanced weapon system',
      melee: 'Silent and deadly close combat weapon',
    };

    return descriptions[type];
  }

  private generateArmorDescription(type: ArmorType): string {
    const descriptions = {
      helmet: 'Protects head from damage',
      vest: 'Core body protection',
      boots: 'Leg and foot protection',
      gloves: 'Hand and arm protection',
      cyberware: 'Cybernetic enhancement protection',
    };

    return descriptions[type];
  }

  private generateItemDescription(type: ItemType): string {
    const descriptions = {
      stimpack: 'Instantly restores health',
      ammo: 'Restores ammunition for all weapons',
      credits: 'Digital currency chips',
      augment_chip: 'Cybernetic enhancement data',
      hack_tool: 'Improves hacking success rates',
      crafting_mat: 'Raw materials for crafting',
    };

    return descriptions[type];
  }

  private rollSpecialEffect(rarity: Rarity): string {
    const effects = {
      epic: ['Burst Fire', 'Armor Piercing', 'Quick Reload', 'Extended Range'],
      legendary: [
        'Chain Lightning',
        'Explosive Rounds',
        'Phase Shift',
        'Auto-Targeting',
        'Infinite Ammo',
      ],
    };

    const effectList = effects[rarity as keyof typeof effects] || [];
    return effectList[Math.floor(Math.random() * effectList.length)];
  }

  private getRarityColor(rarity: Rarity): string {
    const colors = {
      common: '#FFFFFF',
      uncommon: '#1EFF00',
      rare: '#0099FF',
      epic: '#9D00FF',
      legendary: '#FF6600',
    };

    return colors[rarity];
  }

  private getRarityGlow(rarity: Rarity): number {
    const glows = {
      common: 0,
      uncommon: 0.3,
      rare: 0.6,
      epic: 0.9,
      legendary: 1.2,
    };

    return glows[rarity];
  }

  private generateId(): string {
    return `loot_${++this.lootIdCounter}_${Date.now()}`;
  }

  // Cleanup
  clearAllLoot() {
    this.activeLoot.clear();
  }

  // Debug info
  getDebugInfo() {
    return {
      activeLootCount: this.activeLoot.size,
      lootByRarity: this.getLootCountByRarity(),
      oldestLoot: this.getOldestLoot(),
    };
  }

  private getLootCountByRarity() {
    const counts = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
    this.activeLoot.forEach(drop => {
      counts[drop.item.rarity]++;
    });
    return counts;
  }

  private getOldestLoot(): LootDrop | null {
    let oldest: LootDrop | null = null;
    this.activeLoot.forEach(drop => {
      if (!oldest || drop.spawnedAt < oldest.spawnedAt) {
        oldest = drop;
      }
    });
    return oldest;
  }
}
