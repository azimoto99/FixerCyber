// Contract system for managing AI fixer contracts
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
import { Contract, ContractType, ContractStatus } from '../../types/contracts';

export class ContractSystem extends EventEmitter {
  private activeContracts: Map<string, Contract> = new Map();
  private availableContracts: Contract[] = [];
  private contractHistory: Contract[] = [];
  private aiFixers: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeAIFixers();
  }

  update(deltaTime: number) {
    this.updateContractTimers(deltaTime);
    this.updateContractStatuses();
    this.generateNewContracts();
  }

  private updateContractTimers(deltaTime: number) {
    this.activeContracts.forEach((contract, id) => {
      if (contract.status === ContractStatus.ACTIVE) {
        contract.timeLimit -= deltaTime / 1000; // Convert to seconds

        if (contract.timeLimit <= 0) {
          this.expireContract(id);
        }
      }
    });
  }

  private updateContractStatuses() {
    // Update contract statuses based on game state
    this.activeContracts.forEach((contract, _id) => {
      if (contract.status === ContractStatus.ACTIVE) {
        this.checkContractCompletion(contract);
      }
    });
  }

  private generateNewContracts() {
    // Generate new contracts from AI fixers
    if (Math.random() < 0.01) {
      // 1% chance per update
      const fixer = this.getRandomAIFixer();
      const contract = this.createContract(fixer);
      this.availableContracts.push(contract);
      this.emit('newContractAvailable', contract);
    }
  }

  // Contract management
  acceptContract(contractId: string, playerId: string): boolean {
    const contract = this.availableContracts.find(c => c.id === contractId);
    if (!contract) return false;

    contract.playerId = playerId;
    contract.status = ContractStatus.ACTIVE;
    this.activeContracts.set(contractId, contract);

    // Remove from available contracts
    this.availableContracts = this.availableContracts.filter(
      c => c.id !== contractId
    );

    this.emit('contractAccepted', contract);
    return true;
  }

  completeContract(contractId: string, completionData: any): boolean {
    const contract = this.activeContracts.get(contractId);
    if (!contract) return false;

    contract.status = ContractStatus.COMPLETED;
    contract.completedAt = new Date();
    this.contractHistory.push(contract);
    this.activeContracts.delete(contractId);

    // Award rewards
    this.awardContractRewards(contract, completionData);

    this.emit('contractCompleted', { contract, completionData });
    return true;
  }

  cancelContract(contractId: string): boolean {
    const contract = this.activeContracts.get(contractId);
    if (!contract) return false;

    contract.status = ContractStatus.CANCELLED;
    contract.cancelledAt = new Date();
    this.contractHistory.push(contract);
    this.activeContracts.delete(contractId);

    this.emit('contractCancelled', contract);
    return true;
  }

  private expireContract(contractId: string) {
    const contract = this.activeContracts.get(contractId);
    if (!contract) return;

    contract.status = ContractStatus.EXPIRED;
    this.contractHistory.push(contract);
    this.activeContracts.delete(contractId);

    this.emit('contractExpired', contract);
  }

  private checkContractCompletion(contract: Contract) {
    // Check if contract objectives are met
    switch (contract.type) {
      case ContractType.ASSASSINATION:
        this.checkAssassinationCompletion(contract);
        break;
      case ContractType.DATA_EXTRACTION:
        this.checkDataExtractionCompletion(contract);
        break;
      case ContractType.SABOTAGE:
        this.checkSabotageCompletion(contract);
        break;
      default:
        break;
    }
  }

  private checkAssassinationCompletion(_contract: Contract) {
    // Check if target is eliminated
    // This would integrate with combat system
  }

  private checkDataExtractionCompletion(_contract: Contract) {
    // Check if data has been extracted
    // This would integrate with hacking system
  }

  private checkSabotageCompletion(_contract: Contract) {
    // Check if target has been sabotaged
    // This would integrate with world system
  }

  private awardContractRewards(contract: Contract, _completionData: any) {
    const rewards = {
      credits: contract.reward.credits,
      items: contract.reward.items || [],
      reputation: contract.reward.reputation || 0,
    };

    this.emit('rewardsAwarded', { contract, rewards });
  }

  // AI Fixer management
  private initializeAIFixers() {
    const fixers = [
      {
        id: 'raven',
        name: 'Raven',
        faction: 'Night Syndicate',
        reputation: 85,
        specialties: [ContractType.ASSASSINATION, ContractType.SABOTAGE],
      },
      {
        id: 'ghost',
        name: 'Ghost',
        faction: 'Data Pirates',
        reputation: 92,
        specialties: [ContractType.DATA_EXTRACTION, ContractType.SURVEILLANCE],
      },
      {
        id: 'steel',
        name: 'Steel',
        faction: 'Corporate Security',
        reputation: 78,
        specialties: [ContractType.ESCORT, ContractType.RECOVERY],
      },
      {
        id: 'neon',
        name: 'Neon',
        faction: 'Underground Network',
        reputation: 88,
        specialties: [ContractType.TERRITORY_CONTROL, ContractType.SABOTAGE],
      },
    ];

    fixers.forEach(fixer => {
      this.aiFixers.set(fixer.id, fixer);
    });
  }

  private getRandomAIFixer() {
    const fixers = Array.from(this.aiFixers.values());
    return fixers[Math.floor(Math.random() * fixers.length)];
  }

  private createContract(fixer: any): Contract {
    const types = Object.values(ContractType);
    const type = types[
      Math.floor(Math.random() * types.length)
    ] as ContractType;

    return {
      id: this.generateId(),
      type,
      fixerId: fixer.id,
      target: this.generateContractTarget(type),
      reward: this.generateContractReward(type),
      timeLimit: this.getContractTimeLimit(type),
      status: ContractStatus.AVAILABLE,
      description: this.generateContractDescription(type, fixer),
      createdAt: new Date(),
    };
  }

  private generateContractTarget(type: ContractType) {
    const targets = {
      [ContractType.ASSASSINATION]: {
        id: 'target_' + this.generateId(),
        type: 'player',
        position: {
          x: Math.random() * 2000 - 1000,
          y: Math.random() * 2000 - 1000,
        },
        data: {
          name: 'Target Player',
          level: Math.floor(Math.random() * 20) + 1,
        },
      },
      [ContractType.DATA_EXTRACTION]: {
        id: 'terminal_' + this.generateId(),
        type: 'terminal',
        position: {
          x: Math.random() * 2000 - 1000,
          y: Math.random() * 2000 - 1000,
        },
        data: {
          securityLevel: Math.floor(Math.random() * 5) + 1,
          dataType: 'corporate',
        },
      },
      [ContractType.SABOTAGE]: {
        id: 'facility_' + this.generateId(),
        type: 'facility',
        position: {
          x: Math.random() * 2000 - 1000,
          y: Math.random() * 2000 - 1000,
        },
        data: {
          facilityType: 'security',
          importance: Math.floor(Math.random() * 5) + 1,
        },
      },
      [ContractType.TERRITORY_CONTROL]: {
        id: 'territory_' + this.generateId(),
        type: 'territory',
        position: {
          x: Math.random() * 2000 - 1000,
          y: Math.random() * 2000 - 1000,
        },
        data: {
          district: 'downtown',
          controlLevel: Math.floor(Math.random() * 5) + 1,
        },
      },
      [ContractType.ESCORT]: {
        id: 'escort_' + this.generateId(),
        type: 'person',
        position: {
          x: Math.random() * 2000 - 1000,
          y: Math.random() * 2000 - 1000,
        },
        data: { name: 'VIP', importance: Math.floor(Math.random() * 5) + 1 },
      },
      [ContractType.RECOVERY]: {
        id: 'recovery_' + this.generateId(),
        type: 'item',
        position: {
          x: Math.random() * 2000 - 1000,
          y: Math.random() * 2000 - 1000,
        },
        data: {
          itemType: 'data',
          value: Math.floor(Math.random() * 1000) + 100,
        },
      },
      [ContractType.SURVEILLANCE]: {
        id: 'surveillance_' + this.generateId(),
        type: 'area',
        position: {
          x: Math.random() * 2000 - 1000,
          y: Math.random() * 2000 - 1000,
        },
        data: {
          area: 'downtown',
          duration: Math.floor(Math.random() * 24) + 1,
        },
      },
    };

    return (
      targets[type] || {
        id: 'unknown',
        type: 'unknown',
        position: { x: 0, y: 0 },
        data: {},
      }
    );
  }

  private generateContractReward(type: ContractType) {
    const baseRewards = {
      [ContractType.ASSASSINATION]: { credits: 5000, reputation: 50 },
      [ContractType.DATA_EXTRACTION]: { credits: 3000, reputation: 30 },
      [ContractType.SABOTAGE]: { credits: 4000, reputation: 40 },
      [ContractType.TERRITORY_CONTROL]: { credits: 6000, reputation: 60 },
      [ContractType.ESCORT]: { credits: 2500, reputation: 25 },
      [ContractType.RECOVERY]: { credits: 3500, reputation: 35 },
      [ContractType.SURVEILLANCE]: { credits: 2000, reputation: 20 },
    };

    const base = baseRewards[type] || { credits: 1000, reputation: 10 };
    const multiplier = 0.8 + Math.random() * 0.4; // 0.8 to 1.2

    return {
      credits: Math.floor(base.credits * multiplier),
      reputation: Math.floor(base.reputation * multiplier),
    };
  }

  private getContractTimeLimit(type: ContractType): number {
    const timeLimits = {
      [ContractType.ASSASSINATION]: 30 * 60, // 30 minutes
      [ContractType.DATA_EXTRACTION]: 45 * 60, // 45 minutes
      [ContractType.SABOTAGE]: 60 * 60, // 1 hour
      [ContractType.ESCORT]: 90 * 60, // 1.5 hours
      [ContractType.RECOVERY]: 75 * 60, // 1.25 hours
      [ContractType.SURVEILLANCE]: 120 * 60, // 2 hours
      [ContractType.TERRITORY_CONTROL]: 180 * 60, // 3 hours
    };

    return timeLimits[type] || 60 * 60; // Default 1 hour
  }

  private generateContractDescription(type: ContractType, fixer: any): string {
    const descriptions = {
      [ContractType.ASSASSINATION]: `Eliminate the target. High-value contract from ${fixer.name}.`,
      [ContractType.DATA_EXTRACTION]: `Extract sensitive data from the target system. ${fixer.name} needs this information.`,
      [ContractType.SABOTAGE]: `Disable the target facility. ${fixer.name} wants to send a message.`,
      [ContractType.ESCORT]: `Protect the VIP during transport. ${fixer.name} guarantees safe passage.`,
      [ContractType.RECOVERY]: `Retrieve the stolen item. ${fixer.name} needs it back.`,
      [ContractType.SURVEILLANCE]: `Monitor the target location. ${fixer.name} needs intelligence.`,
      [ContractType.TERRITORY_CONTROL]: `Secure the area for ${fixer.name}. Show your strength.`,
    };

    return descriptions[type] || `Complete the mission for ${fixer.name}.`;
  }

  // Getters
  getActiveContracts(): Contract[] {
    return Array.from(this.activeContracts.values());
  }

  getAvailableContracts(): Contract[] {
    return this.availableContracts;
  }

  getContractHistory(): Contract[] {
    return this.contractHistory;
  }

  getAIFixers(): any[] {
    return Array.from(this.aiFixers.values());
  }

  getContract(contractId: string): Contract | undefined {
    return (
      this.activeContracts.get(contractId) ||
      this.availableContracts.find(c => c.id === contractId)
    );
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
