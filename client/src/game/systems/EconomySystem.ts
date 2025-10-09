// Credit economy and shop system for cyberpunk looter shooter
import { Vector2 } from '../../types/game';

// Import compatible types from other systems
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
  iconColor: string;
}

interface WeaponItem extends LootItem {
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

interface ArmorItem extends LootItem {
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

interface ShopItem {
  item: LootItem;
  basePrice: number;
  currentPrice: number;
  stock: number;
  maxStock: number;
  restockTime: number;
  lastRestocked: number;
  demand: number; // 0.5-2.0 multiplier for dynamic pricing
}

interface NPCVendor {
  id: string;
  name: string;
  type: 'weapons' | 'armor' | 'general' | 'augmentations' | 'black_market';
  position: Vector2;
  district: string;
  reputation: number; // 1-5 stars, affects prices and inventory
  specialty: string[]; // What they focus on
  inventory: Map<string, ShopItem>;
  buybackMultiplier: number; // How much they pay for items (0.2-0.8)
  sellPriceMultiplier: number; // Price modifier (0.8-1.5)
  creditLimit: number; // Max credits they have to buy items
  currentCredits: number;
  lastInventoryRefresh: number;
  isAvailable: boolean;
}

interface Transaction {
  type: 'buy' | 'sell';
  playerId: string;
  vendorId: string;
  itemId: string;
  quantity: number;
  pricePerItem: number;
  totalPrice: number;
  timestamp: number;
}

interface MarketData {
  itemId: string;
  averagePrice: number;
  recentTransactions: Transaction[];
  demand: number;
  supply: number;
  priceHistory: { price: number; timestamp: number }[];
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

export class EconomySystem extends EventEmitter {
  private vendors: Map<string, NPCVendor> = new Map();
  private marketData: Map<string, MarketData> = new Map();
  private transactionHistory: Transaction[] = [];
  private playerCredits: Map<string, number> = new Map();

  // Economy constants
  private readonly RESTOCK_INTERVAL = 300000; // 5 minutes
  private readonly DEMAND_DECAY_RATE = 0.95; // Demand slowly returns to 1.0

  // Rarity price multipliers
  private readonly RARITY_MULTIPLIERS = {
    common: 1.0,
    uncommon: 1.5,
    rare: 2.5,
    epic: 4.0,
    legendary: 8.0,
  };

  constructor() {
    super();
    this.initializeVendors();
    this.startEconomyUpdates();
  }

  // Initialize NPC vendors throughout the world
  private initializeVendors(): void {
    const vendors: NPCVendor[] = [
      {
        id: 'marcus_gunsmith',
        name: 'Marcus the Gunsmith',
        type: 'weapons',
        position: { x: 180, y: 160 },
        district: 'corporate',
        reputation: 4,
        specialty: ['pistol', 'rifle', 'smg'],
        inventory: new Map(),
        buybackMultiplier: 0.5,
        sellPriceMultiplier: 1.2,
        creditLimit: 10000,
        currentCredits: 8000,
        lastInventoryRefresh: Date.now(),
        isAvailable: true,
      },
      {
        id: 'zara_armortech',
        name: 'Zara ArmorTech',
        type: 'armor',
        position: { x: 650, y: 180 },
        district: 'residential',
        reputation: 3,
        specialty: ['helmet', 'vest', 'boots'],
        inventory: new Map(),
        buybackMultiplier: 0.4,
        sellPriceMultiplier: 1.1,
        creditLimit: 7500,
        currentCredits: 6000,
        lastInventoryRefresh: Date.now(),
        isAvailable: true,
      },
      {
        id: 'quinn_generalstore',
        name: "Quinn's General Store",
        type: 'general',
        position: { x: 720, y: 160 },
        district: 'residential',
        reputation: 2,
        specialty: ['stimpack', 'ammo', 'crafting_mat'],
        inventory: new Map(),
        buybackMultiplier: 0.3,
        sellPriceMultiplier: 1.0,
        creditLimit: 5000,
        currentCredits: 4000,
        lastInventoryRefresh: Date.now(),
        isAvailable: true,
      },
      {
        id: 'doc_cyberware',
        name: 'Doc Cyberware',
        type: 'augmentations',
        position: { x: 300, y: -130 },
        district: 'underground',
        reputation: 5,
        specialty: ['cyberware', 'augment_chip', 'hack_tool'],
        inventory: new Map(),
        buybackMultiplier: 0.7,
        sellPriceMultiplier: 1.5,
        creditLimit: 20000,
        currentCredits: 15000,
        lastInventoryRefresh: Date.now(),
        isAvailable: true,
      },
      {
        id: 'raven_blackmarket',
        name: 'Raven - Black Market',
        type: 'black_market',
        position: { x: 280, y: -150 },
        district: 'underground',
        reputation: 3,
        specialty: ['cyber', 'legendary_items'],
        inventory: new Map(),
        buybackMultiplier: 0.6,
        sellPriceMultiplier: 1.8,
        creditLimit: 25000,
        currentCredits: 20000,
        lastInventoryRefresh: Date.now(),
        isAvailable: true,
      },
    ];

    vendors.forEach(vendor => {
      this.vendors.set(vendor.id, vendor);
      this.generateInitialInventory(vendor);
    });

    console.log(`💰 Initialized ${vendors.length} vendors across the city`);
  }

  // Generate initial inventory for vendors
  private generateInitialInventory(vendor: NPCVendor): void {
    const itemCount = 8 + Math.floor(Math.random() * 5); // 8-12 items

    for (let i = 0; i < itemCount; i++) {
      const item = this.generateVendorItem(vendor);
      if (item) {
        const shopItem: ShopItem = {
          item,
          basePrice: this.calculateItemPrice(item, vendor),
          currentPrice: 0,
          stock: this.getRandomStock(item),
          maxStock: item.stackable ? 10 : 3,
          restockTime: this.RESTOCK_INTERVAL,
          lastRestocked: Date.now(),
          demand: 1.0,
        };

        shopItem.currentPrice = this.calculateDynamicPrice(shopItem, vendor);
        vendor.inventory.set(item.id, shopItem);
      }
    }
  }

  // Generate items suitable for specific vendor types
  private generateVendorItem(vendor: NPCVendor): LootItem | null {
    const rarityRoll = Math.random();
    let rarity: Rarity;

    // Higher reputation vendors have better items
    switch (vendor.reputation) {
      case 5:
        if (rarityRoll < 0.1) rarity = 'legendary';
        else if (rarityRoll < 0.3) rarity = 'epic';
        else if (rarityRoll < 0.6) rarity = 'rare';
        else if (rarityRoll < 0.8) rarity = 'uncommon';
        else rarity = 'common';
        break;
      case 4:
        if (rarityRoll < 0.05) rarity = 'legendary';
        else if (rarityRoll < 0.2) rarity = 'epic';
        else if (rarityRoll < 0.5) rarity = 'rare';
        else if (rarityRoll < 0.75) rarity = 'uncommon';
        else rarity = 'common';
        break;
      case 3:
        if (rarityRoll < 0.15) rarity = 'epic';
        else if (rarityRoll < 0.4) rarity = 'rare';
        else if (rarityRoll < 0.7) rarity = 'uncommon';
        else rarity = 'common';
        break;
      case 2:
        if (rarityRoll < 0.1) rarity = 'rare';
        else if (rarityRoll < 0.4) rarity = 'uncommon';
        else rarity = 'common';
        break;
      default:
        if (rarityRoll < 0.2) rarity = 'uncommon';
        else rarity = 'common';
    }

    // Generate item based on vendor specialty
    switch (vendor.type) {
      case 'weapons':
        return this.generateWeaponForShop(
          rarity,
          vendor.specialty as WeaponType[]
        );
      case 'armor':
        return this.generateArmorForShop(
          rarity,
          vendor.specialty as ArmorType[]
        );
      case 'augmentations':
        return this.generateAugmentationForShop(rarity);
      case 'general':
        return this.generateGeneralItemForShop(rarity);
      case 'black_market':
        return this.generateBlackMarketItem(rarity);
      default:
        return null;
    }
  }

  // Generate weapons for shops
  private generateWeaponForShop(
    rarity: Rarity,
    specialties: WeaponType[]
  ): WeaponItem {
    const weaponType =
      specialties[Math.floor(Math.random() * specialties.length)];
    const multiplier = this.RARITY_MULTIPLIERS[rarity];

    const baseStats = {
      pistol: {
        damage: 35,
        accuracy: 85,
        fireRate: 400,
        range: 300,
        durability: 100,
        value: 200,
      },
      rifle: {
        damage: 55,
        accuracy: 75,
        fireRate: 600,
        range: 500,
        durability: 120,
        value: 800,
      },
      smg: {
        damage: 25,
        accuracy: 60,
        fireRate: 150,
        range: 200,
        durability: 80,
        value: 400,
      },
      shotgun: {
        damage: 95,
        accuracy: 40,
        fireRate: 1000,
        range: 100,
        durability: 110,
        value: 600,
      },
      cyber: {
        damage: 75,
        accuracy: 95,
        fireRate: 800,
        range: 400,
        durability: 150,
        value: 1500,
      },
      melee: {
        damage: 120,
        accuracy: 100,
        fireRate: 500,
        range: 50,
        durability: 200,
        value: 300,
      },
    };

    const base = baseStats[weaponType];
    const randomize = (value: number) => value * (0.85 + Math.random() * 0.3);

    return {
      id: `shop_weapon_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: this.generateWeaponName(weaponType, rarity),
      type: 'weapon',
      weaponType,
      rarity,
      damage: Math.floor(randomize(base.damage) * multiplier),
      accuracy: Math.min(
        100,
        Math.floor(randomize(base.accuracy) * multiplier)
      ),
      fireRate: Math.floor(base.fireRate / multiplier),
      range: Math.floor(randomize(base.range) * multiplier),
      durability: Math.floor(randomize(base.durability) * multiplier),
      ammoType:
        weaponType === 'cyber'
          ? 'energy'
          : weaponType === 'shotgun'
            ? 'shells'
            : 'light',
      value: Math.floor(base.value * multiplier * (0.8 + Math.random() * 0.4)),
      stackable: false,
      maxStack: 1,
      description: `${rarity} quality ${weaponType}`,
      iconColor: this.getRarityColor(rarity),
      specialEffect:
        rarity === 'epic' || rarity === 'legendary'
          ? this.generateSpecialEffect()
          : undefined,
    };
  }

  // Generate armor for shops
  private generateArmorForShop(
    rarity: Rarity,
    specialties: ArmorType[]
  ): ArmorItem {
    const armorType =
      specialties[Math.floor(Math.random() * specialties.length)];
    const multiplier = this.RARITY_MULTIPLIERS[rarity];

    const baseStats = {
      helmet: {
        protection: 25,
        durability: 100,
        kinetic: 20,
        energy: 15,
        cyber: 10,
        value: 300,
      },
      vest: {
        protection: 45,
        durability: 150,
        kinetic: 35,
        energy: 25,
        cyber: 15,
        value: 600,
      },
      boots: {
        protection: 15,
        durability: 120,
        kinetic: 15,
        energy: 10,
        cyber: 5,
        value: 200,
      },
      gloves: {
        protection: 10,
        durability: 80,
        kinetic: 10,
        energy: 8,
        cyber: 12,
        value: 150,
      },
      cyberware: {
        protection: 20,
        durability: 200,
        kinetic: 5,
        energy: 35,
        cyber: 45,
        value: 1200,
      },
    };

    const base = baseStats[armorType];
    const randomize = (value: number) => value * (0.85 + Math.random() * 0.3);

    return {
      id: `shop_armor_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: this.generateArmorName(armorType, rarity),
      type: 'armor',
      armorType,
      rarity,
      protection: Math.floor(randomize(base.protection) * multiplier),
      durability: Math.floor(randomize(base.durability) * multiplier),
      resistances: {
        kinetic: Math.floor(randomize(base.kinetic) * multiplier),
        energy: Math.floor(randomize(base.energy) * multiplier),
        cyber: Math.floor(randomize(base.cyber) * multiplier),
      },
      value: Math.floor(base.value * multiplier * (0.8 + Math.random() * 0.4)),
      stackable: false,
      maxStack: 1,
      description: `${rarity} quality ${armorType}`,
      iconColor: this.getRarityColor(rarity),
      specialEffect:
        rarity === 'epic' || rarity === 'legendary'
          ? this.generateSpecialEffect()
          : undefined,
    };
  }

  // Generate augmentations and consumables
  private generateAugmentationForShop(rarity: Rarity): LootItem {
    const types = ['augment_chip', 'hack_tool', 'stimpack'] as const;
    const itemType = types[Math.floor(Math.random() * types.length)];
    const multiplier = this.RARITY_MULTIPLIERS[rarity];

    const baseValues: Record<typeof itemType, number> = {
      augment_chip: 500,
      hack_tool: 200,
      stimpack: 100,
    };

    return {
      id: `shop_item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} ${itemType.replace('_', ' ')}`,
      type: 'item',
      rarity,
      value: Math.floor(baseValues[itemType] * multiplier),
      stackable: itemType !== 'augment_chip',
      maxStack: itemType === 'augment_chip' ? 1 : 5,
      description: `High-quality ${itemType.replace('_', ' ')}`,
      iconColor: this.getRarityColor(rarity),
    };
  }

  private generateGeneralItemForShop(rarity: Rarity): LootItem {
    const types = ['stimpack', 'ammo', 'crafting_mat'];
    const itemType = types[
      Math.floor(Math.random() * types.length)
    ] as ItemType;
    const multiplier = this.RARITY_MULTIPLIERS[rarity];

    return {
      id: `shop_general_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: `${itemType.replace('_', ' ')}`,
      type: 'item',
      rarity,
      value: Math.floor(50 * multiplier),
      stackable: true,
      maxStack: 10,
      description: `Essential ${itemType.replace('_', ' ')}`,
      iconColor: this.getRarityColor(rarity),
    };
  }

  private generateBlackMarketItem(rarity: Rarity): LootItem {
    // Black market has rare and expensive items
    if (Math.random() < 0.6) {
      return this.generateWeaponForShop(rarity, ['cyber', 'rifle']);
    } else {
      return this.generateAugmentationForShop(rarity);
    }
  }

  // Player credit management
  setPlayerCredits(playerId: string, credits: number): void {
    this.playerCredits.set(playerId, Math.max(0, credits));
    this.emit('creditsUpdated', {
      playerId,
      credits: this.playerCredits.get(playerId),
    });
  }

  getPlayerCredits(playerId: string): number {
    return this.playerCredits.get(playerId) || 0;
  }

  addCredits(playerId: string, amount: number, reason: string): void {
    const current = this.getPlayerCredits(playerId);
    this.setPlayerCredits(playerId, current + amount);

    console.log(`💰 ${playerId} earned ${amount} credits for ${reason}`);
    this.emit('creditsEarned', {
      playerId,
      amount,
      reason,
      total: current + amount,
    });
  }

  // Buy item from vendor
  buyItem(
    playerId: string,
    vendorId: string,
    itemId: string,
    quantity: number = 1
  ): boolean {
    const vendor = this.vendors.get(vendorId);
    const shopItem = vendor?.inventory.get(itemId);
    const playerCredits = this.getPlayerCredits(playerId);

    if (!vendor || !shopItem) {
      console.log(`❌ Invalid vendor or item: ${vendorId}, ${itemId}`);
      return false;
    }

    if (!vendor.isAvailable) {
      console.log(`❌ Vendor ${vendor.name} is not available`);
      return false;
    }

    if (shopItem.stock < quantity) {
      console.log(`❌ Not enough stock: ${shopItem.stock}/${quantity}`);
      return false;
    }

    const totalPrice = shopItem.currentPrice * quantity;
    if (playerCredits < totalPrice) {
      console.log(`❌ Not enough credits: ${playerCredits}/${totalPrice}`);
      return false;
    }

    // Complete transaction
    this.setPlayerCredits(playerId, playerCredits - totalPrice);
    vendor.currentCredits += totalPrice;
    shopItem.stock -= quantity;

    // Update market dynamics
    this.increaseDemand(itemId, quantity);

    // Record transaction
    const transaction: Transaction = {
      type: 'buy',
      playerId,
      vendorId,
      itemId,
      quantity,
      pricePerItem: shopItem.currentPrice,
      totalPrice,
      timestamp: Date.now(),
    };

    this.transactionHistory.push(transaction);
    this.updateMarketData(transaction);

    console.log(
      `🛒 ${playerId} bought ${quantity}x ${shopItem.item.name} for ${totalPrice} credits`
    );

    this.emit('itemPurchased', {
      playerId,
      vendor: vendor.name,
      item: shopItem.item,
      quantity,
      totalPrice,
    });

    return true;
  }

  // Sell item to vendor
  sellItem(
    playerId: string,
    vendorId: string,
    item: LootItem,
    quantity: number = 1
  ): boolean {
    const vendor = this.vendors.get(vendorId);
    if (!vendor || !vendor.isAvailable) {
      console.log(`❌ Vendor not available: ${vendorId}`);
      return false;
    }

    const sellPrice = this.calculateSellPrice(item, vendor, quantity);

    if (vendor.currentCredits < sellPrice) {
      console.log(
        `❌ Vendor doesn't have enough credits: ${vendor.currentCredits}/${sellPrice}`
      );
      return false;
    }

    // Check if vendor wants this type of item
    if (!this.vendorAcceptsItem(vendor, item)) {
      console.log(`❌ ${vendor.name} doesn't buy ${item.type} items`);
      return false;
    }

    // Complete transaction
    const currentCredits = this.getPlayerCredits(playerId);
    this.setPlayerCredits(playerId, currentCredits + sellPrice);
    vendor.currentCredits -= sellPrice;

    // Vendor might add item to inventory (low chance)
    if (Math.random() < 0.3 && item.rarity !== 'common') {
      this.addItemToVendorInventory(vendor, item, quantity);
    }

    // Update market dynamics
    this.increaseSupply(item.id, quantity);

    // Record transaction
    const transaction: Transaction = {
      type: 'sell',
      playerId,
      vendorId,
      itemId: item.id,
      quantity,
      pricePerItem: sellPrice / quantity,
      totalPrice: sellPrice,
      timestamp: Date.now(),
    };

    this.transactionHistory.push(transaction);
    this.updateMarketData(transaction);

    console.log(
      `💸 ${playerId} sold ${quantity}x ${item.name} for ${sellPrice} credits`
    );

    this.emit('itemSold', {
      playerId,
      vendor: vendor.name,
      item,
      quantity,
      totalPrice: sellPrice,
    });

    return true;
  }

  // Calculate dynamic pricing
  private calculateItemPrice(item: LootItem, vendor: NPCVendor): number {
    let basePrice = item.value * this.RARITY_MULTIPLIERS[item.rarity];

    // Vendor markup
    basePrice *= vendor.sellPriceMultiplier;

    // District modifier
    const districtModifiers = {
      corporate: 1.3,
      residential: 1.0,
      underground: 0.8,
      industrial: 0.9,
      wasteland: 0.7,
    };

    basePrice *=
      districtModifiers[vendor.district as keyof typeof districtModifiers] ||
      1.0;

    return Math.floor(basePrice);
  }

  private calculateDynamicPrice(shopItem: ShopItem, vendor: NPCVendor): number {
    let price = shopItem.basePrice;

    // Demand adjustment
    price *= shopItem.demand;

    // Stock level adjustment (scarcity pricing)
    const stockRatio = shopItem.stock / shopItem.maxStock;
    if (stockRatio < 0.3) {
      price *= 1.5; // High demand, low stock
    } else if (stockRatio > 0.8) {
      price *= 0.9; // Overstocked
    }

    // Reputation bonus
    if (vendor.reputation >= 4) {
      price *= 1.1; // Premium vendors
    }

    return Math.floor(price);
  }

  private calculateSellPrice(
    item: LootItem,
    vendor: NPCVendor,
    quantity: number
  ): number {
    const baseValue = item.value * this.RARITY_MULTIPLIERS[item.rarity];
    let sellPrice = baseValue * vendor.buybackMultiplier * quantity;

    // Bulk sale discount
    if (quantity > 1) {
      sellPrice *= 0.9;
    }

    // Market demand affects sell price
    const marketData = this.marketData.get(item.id);
    if (marketData) {
      sellPrice *= 0.8 + marketData.demand * 0.4; // 0.8-1.2x modifier
    }

    return Math.floor(sellPrice);
  }

  // Market dynamics
  private increaseDemand(itemId: string, quantity: number): void {
    const marketData = this.getOrCreateMarketData(itemId);
    marketData.demand = Math.min(2.0, marketData.demand + quantity * 0.1);

    // Update all vendor prices for this item
    this.updateItemPricesAcrossVendors(itemId);
  }

  private increaseSupply(itemId: string, quantity: number): void {
    const marketData = this.getOrCreateMarketData(itemId);
    marketData.supply += quantity;
    marketData.demand = Math.max(0.5, marketData.demand - quantity * 0.05);

    this.updateItemPricesAcrossVendors(itemId);
  }

  private getOrCreateMarketData(itemId: string): MarketData {
    if (!this.marketData.has(itemId)) {
      this.marketData.set(itemId, {
        itemId,
        averagePrice: 100, // Default
        recentTransactions: [],
        demand: 1.0,
        supply: 10,
        priceHistory: [],
      });
    }
    return this.marketData.get(itemId)!;
  }

  private updateMarketData(transaction: Transaction): void {
    const marketData = this.getOrCreateMarketData(transaction.itemId);

    // Add to recent transactions
    marketData.recentTransactions.push(transaction);
    if (marketData.recentTransactions.length > 20) {
      marketData.recentTransactions.shift();
    }

    // Update average price
    const recentPrices = marketData.recentTransactions.map(t => t.pricePerItem);
    marketData.averagePrice =
      recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;

    // Add to price history
    marketData.priceHistory.push({
      price: transaction.pricePerItem,
      timestamp: transaction.timestamp,
    });

    if (marketData.priceHistory.length > 100) {
      marketData.priceHistory.shift();
    }
  }

  // Helper methods
  private vendorAcceptsItem(vendor: NPCVendor, item: LootItem): boolean {
    switch (vendor.type) {
      case 'weapons':
        return item.type === 'weapon';
      case 'armor':
        return item.type === 'armor';
      case 'augmentations':
        return item.type === 'item'; // Accepts augmentation items
      case 'general':
        return true; // Accepts everything
      case 'black_market':
        return item.rarity === 'epic' || item.rarity === 'legendary';
      default:
        return false;
    }
  }

  private addItemToVendorInventory(
    vendor: NPCVendor,
    item: LootItem,
    quantity: number
  ): void {
    const existingItem = vendor.inventory.get(item.id);

    if (existingItem) {
      existingItem.stock += quantity;
    } else {
      const shopItem: ShopItem = {
        item: { ...item },
        basePrice: this.calculateItemPrice(item, vendor),
        currentPrice: 0,
        stock: quantity,
        maxStock: item.stackable ? 10 : 3,
        restockTime: this.RESTOCK_INTERVAL,
        lastRestocked: Date.now(),
        demand: 1.0,
      };

      shopItem.currentPrice = this.calculateDynamicPrice(shopItem, vendor);
      vendor.inventory.set(item.id, shopItem);
    }
  }

  private updateItemPricesAcrossVendors(itemId: string): void {
    this.vendors.forEach(vendor => {
      const shopItem = vendor.inventory.get(itemId);
      if (shopItem) {
        shopItem.currentPrice = this.calculateDynamicPrice(shopItem, vendor);
      }
    });
  }

  // Economy updates (called periodically)
  private startEconomyUpdates(): void {
    setInterval(() => {
      this.updateEconomy();
    }, 60000); // Update every minute
  }

  private updateEconomy(): void {
    // Restock vendor inventories
    this.vendors.forEach(vendor => {
      this.restockVendor(vendor);
      this.decayDemand(vendor);
      this.regenerateVendorCredits(vendor);
    });

    // Update market demand decay
    this.marketData.forEach(market => {
      market.demand = Math.max(
        0.5,
        Math.min(2.0, market.demand * this.DEMAND_DECAY_RATE)
      );
    });
  }

  private restockVendor(vendor: NPCVendor): void {
    const now = Date.now();

    vendor.inventory.forEach(shopItem => {
      if (now - shopItem.lastRestocked > shopItem.restockTime) {
        const restockAmount = Math.floor(shopItem.maxStock * 0.3); // 30% restock
        shopItem.stock = Math.min(
          shopItem.maxStock,
          shopItem.stock + restockAmount
        );
        shopItem.lastRestocked = now;

        console.log(
          `📦 ${vendor.name} restocked ${restockAmount}x ${shopItem.item.name}`
        );
      }
    });
  }

  private decayDemand(vendor: NPCVendor): void {
    vendor.inventory.forEach(shopItem => {
      shopItem.demand = Math.max(
        0.5,
        Math.min(2.0, shopItem.demand * this.DEMAND_DECAY_RATE)
      );
      shopItem.currentPrice = this.calculateDynamicPrice(shopItem, vendor);
    });
  }

  private regenerateVendorCredits(vendor: NPCVendor): void {
    const regenRate = vendor.creditLimit * 0.05; // 5% per minute
    vendor.currentCredits = Math.min(
      vendor.creditLimit,
      vendor.currentCredits + regenRate
    );
  }

  // Utility methods
  private generateWeaponName(type: WeaponType, rarity: Rarity): string {
    const prefixes = {
      common: ['Standard', 'Basic'],
      uncommon: ['Enhanced', 'Improved'],
      rare: ['Superior', 'Elite'],
      epic: ['Master', 'Legendary'],
      legendary: ['Mythic', 'Ultimate'],
    };

    const prefix =
      prefixes[rarity][Math.floor(Math.random() * prefixes[rarity].length)];
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);

    return `${prefix} ${typeName}`;
  }

  private generateArmorName(type: ArmorType, rarity: Rarity): string {
    const prefixes = {
      common: ['Basic', 'Standard'],
      uncommon: ['Reinforced', 'Enhanced'],
      rare: ['Combat', 'Tactical'],
      epic: ['Military', 'Advanced'],
      legendary: ['Prototype', 'Legendary'],
    };

    const prefix =
      prefixes[rarity][Math.floor(Math.random() * prefixes[rarity].length)];
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);

    return `${prefix} ${typeName}`;
  }

  private generateSpecialEffect(): string {
    const effects = [
      'Burst Fire',
      'Armor Piercing',
      'Quick Reload',
      'Extended Range',
      'Auto-Targeting',
    ];
    return effects[Math.floor(Math.random() * effects.length)];
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

  private getRandomStock(item: LootItem): number {
    if (item.stackable) {
      return 3 + Math.floor(Math.random() * 8); // 3-10
    } else {
      return 1 + Math.floor(Math.random() * 3); // 1-3
    }
  }

  // Public getters
  getVendors(): NPCVendor[] {
    return Array.from(this.vendors.values());
  }

  getVendor(vendorId: string): NPCVendor | undefined {
    return this.vendors.get(vendorId);
  }

  getVendorInventory(vendorId: string): Map<string, ShopItem> | null {
    const vendor = this.vendors.get(vendorId);
    return vendor ? vendor.inventory : null;
  }

  getMarketData(itemId: string): MarketData | undefined {
    return this.marketData.get(itemId);
  }

  getTransactionHistory(limit: number = 50): Transaction[] {
    return this.transactionHistory.slice(-limit);
  }

  // Debug info
  getDebugInfo() {
    return {
      totalVendors: this.vendors.size,
      totalPlayers: this.playerCredits.size,
      totalTransactions: this.transactionHistory.length,
      marketItems: this.marketData.size,
    };
  }

  // Cleanup
  cleanup(): void {
    // Clear intervals if needed
  }
}
