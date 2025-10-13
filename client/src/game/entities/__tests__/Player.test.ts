// Tests for Player entity
import { beforeEach, describe, expect, it } from 'vitest';
import { Augmentation, InventoryItem, Vector2 } from '../../../types/game';
import { Player } from '../Player';

describe('Player Entity', () => {
  let player: Player;
  const testPosition: Vector2 = { x: 100, y: 200 };

  beforeEach(() => {
    player = new Player('test-id', 'TestPlayer', testPosition);
  });

  describe('Constructor', () => {
    it('should initialize player with correct basic properties', () => {
      expect(player.id).toBe('test-id');
      expect(player.username).toBe('TestPlayer');
      expect(player.position).toEqual(testPosition);
      expect(player.health).toBe(100);
      expect(player.maxHealth).toBe(100);
      expect(player.credits).toBe(1000);
      expect(player.isAlive).toBe(true);
      expect(player.isProne).toBe(false);
      expect(player.isRolling).toBe(false);
    });

    it('should initialize player with correct default values', () => {
      expect(player.velocity).toEqual({ x: 0, y: 0 });
      expect(player.facing).toBe(0);
      expect(player.inventory).toEqual([]);
      expect(player.augmentations).toEqual([]);
      expect(player.neuralPrograms).toEqual([]);
      expect(player.systemHeat).toBe(0);
      expect(player.visionRange).toBe(500);
      expect(player.speed).toBe(200);
      expect(player.collisionRadius).toBe(15);
    });
  });

  describe('Movement and Physics', () => {
    it('should update position based on velocity', () => {
      player.setVelocity({ x: 100, y: 50 });
      player.updatePosition(1000); // 1 second

      expect(player.position.x).toBe(200); // 100 + 100*1
      expect(player.position.y).toBe(250); // 200 + 50*1
    });

    it('should not move when dead', () => {
      player.die();
      player.setVelocity({ x: 100, y: 50 });
      const originalPosition = { ...player.position };

      player.updatePosition(1000);

      expect(player.position).toEqual(originalPosition);
    });

    it('should set facing direction', () => {
      player.setFacing(Math.PI / 2);
      expect(player.facing).toBe(Math.PI / 2);
    });
  });

  describe('Health Management', () => {
    it('should take damage correctly', () => {
      player.takeDamage(30);
      expect(player.health).toBe(70);
      expect(player.isAlive).toBe(true);
    });

    it('should die when health reaches zero', () => {
      player.takeDamage(100);
      expect(player.health).toBe(0);
      expect(player.isAlive).toBe(false);
    });

    it('should not take damage below zero', () => {
      player.takeDamage(150);
      expect(player.health).toBe(0);
    });

    it('should heal correctly', () => {
      player.takeDamage(50);
      player.heal(20);
      expect(player.health).toBe(70);
    });

    it('should not heal above max health', () => {
      player.heal(50);
      expect(player.health).toBe(100);
    });

    it('should respawn correctly', () => {
      player.die();
      player.respawn();

      expect(player.isAlive).toBe(true);
      expect(player.health).toBe(player.maxHealth);
    });
  });

  describe('State Management', () => {
    it('should set prone state correctly', () => {
      player.setProne(true);

      expect(player.isProne).toBe(true);
      expect(player.speed).toBe(50); // Reduced speed when prone
      expect(player.visionRange).toBe(300); // Reduced vision when prone
    });

    it('should restore normal state when not prone', () => {
      player.setProne(true);
      player.setProne(false);

      expect(player.isProne).toBe(false);
      expect(player.speed).toBe(200); // Normal speed
      expect(player.visionRange).toBe(500); // Normal vision
    });

    it('should set rolling state', () => {
      player.setRolling(true);
      expect(player.isRolling).toBe(true);

      player.setRolling(false);
      expect(player.isRolling).toBe(false);
    });
  });

  describe('Inventory System', () => {
    const testItem: InventoryItem = {
      id: 'item-1',
      type: 'weapon' as any,
      name: 'Test Weapon',
      gridSize: { x: 2, y: 1 },
      position: { x: 0, y: 0 },
      stats: {
        damage: 50,
        accuracy: 80,
        range: 100,
        durability: 100,
        rarity: 'common' as any,
      },
    };

    it('should add items to inventory', () => {
      const success = player.addItem(testItem);

      expect(success).toBe(true);
      expect(player.inventory).toContain(testItem);
      expect(player.inventory.length).toBe(1);
    });

    it('should remove items from inventory', () => {
      player.addItem(testItem);
      const removedItem = player.removeItem('item-1');

      expect(removedItem).toEqual(testItem);
      expect(player.inventory.length).toBe(0);
    });

    it('should return null when removing non-existent item', () => {
      const removedItem = player.removeItem('non-existent');
      expect(removedItem).toBeNull();
    });

    it('should equip weapons correctly', () => {
      player.addItem(testItem);
      const success = player.equipWeapon('item-1');

      expect(success).toBe(true);
      expect(player.equippedWeapon).toEqual(testItem);
      expect(player.equippedWeaponId).toBe('item-1');
    });

    it('should not equip non-weapon items', () => {
      const nonWeapon = { ...testItem, type: 'consumable' as any };
      player.addItem(nonWeapon);
      const success = player.equipWeapon(nonWeapon.id);

      expect(success).toBe(false);
      expect(player.equippedWeapon).toBeNull();
    });

    it('should unequip weapons', () => {
      player.addItem(testItem);
      player.equipWeapon('item-1');
      player.unequipWeapon();

      expect(player.equippedWeapon).toBeNull();
      expect(player.equippedWeaponId).toBeNull();
    });
  });

  describe('Augmentation System', () => {
    const testAugmentation: Augmentation = {
      id: 'aug-1',
      name: 'Health Boost',
      category: 'combat' as any,
      effects: [{ type: 'health', value: 25 }],
      powerCost: 10,
      rarity: 'common' as any,
    };

    it('should install augmentations', () => {
      const success = player.installAugmentation(testAugmentation);

      expect(success).toBe(true);
      expect(player.augmentations).toContain(testAugmentation);
      expect(player.maxHealth).toBe(125); // 100 + 25
    });

    it('should not install duplicate augmentations', () => {
      player.installAugmentation(testAugmentation);
      const success = player.installAugmentation(testAugmentation);

      expect(success).toBe(false);
      expect(player.augmentations.length).toBe(1);
    });

    it('should remove augmentations', () => {
      player.installAugmentation(testAugmentation);
      const success = player.removeAugmentation('aug-1');

      expect(success).toBe(true);
      expect(player.augmentations.length).toBe(0);
      expect(player.maxHealth).toBe(100); // Back to original
    });

    it('should adjust health when max health is reduced', () => {
      player.installAugmentation(testAugmentation);
      player.health = 125; // Full health with augmentation
      player.removeAugmentation('aug-1');

      expect(player.health).toBe(100); // Capped at new max health
    });
  });

  describe('Neural Programs', () => {
    it('should add neural programs', () => {
      const success = player.addNeuralProgram('wallhack.exe');

      expect(success).toBe(true);
      expect(player.neuralPrograms).toContain('wallhack.exe');
    });

    it('should not add duplicate neural programs', () => {
      player.addNeuralProgram('wallhack.exe');
      const success = player.addNeuralProgram('wallhack.exe');

      expect(success).toBe(false);
      expect(player.neuralPrograms.length).toBe(1);
    });

    it('should remove neural programs', () => {
      player.addNeuralProgram('wallhack.exe');
      const success = player.removeNeuralProgram('wallhack.exe');

      expect(success).toBe(true);
      expect(player.neuralPrograms.length).toBe(0);
    });

    it('should check if player has neural program', () => {
      player.addNeuralProgram('aimbot.exe');

      expect(player.hasNeuralProgram('aimbot.exe')).toBe(true);
      expect(player.hasNeuralProgram('wallhack.exe')).toBe(false);
    });

    it('should manage system heat', () => {
      player.increaseSystemHeat(30);
      expect(player.systemHeat).toBe(30);

      player.increaseSystemHeat(80);
      expect(player.systemHeat).toBe(100); // Capped at 100

      player.decreaseSystemHeat(20);
      expect(player.systemHeat).toBe(80);

      player.decreaseSystemHeat(100);
      expect(player.systemHeat).toBe(0); // Capped at 0
    });
  });

  describe('Combat System', () => {
    it('should manage ammo correctly', () => {
      player.setAmmo('pistol', 15);
      expect(player.getAmmo('pistol')).toBe(15);

      const success = player.useAmmo('pistol', 3);
      expect(success).toBe(true);
      expect(player.getAmmo('pistol')).toBe(12);
    });

    it('should not use more ammo than available', () => {
      player.setAmmo('rifle', 5);
      const success = player.useAmmo('rifle', 10);

      expect(success).toBe(false);
      expect(player.getAmmo('rifle')).toBe(5); // Unchanged
    });

    it('should return 0 for unknown weapon types', () => {
      expect(player.getAmmo('unknown')).toBe(0);
    });
  });

  describe('Collision Detection', () => {
    it('should detect collision with other players', () => {
      const otherPlayer = new Player('other', 'Other', { x: 110, y: 210 });

      expect(player.isCollidingWith(otherPlayer)).toBe(true);
    });

    it('should not detect collision when players are far apart', () => {
      const otherPlayer = new Player('other', 'Other', { x: 200, y: 300 });

      expect(player.isCollidingWith(otherPlayer)).toBe(false);
    });

    it('should detect collision with points', () => {
      const nearPoint = { x: 105, y: 205 };
      const farPoint = { x: 200, y: 300 };

      expect(player.isCollidingWithPoint(nearPoint)).toBe(true);
      expect(player.isCollidingWithPoint(farPoint)).toBe(false);
    });
  });

  describe('State Queries', () => {
    it('should check if player can move', () => {
      expect(player.canMove()).toBe(true);

      player.die();
      expect(player.canMove()).toBe(false);

      player.respawn();
      player.setRolling(true);
      expect(player.canMove()).toBe(false);
    });

    it('should check if player can shoot', () => {
      const weapon: InventoryItem = {
        id: 'weapon-1',
        type: 'weapon' as any,
        name: 'Test Gun',
        gridSize: { x: 2, y: 1 },
        position: { x: 0, y: 0 },
        stats: { rarity: 'common' as any },
      };

      expect(player.canShoot()).toBe(false); // No weapon equipped

      player.addItem(weapon);
      player.equipWeapon('weapon-1');
      expect(player.canShoot()).toBe(true);

      player.die();
      expect(player.canShoot()).toBe(false);
    });

    it('should check if player can interact', () => {
      expect(player.canInteract()).toBe(true);

      player.die();
      expect(player.canInteract()).toBe(false);

      player.respawn();
      player.setRolling(true);
      expect(player.canInteract()).toBe(false);
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON correctly', () => {
      player.addNeuralProgram('wallhack.exe');
      player.setAmmo('pistol', 20);

      const json = player.toJSON();

      expect(json.id).toBe(player.id);
      expect(json.username).toBe(player.username);
      expect(json.position).toEqual(player.position);
      expect(json.neuralPrograms).toContain('wallhack.exe');
      expect(json.ammo).toEqual([['pistol', 20]]);
    });

    it('should deserialize from JSON correctly', () => {
      const originalPlayer = new Player('test', 'Test', { x: 50, y: 75 });
      originalPlayer.addNeuralProgram('aimbot.exe');
      originalPlayer.setAmmo('rifle', 30);

      const json = originalPlayer.toJSON();
      const restoredPlayer = Player.fromJSON(json);

      expect(restoredPlayer.id).toBe(originalPlayer.id);
      expect(restoredPlayer.username).toBe(originalPlayer.username);
      expect(restoredPlayer.position).toEqual(originalPlayer.position);
      expect(restoredPlayer.neuralPrograms).toContain('aimbot.exe');
      expect(restoredPlayer.getAmmo('rifle')).toBe(30);
    });

    it('should handle missing data in JSON gracefully', () => {
      const minimalData = {
        id: 'minimal',
        username: 'Minimal',
        position: { x: 0, y: 0 },
      };

      const player = Player.fromJSON(minimalData);

      expect(player.id).toBe('minimal');
      expect(player.health).toBe(100); // Default value
      expect(player.inventory).toEqual([]); // Default empty array
      expect(player.neuralPrograms).toEqual([]); // Default empty array
    });
  });

  describe('State Management', () => {
    it('should get current state snapshot', () => {
      const state = player.getState();

      expect(state.id).toBe(player.id);
      expect(state.position).toEqual(player.position);
      expect(state.health).toBe(player.health);
      expect(state.inventory).toEqual(player.inventory);

      // Ensure it's a copy, not reference
      state.position.x = 999;
      expect(player.position.x).toBe(100); // Original unchanged
    });

    it('should apply partial state updates', () => {
      const newState = {
        position: { x: 300, y: 400 },
        health: 75,
        credits: 2000,
      };

      player.setState(newState);

      expect(player.position).toEqual({ x: 300, y: 400 });
      expect(player.health).toBe(75);
      expect(player.credits).toBe(2000);
      expect(player.username).toBe('TestPlayer'); // Unchanged
    });
  });
});
