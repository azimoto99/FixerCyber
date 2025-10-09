import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { ContractService } from '../ContractService';

// Mock dependencies
jest.mock('@prisma/client');

const mockPrisma = {
  contract: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  player: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

describe('ContractService', () => {
  let contractService: ContractService;

  beforeEach(() => {
    jest.clearAllMocks();
    contractService = new ContractService();
    // Replace the prisma instance with our mock
    (contractService as any).prisma = mockPrisma;
  });

  describe('getAvailableContracts', () => {
    it('should return available contracts for player', async () => {
      const availableContracts = [
        {
          id: 'contract-1',
          type: 'assassination',
          status: 'AVAILABLE',
          playerId: null,
          rewardCredits: 5000,
          fixer: {
            id: 'fixer-1',
            name: 'Raven',
            faction: 'Night Syndicate',
          },
        },
        {
          id: 'contract-2',
          type: 'data_extraction',
          status: 'AVAILABLE',
          playerId: 'player-1',
          rewardCredits: 3000,
          fixer: {
            id: 'fixer-2',
            name: 'Ghost',
            faction: 'Data Pirates',
          },
        },
      ];

      mockPrisma.contract.findMany.mockResolvedValue(availableContracts);

      const result = await contractService.getAvailableContracts('player-1');

      expect(result).toEqual(availableContracts);
      expect(mockPrisma.contract.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ playerId: null }, { playerId: 'player-1' }],
          status: 'AVAILABLE',
        },
        include: {
          fixer: true,
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.contract.findMany.mockRejectedValue(new Error('Database error'));

      const result = await contractService.getAvailableContracts('player-1');

      expect(result).toEqual([]);
    });
  });

  describe('getPlayerContracts', () => {
    it('should return active contracts for player', async () => {
      const playerContracts = [
        {
          id: 'contract-1',
          type: 'assassination',
          status: 'ACTIVE',
          playerId: 'player-1',
          rewardCredits: 5000,
          fixer: {
            id: 'fixer-1',
            name: 'Raven',
            faction: 'Night Syndicate',
          },
        },
        {
          id: 'contract-2',
          type: 'sabotage',
          status: 'IN_PROGRESS',
          playerId: 'player-1',
          rewardCredits: 2000,
          fixer: {
            id: 'fixer-3',
            name: 'Steel',
            faction: 'Corporate Security',
          },
        },
      ];

      mockPrisma.contract.findMany.mockResolvedValue(playerContracts);

      const result = await contractService.getPlayerContracts('player-1');

      expect(result).toEqual(playerContracts);
      expect(mockPrisma.contract.findMany).toHaveBeenCalledWith({
        where: {
          playerId: 'player-1',
          status: {
            in: ['ACTIVE', 'IN_PROGRESS'],
          },
        },
        include: {
          fixer: true,
        },
      });
    });

    it('should return empty array if no active contracts', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([]);

      const result = await contractService.getPlayerContracts('player-1');

      expect(result).toEqual([]);
    });
  });

  describe('acceptContract', () => {
    it('should successfully accept available contract', async () => {
      const availableContract = {
        id: 'contract-1',
        type: 'assassination',
        status: 'AVAILABLE',
        playerId: null,
        rewardCredits: 5000,
      };

      const acceptedContract = {
        ...availableContract,
        status: 'ACTIVE',
        playerId: 'player-1',
      };

      mockPrisma.contract.findUnique.mockResolvedValue(availableContract);
      mockPrisma.contract.update.mockResolvedValue(acceptedContract);

      const result = await contractService.acceptContract('player-1', 'contract-1');

      expect(result.success).toBe(true);
      expect(result.contract).toEqual(acceptedContract);
      expect(mockPrisma.contract.update).toHaveBeenCalledWith({
        where: { id: 'contract-1' },
        data: {
          playerId: 'player-1',
          status: 'ACTIVE',
        },
      });
    });

    it('should fail if contract not found', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);

      const result = await contractService.acceptContract('player-1', 'nonexistent-contract');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Contract not found');
    });

    it('should fail if contract not available', async () => {
      const unavailableContract = {
        id: 'contract-1',
        status: 'COMPLETED',
        playerId: 'other-player',
      };

      mockPrisma.contract.findUnique.mockResolvedValue(unavailableContract);

      const result = await contractService.acceptContract('player-1', 'contract-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Contract is not available');
    });
  });

  describe('completeContract', () => {
    it('should successfully complete active contract and award credits', async () => {
      const activeContract = {
        id: 'contract-1',
        type: 'assassination',
        status: 'ACTIVE',
        playerId: 'player-1',
        rewardCredits: 5000,
      };

      const mockPlayer = {
        id: 'player-db-id',
        userId: 'player-1',
        credits: 1000,
      };

      mockPrisma.contract.findFirst.mockResolvedValue(activeContract);
      mockPrisma.contract.update.mockResolvedValue({
        ...activeContract,
        status: 'COMPLETED',
        completedAt: new Date(),
      });
      mockPrisma.player.findFirst.mockResolvedValue(mockPlayer);
      mockPrisma.player.update.mockResolvedValue({
        ...mockPlayer,
        credits: 6000,
      });

      const result = await contractService.completeContract('player-1', 'contract-1', {});

      expect(result.success).toBe(true);
      expect(result.reward).toBe(5000);
      expect(result.player.credits).toBe(6000);

      expect(mockPrisma.contract.update).toHaveBeenCalledWith({
        where: { id: 'contract-1' },
        data: {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
        },
      });

      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: 'player-db-id' },
        data: {
          credits: {
            increment: 5000,
          },
        },
      });
    });

    it('should fail if contract not found or not active', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(null);

      const result = await contractService.completeContract('player-1', 'contract-1', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Contract not found or not active');
    });

    it('should handle missing player gracefully', async () => {
      const activeContract = {
        id: 'contract-1',
        status: 'ACTIVE',
        playerId: 'player-1',
        rewardCredits: 5000,
      };

      mockPrisma.contract.findFirst.mockResolvedValue(activeContract);
      mockPrisma.contract.update.mockResolvedValue(activeContract);
      mockPrisma.player.findFirst.mockResolvedValue(null);

      const result = await contractService.completeContract('player-1', 'contract-1', {});

      expect(result.success).toBe(true);
      expect(result.reward).toBe(5000);
      expect(result.player.credits).toBe(5000); // 0 + reward
    });
  });

  describe('cancelContract', () => {
    it('should successfully cancel active contract', async () => {
      const activeContract = {
        id: 'contract-1',
        status: 'ACTIVE',
        playerId: 'player-1',
      };

      mockPrisma.contract.findFirst.mockResolvedValue(activeContract);
      mockPrisma.contract.update.mockResolvedValue({
        ...activeContract,
        status: 'CANCELLED',
        cancelledAt: new Date(),
      });

      const result = await contractService.cancelContract('player-1', 'contract-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.contract.update).toHaveBeenCalledWith({
        where: { id: 'contract-1' },
        data: {
          status: 'CANCELLED',
          cancelledAt: expect.any(Date),
        },
      });
    });

    it('should fail if contract not found or not active', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(null);

      const result = await contractService.cancelContract('player-1', 'contract-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Contract not found or not active');
    });
  });

  describe('createContract', () => {
    it('should create new contract successfully', async () => {
      const contractData = {
        type: 'assassination',
        fixerId: 'fixer-1',
        targetData: {
          targetName: 'Corporate Executive',
          location: { x: 100, y: 200 },
        },
        rewardCredits: 5000,
        timeLimit: 30,
        description: 'Eliminate the target without detection',
      };

      const createdContract = {
        id: 'new-contract-id',
        ...contractData,
        status: 'AVAILABLE',
      };

      mockPrisma.contract.create.mockResolvedValue(createdContract);

      const result = await contractService.createContract(contractData);

      expect(result).toEqual(createdContract);
      expect(mockPrisma.contract.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'assassination',
          fixerId: 'fixer-1',
          targetData: contractData.targetData,
          rewardCredits: 5000,
          timeLimit: 30,
          status: 'AVAILABLE',
          description: 'Eliminate the target without detection',
        }),
      });
    });

    it('should create contract with default values', async () => {
      const minimalContractData = {
        type: 'data_extraction',
        fixerId: 'fixer-2',
      };

      const createdContract = {
        id: 'new-contract-id',
        type: 'data_extraction',
        fixerId: 'fixer-2',
        targetData: {},
        rewardCredits: 0,
        timeLimit: 30,
        status: 'AVAILABLE',
        description: '',
      };

      mockPrisma.contract.create.mockResolvedValue(createdContract);

      const result = await contractService.createContract(minimalContractData);

      expect(result).toEqual(createdContract);
      expect(mockPrisma.contract.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          targetData: {},
          rewardCredits: 0,
          timeLimit: 30,
          description: '',
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.contract.create.mockRejectedValue(new Error('Database error'));

      const result = await contractService.createContract({
        type: 'assassination',
        fixerId: 'fixer-1',
      });

      expect(result).toBeNull();
    });
  });
});