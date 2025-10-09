import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

describe('Database Integration Tests', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'file:./test.db', // Use SQLite for testing
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('User Operations', () => {
    it('should create and retrieve a user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
      };

      const createdUser = await prisma.user.create({
        data: userData,
      });

      expect(createdUser.username).toBe(userData.username);
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.id).toBeDefined();

      const retrievedUser = await prisma.user.findUnique({
        where: { id: createdUser.id },
      });

      expect(retrievedUser).toEqual(createdUser);

      // Cleanup
      await prisma.user.delete({ where: { id: createdUser.id } });
    });

    it('should enforce unique constraints', async () => {
      const userData = {
        username: 'uniqueuser',
        email: 'unique@example.com',
        passwordHash: 'hashed_password',
      };

      const user1 = await prisma.user.create({ data: userData });

      // Try to create another user with same username
      await expect(
        prisma.user.create({
          data: {
            ...userData,
            email: 'different@example.com',
          },
        })
      ).rejects.toThrow();

      // Cleanup
      await prisma.user.delete({ where: { id: user1.id } });
    });
  });

  describe('Player Operations', () => {
    it('should create player linked to user', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'playeruser',
          email: 'player@example.com',
          passwordHash: 'hashed_password',
        },
      });

      const playerData = {
        userId: user.id,
        username: 'PlayerName',
        positionX: 100,
        positionY: 200,
        health: 80,
        credits: 1500,
      };

      const player = await prisma.player.create({
        data: playerData,
      });

      expect(player.userId).toBe(user.id);
      expect(player.username).toBe(playerData.username);
      expect(player.positionX).toBe(playerData.positionX);

      // Test cascade delete
      await prisma.user.delete({ where: { id: user.id } });

      const deletedPlayer = await prisma.player.findUnique({
        where: { id: player.id },
      });
      expect(deletedPlayer).toBeNull();
    });
  });

  describe('World Chunk Operations', () => {
    it('should create and retrieve world chunks', async () => {
      const chunkData = {
        x: 0,
        y: 0,
        districtType: 'corporate',
        generatedData: {
          buildings: [{ id: '1', type: 'office' }],
          roads: [],
          npcs: [],
        },
      };

      const chunk = await prisma.worldChunk.create({
        data: chunkData,
      });

      expect(chunk.x).toBe(0);
      expect(chunk.y).toBe(0);
      expect(chunk.districtType).toBe('corporate');

      const retrievedChunk = await prisma.worldChunk.findFirst({
        where: { x: 0, y: 0 },
      });

      expect(retrievedChunk).toEqual(chunk);

      // Cleanup
      await prisma.worldChunk.delete({ where: { id: chunk.id } });
    });

    it('should enforce unique coordinate constraint', async () => {
      const chunkData = {
        x: 1,
        y: 1,
        districtType: 'residential',
      };

      const chunk1 = await prisma.worldChunk.create({ data: chunkData });

      // Try to create another chunk at same coordinates
      await expect(
        prisma.worldChunk.create({ data: chunkData })
      ).rejects.toThrow();

      // Cleanup
      await prisma.worldChunk.delete({ where: { id: chunk1.id } });
    });
  });

  describe('Contract Operations', () => {
    it('should create contracts with fixers', async () => {
      const fixer = await prisma.fixer.create({
        data: {
          name: 'TestFixer',
          faction: 'TestFaction',
          reputation: 85,
        },
      });

      const contractData = {
        type: 'assassination',
        fixerId: fixer.id,
        rewardCredits: 5000,
        timeLimit: 30,
        description: 'Test contract',
      };

      const contract = await prisma.contract.create({
        data: contractData,
        include: { fixer: true },
      });

      expect(contract.type).toBe('assassination');
      expect(contract.fixer.name).toBe('TestFixer');
      expect(contract.rewardCredits).toBe(5000);

      // Cleanup
      await prisma.contract.delete({ where: { id: contract.id } });
      await prisma.fixer.delete({ where: { id: fixer.id } });
    });
  });

  describe('Inventory Operations', () => {
    it('should manage player inventory items', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'inventoryuser',
          email: 'inventory@example.com',
          passwordHash: 'hashed_password',
        },
      });

      const player = await prisma.player.create({
        data: {
          userId: user.id,
          username: 'InventoryPlayer',
        },
      });

      const itemData = {
        playerId: player.id,
        itemType: 'weapon',
        itemData: { name: 'Pistol', damage: 25 },
        gridX: 0,
        gridY: 0,
        gridWidth: 2,
        gridHeight: 1,
      };

      const item = await prisma.inventoryItem.create({
        data: itemData,
      });

      expect(item.itemType).toBe('weapon');
      expect(item.gridX).toBe(0);

      const playerWithItems = await prisma.player.findUnique({
        where: { id: player.id },
        include: { inventoryItems: true },
      });

      expect(playerWithItems?.inventoryItems).toHaveLength(1);
      expect(playerWithItems?.inventoryItems[0].itemType).toBe('weapon');

      // Cleanup
      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('Augmentation System', () => {
    it('should manage player augmentations', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'auguser',
          email: 'aug@example.com',
          passwordHash: 'hashed_password',
        },
      });

      const player = await prisma.player.create({
        data: {
          userId: user.id,
          username: 'AugPlayer',
        },
      });

      const augmentation = await prisma.augmentation.create({
        data: {
          name: 'Neural Interface',
          category: 'HACKING',
          effects: { hackSpeed: 50 },
          powerCost: 20,
          rarity: 'RARE',
        },
      });

      const playerAug = await prisma.playerAugmentation.create({
        data: {
          playerId: player.id,
          augmentationId: augmentation.id,
          isActive: true,
        },
      });

      expect(playerAug.isActive).toBe(true);

      const playerWithAugs = await prisma.player.findUnique({
        where: { id: player.id },
        include: {
          playerAugmentations: {
            include: { augmentation: true },
          },
        },
      });

      expect(playerWithAugs?.playerAugmentations).toHaveLength(1);
      expect(playerWithAugs?.playerAugmentations[0].augmentation.name).toBe('Neural Interface');

      // Cleanup
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.augmentation.delete({ where: { id: augmentation.id } });
    });
  });

  describe('Housing System', () => {
    it('should manage property ownership', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'houseuser',
          email: 'house@example.com',
          passwordHash: 'hashed_password',
        },
      });

      const player = await prisma.player.create({
        data: {
          userId: user.id,
          username: 'HousePlayer',
        },
      });

      const housing = await prisma.housing.create({
        data: {
          type: 'RESIDENTIAL',
          district: 'Downtown',
          positionX: 100,
          positionY: 200,
          rentCost: 1500,
          ownerId: player.id,
        },
      });

      expect(housing.type).toBe('RESIDENTIAL');
      expect(housing.ownerId).toBe(player.id);

      const playerWithHousing = await prisma.player.findUnique({
        where: { id: player.id },
        include: { housing: true },
      });

      expect(playerWithHousing?.housing).toHaveLength(1);
      expect(playerWithHousing?.housing[0].district).toBe('Downtown');

      // Cleanup
      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('Database Indexes and Performance', () => {
    it('should efficiently query players by position', async () => {
      // This test would be more meaningful with a larger dataset
      // but demonstrates the query pattern
      const user = await prisma.user.create({
        data: {
          username: 'posuser',
          email: 'pos@example.com',
          passwordHash: 'hashed_password',
        },
      });

      const player = await prisma.player.create({
        data: {
          userId: user.id,
          username: 'PosPlayer',
          positionX: 150,
          positionY: 250,
        },
      });

      const nearbyPlayers = await prisma.player.findMany({
        where: {
          positionX: { gte: 100, lte: 200 },
          positionY: { gte: 200, lte: 300 },
          isAlive: true,
        },
      });

      expect(nearbyPlayers.length).toBeGreaterThan(0);
      expect(nearbyPlayers[0].username).toBe('PosPlayer');

      // Cleanup
      await prisma.user.delete({ where: { id: user.id } });
    });

    it('should efficiently query contracts by status', async () => {
      const fixer = await prisma.fixer.create({
        data: {
          name: 'QueryFixer',
          faction: 'TestFaction',
        },
      });

      const contract = await prisma.contract.create({
        data: {
          type: 'data_extraction',
          fixerId: fixer.id,
          status: 'AVAILABLE',
          rewardCredits: 3000,
        },
      });

      const availableContracts = await prisma.contract.findMany({
        where: { status: 'AVAILABLE' },
        include: { fixer: true },
      });

      expect(availableContracts.length).toBeGreaterThan(0);
      expect(availableContracts.some(c => c.id === contract.id)).toBe(true);

      // Cleanup
      await prisma.contract.delete({ where: { id: contract.id } });
      await prisma.fixer.delete({ where: { id: fixer.id } });
    });
  });
});