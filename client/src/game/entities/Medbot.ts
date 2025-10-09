// Medbot entity for augmentation installation
import { Vector2 } from '../utils/Vector2';
import { Augmentation } from './Augmentation';
import { Player } from './Player';

export class Medbot {
  public id: string;
  public position: Vector2;
  public isActive: boolean;
  public services: string[];
  public costs: any;
  public reputation: number;
  public faction: string;

  constructor(id: string, position: Vector2, faction: string = 'neutral') {
    this.id = id;
    this.position = position;
    this.isActive = true;
    this.services = ['install', 'remove', 'repair', 'upgrade'];
    this.costs = this.calculateCosts();
    this.reputation = 0;
    this.faction = faction;
  }

  // Service availability
  canProvideService(service: string): boolean {
    return this.isActive && this.services.includes(service);
  }

  // Augmentation installation
  installAugmentation(player: Player, augmentation: Augmentation): boolean {
    if (!this.canProvideService('install')) return false;
    if (!augmentation.canInstall(player)) return false;

    const cost = this.calculateInstallationCost(augmentation);
    if (player.credits < cost) return false;

    // Deduct cost
    player.credits -= cost;

    // Install augmentation
    const success = augmentation.install(player);
    if (success) {
      this.reputation += 1;
    }

    return success;
  }

  // Augmentation removal
  removeAugmentation(player: Player, augmentation: Augmentation): boolean {
    if (!this.canProvideService('remove')) return false;
    if (!augmentation.isInstalled) return false;

    const cost = this.calculateRemovalCost(augmentation);
    if (player.credits < cost) return false;

    // Deduct cost
    player.credits -= cost;

    // Remove augmentation
    const success = augmentation.uninstall(player);
    if (success) {
      this.reputation += 1;
    }

    return success;
  }

  // Augmentation repair
  repairAugmentation(player: Player, augmentation: Augmentation): boolean {
    if (!this.canProvideService('repair')) return false;
    if (!augmentation.isInstalled) return false;

    const cost = this.calculateRepairCost(augmentation);
    if (player.credits < cost) return false;

    // Deduct cost
    player.credits -= cost;

    // Repair augmentation (restore to full durability)
    augmentation.durability = augmentation.maxDurability;
    this.reputation += 1;

    return true;
  }

  // Augmentation upgrade
  upgradeAugmentation(player: Player, augmentation: Augmentation): boolean {
    if (!this.canProvideService('upgrade')) return false;
    if (!augmentation.isInstalled) return false;

    const cost = this.calculateUpgradeCost(augmentation);
    if (player.credits < cost) return false;

    // Deduct cost
    player.credits -= cost;

    // Upgrade augmentation (increase effects)
    this.applyUpgrade(augmentation);
    this.reputation += 2;

    return true;
  }

  // Cost calculations
  private calculateCosts(): any {
    return {
      baseInstallation: 1000,
      baseRemoval: 500,
      baseRepair: 300,
      baseUpgrade: 2000,
      reputationDiscount: 0.1, // 10% discount per reputation point
      factionBonus: 0.2, // 20% discount for same faction
    };
  }

  private calculateInstallationCost(augmentation: Augmentation): number {
    let cost = this.costs.baseInstallation;

    // Apply augmentation rarity multiplier
    const rarityMultiplier = this.getRarityMultiplier(augmentation.rarity);
    cost *= rarityMultiplier;

    // Apply power cost multiplier
    const powerMultiplier = 1 + augmentation.powerCost / 100;
    cost *= powerMultiplier;

    // Apply reputation discount
    const reputationDiscount = this.reputation * this.costs.reputationDiscount;
    cost *= 1 - reputationDiscount;

    // Apply faction bonus
    if (this.faction === 'player_faction') {
      cost *= 1 - this.costs.factionBonus;
    }

    return Math.floor(cost);
  }

  private calculateRemovalCost(augmentation: Augmentation): number {
    let cost = this.costs.baseRemoval;

    // Apply augmentation rarity multiplier
    const rarityMultiplier = this.getRarityMultiplier(augmentation.rarity);
    cost *= rarityMultiplier;

    // Apply reputation discount
    const reputationDiscount = this.reputation * this.costs.reputationDiscount;
    cost *= 1 - reputationDiscount;

    // Apply faction bonus
    if (this.faction === 'player_faction') {
      cost *= 1 - this.costs.factionBonus;
    }

    return Math.floor(cost);
  }

  private calculateRepairCost(augmentation: Augmentation): number {
    let cost = this.costs.baseRepair;

    // Apply augmentation rarity multiplier
    const rarityMultiplier = this.getRarityMultiplier(augmentation.rarity);
    cost *= rarityMultiplier;

    // Apply damage multiplier
    const damageMultiplier =
      1 - augmentation.durability / augmentation.maxDurability;
    cost *= 1 + damageMultiplier;

    // Apply reputation discount
    const reputationDiscount = this.reputation * this.costs.reputationDiscount;
    cost *= 1 - reputationDiscount;

    // Apply faction bonus
    if (this.faction === 'player_faction') {
      cost *= 1 - this.costs.factionBonus;
    }

    return Math.floor(cost);
  }

  private calculateUpgradeCost(augmentation: Augmentation): number {
    let cost = this.costs.baseUpgrade;

    // Apply augmentation rarity multiplier
    const rarityMultiplier = this.getRarityMultiplier(augmentation.rarity);
    cost *= rarityMultiplier;

    // Apply power cost multiplier
    const powerMultiplier = 1 + augmentation.powerCost / 100;
    cost *= powerMultiplier;

    // Apply reputation discount
    const reputationDiscount = this.reputation * this.costs.reputationDiscount;
    cost *= 1 - reputationDiscount;

    // Apply faction bonus
    if (this.faction === 'player_faction') {
      cost *= 1 - this.costs.factionBonus;
    }

    return Math.floor(cost);
  }

  private getRarityMultiplier(rarity: string): number {
    const multipliers = {
      common: 1,
      uncommon: 1.5,
      rare: 2.5,
      epic: 5,
      legendary: 10,
    };
    return multipliers[rarity as keyof typeof multipliers] || 1;
  }

  // Upgrade application
  private applyUpgrade(augmentation: Augmentation): void {
    // Increase all effects by 20%
    for (const key in augmentation.effects) {
      if (typeof augmentation.effects[key] === 'number') {
        augmentation.effects[key] = Math.floor(augmentation.effects[key] * 1.2);
      }
    }

    // Increase power cost slightly
    augmentation.powerCost = Math.floor(augmentation.powerCost * 1.1);
  }

  // Service availability
  getAvailableServices(): string[] {
    return this.services.filter(service => this.canProvideService(service));
  }

  getServiceCost(service: string, augmentation?: Augmentation): number {
    if (!this.canProvideService(service)) return 0;

    switch (service) {
      case 'install':
        return augmentation ? this.calculateInstallationCost(augmentation) : 0;
      case 'remove':
        return augmentation ? this.calculateRemovalCost(augmentation) : 0;
      case 'repair':
        return augmentation ? this.calculateRepairCost(augmentation) : 0;
      case 'upgrade':
        return augmentation ? this.calculateUpgradeCost(augmentation) : 0;
      default:
        return 0;
    }
  }

  // Utility methods
  getCenter(): Vector2 {
    return new Vector2(
      this.position.x + 50, // Assuming 100x100 medbot
      this.position.y + 50
    );
  }

  getDistanceTo(position: Vector2): number {
    const center = this.getCenter();
    return center.distanceTo(position);
  }

  isNearby(position: Vector2, radius: number = 100): boolean {
    return this.getDistanceTo(position) <= radius;
  }

  // Faction management
  setFaction(faction: string): void {
    this.faction = faction;
  }

  getFaction(): string {
    return this.faction;
  }

  // Reputation management
  getReputation(): number {
    return this.reputation;
  }

  setReputation(reputation: number): void {
    this.reputation = Math.max(0, reputation);
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      position: this.position.toJSON(),
      isActive: this.isActive,
      services: this.services,
      costs: this.costs,
      reputation: this.reputation,
      faction: this.faction,
    };
  }

  static fromJSON(data: any): Medbot {
    const medbot = new Medbot(
      data.id,
      Vector2.fromJSON(data.position),
      data.faction
    );

    medbot.isActive = data.isActive;
    medbot.services = data.services;
    medbot.costs = data.costs;
    medbot.reputation = data.reputation;
    medbot.faction = data.faction;

    return medbot;
  }
}
