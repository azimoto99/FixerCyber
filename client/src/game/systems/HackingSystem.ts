// Hacking system for cyberpunk hacking mechanics
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

export class HackingSystem extends EventEmitter {
  private activeHacks: Map<string, any> = new Map();
  private neuralPrograms: Map<string, any> = new Map();
  private hackTargets: Map<string, any> = new Map();
  private playerHeat: number = 0;
  private maxHeat: number = 100;
  private heatDecayRate: number = 1; // per second

  constructor() {
    super();
    this.initializeNeuralPrograms();
  }

  update(deltaTime: number) {
    this.updateActiveHacks(deltaTime);
    this.updatePlayerHeat(deltaTime);
    this.updateHackTargets(deltaTime);
  }

  private updateActiveHacks(deltaTime: number) {
    this.activeHacks.forEach((hack, id) => {
      hack.progress += (hack.speed * deltaTime) / 1000;
      hack.heat += (hack.heatGeneration * deltaTime) / 1000;

      if (hack.progress >= 100) {
        this.completeHack(id);
      } else if (hack.heat >= hack.maxHeat) {
        this.failHack(id, 'overheat');
      }
    });
  }

  private updatePlayerHeat(deltaTime: number) {
    if (this.playerHeat > 0) {
      this.playerHeat = Math.max(
        0,
        this.playerHeat - (this.heatDecayRate * deltaTime) / 1000
      );
    }
  }

  private updateHackTargets(deltaTime: number) {
    // Update hackable targets in the world
    this.hackTargets.forEach((target, _id) => {
      if (target.securityLevel > 0) {
        target.securityLevel = Math.max(
          0,
          target.securityLevel - (target.decayRate * deltaTime) / 1000
        );
      }
    });
  }

  // Hacking actions
  handleHacking(data: any) {
    const { target, action, program } = data;

    switch (action) {
      case 'start':
        this.startHack(target, program);
        break;
      case 'stop':
        this.stopHack(target);
        break;
      case 'use_program':
        this.useNeuralProgram(program);
        break;
      case 'install_program':
        this.installNeuralProgram(program);
        break;
    }
  }

  startHack(targetId: string, programId?: string) {
    const target = this.hackTargets.get(targetId);
    if (!target) return false;

    if (this.activeHacks.has(targetId)) {
      this.emit('hackError', {
        targetId,
        error: 'Already hacking this target',
      });
      return false;
    }

    const hack = {
      id: targetId,
      target,
      program: programId ? this.neuralPrograms.get(programId) : null,
      progress: 0,
      speed: this.calculateHackSpeed(target, programId),
      heat: 0,
      heatGeneration: this.calculateHeatGeneration(target, programId),
      maxHeat: this.calculateMaxHeat(target),
      startTime: Date.now(),
    };

    this.activeHacks.set(targetId, hack);
    this.emit('hackStarted', hack);
    return true;
  }

  stopHack(targetId: string) {
    const hack = this.activeHacks.get(targetId);
    if (!hack) return false;

    this.activeHacks.delete(targetId);
    this.emit('hackStopped', { targetId, progress: hack.progress });
    return true;
  }

  private completeHack(hackId: string) {
    const hack = this.activeHacks.get(hackId);
    if (!hack) return;

    this.activeHacks.delete(hackId);
    this.playerHeat += hack.heat;

    // Apply hack effects
    this.applyHackEffects(hack);

    this.emit('hackCompleted', hack);
  }

  private failHack(hackId: string, reason: string) {
    const hack = this.activeHacks.get(hackId);
    if (!hack) return;

    this.activeHacks.delete(hackId);
    this.playerHeat += hack.heat * 0.5; // Partial heat on failure

    this.emit('hackFailed', { hack, reason });
  }

  private applyHackEffects(hack: any) {
    const { target, program } = hack;

    switch (target.type) {
      case 'terminal':
        this.applyTerminalHack(target, program);
        break;
      case 'security_camera':
        this.applyCameraHack(target, program);
        break;
      case 'door_lock':
        this.applyDoorHack(target, program);
        break;
      case 'augmentation':
        this.applyAugmentationHack(target, program);
        break;
      case 'network':
        this.applyNetworkHack(target, program);
        break;
    }
  }

  private applyTerminalHack(target: any, _program: any) {
    // Extract data, disable security, etc.
    this.emit('dataExtracted', { target, data: this.generateHackData(target) });
  }

  private applyCameraHack(target: any, _program: any) {
    // Disable camera, loop footage, etc.
    this.emit('cameraHacked', { target, effect: 'disabled' });
  }

  private applyDoorHack(target: any, _program: any) {
    // Unlock door, disable security, etc.
    this.emit('doorHacked', { target, effect: 'unlocked' });
  }

  private applyAugmentationHack(target: any, _program: any) {
    // Hack player augmentation, cause malfunction, etc.
    this.emit('augmentationHacked', { target, effect: 'malfunction' });
  }

  private applyNetworkHack(target: any, _program: any) {
    // Access network, steal data, etc.
    this.emit('networkHacked', { target, access: 'gained' });
  }

  // Neural program management
  private initializeNeuralPrograms() {
    const programs = [
      {
        id: 'wallhack',
        name: 'Wallhack.exe',
        description: 'See through walls and obstacles',
        type: 'vision',
        heatCost: 15,
        duration: 30,
        rarity: 'rare',
      },
      {
        id: 'aimbot',
        name: 'Aimbot.exe',
        description: 'Automated targeting system',
        type: 'combat',
        heatCost: 20,
        duration: 20,
        rarity: 'epic',
      },
      {
        id: 'bullettime',
        name: 'Bullettime.exe',
        description: 'Slow down time perception',
        type: 'temporal',
        heatCost: 25,
        duration: 15,
        rarity: 'legendary',
      },
      {
        id: 'stealth',
        name: 'Stealth.exe',
        description: 'Reduce detection chance',
        type: 'stealth',
        heatCost: 10,
        duration: 45,
        rarity: 'uncommon',
      },
      {
        id: 'datamine',
        name: 'Datamine.exe',
        description: 'Extract data faster',
        type: 'hacking',
        heatCost: 12,
        duration: 60,
        rarity: 'common',
      },
      {
        id: 'firewall',
        name: 'Firewall.exe',
        description: 'Protect against counter-hacks',
        type: 'defense',
        heatCost: 8,
        duration: 90,
        rarity: 'common',
      },
    ];

    programs.forEach(program => {
      this.neuralPrograms.set(program.id, program);
    });
  }

  useNeuralProgram(programId: string): boolean {
    const program = this.neuralPrograms.get(programId);
    if (!program) return false;

    if (this.playerHeat + program.heatCost > this.maxHeat) {
      this.emit('programError', {
        programId,
        error: 'Insufficient heat capacity',
      });
      return false;
    }

    this.playerHeat += program.heatCost;
    this.emit('programActivated', { program, duration: program.duration });
    return true;
  }

  installNeuralProgram(programId: string): boolean {
    // This would integrate with inventory system
    this.emit('programInstalled', { programId });
    return true;
  }

  // Hack target management
  addHackTarget(target: any) {
    this.hackTargets.set(target.id, target);
  }

  removeHackTarget(targetId: string) {
    this.hackTargets.delete(targetId);
  }

  getHackTarget(targetId: string) {
    return this.hackTargets.get(targetId);
  }

  // Utility methods
  private calculateHackSpeed(target: any, programId?: string): number {
    let baseSpeed = 10; // Base hacking speed

    // Reduce speed based on security level
    baseSpeed *= 1 - target.securityLevel * 0.1;

    // Apply program bonuses
    if (programId) {
      const program = this.neuralPrograms.get(programId);
      if (program && program.type === 'hacking') {
        baseSpeed *= 1.5;
      }
    }

    return Math.max(1, baseSpeed);
  }

  private calculateHeatGeneration(target: any, programId?: string): number {
    let baseHeat = target.securityLevel * 2;

    if (programId) {
      const program = this.neuralPrograms.get(programId);
      if (program) {
        baseHeat += program.heatCost / 10;
      }
    }

    return baseHeat;
  }

  private calculateMaxHeat(target: any): number {
    return 50 + target.securityLevel * 10;
  }

  private generateHackData(target: any): any {
    return {
      type: 'corporate_data',
      value: Math.floor(Math.random() * 1000) + 100,
      securityLevel: target.securityLevel,
      timestamp: Date.now(),
    };
  }

  // Getters
  getActiveHacks(): any[] {
    return Array.from(this.activeHacks.values());
  }

  getNeuralPrograms(): any[] {
    return Array.from(this.neuralPrograms.values());
  }

  getPlayerHeat(): number {
    return this.playerHeat;
  }

  getMaxHeat(): number {
    return this.maxHeat;
  }

  getHeatPercentage(): number {
    return (this.playerHeat / this.maxHeat) * 100;
  }

  isOverheated(): boolean {
    return this.playerHeat >= this.maxHeat;
  }

  // Cleanup
  clearActiveHacks() {
    this.activeHacks.clear();
  }

  resetHeat() {
    this.playerHeat = 0;
  }
}
