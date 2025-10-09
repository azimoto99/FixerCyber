import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export class ContractService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getAvailableContracts(playerId: string) {
    try {
      const contracts = await this.prisma.contract.findMany({
        where: {
          OR: [{ playerId: null }, { playerId }],
          status: 'AVAILABLE',
        },
        include: {
          fixer: true,
        },
      });

      return contracts;
    } catch (error) {
      console.error('Get available contracts error:', error);
      return [];
    }
  }

  async getPlayerContracts(playerId: string) {
    try {
      const contracts = await this.prisma.contract.findMany({
        where: {
          playerId,
          status: {
            in: ['ACTIVE', 'IN_PROGRESS'],
          },
        },
        include: {
          fixer: true,
        },
      });

      return contracts;
    } catch (error) {
      console.error('Get player contracts error:', error);
      return [];
    }
  }

  async acceptContract(playerId: string, contractId: string) {
    try {
      const contract = await this.prisma.contract.findUnique({
        where: { id: contractId },
      });

      if (!contract) {
        return {
          success: false,
          error: 'Contract not found',
        };
      }

      if (contract.status !== 'AVAILABLE') {
        return {
          success: false,
          error: 'Contract is not available',
        };
      }

      const updatedContract = await this.prisma.contract.update({
        where: { id: contractId },
        data: {
          playerId,
          status: 'ACTIVE',
        },
      });

      return {
        success: true,
        contract: updatedContract,
      };
    } catch (error) {
      console.error('Accept contract error:', error);
      return {
        success: false,
        error: 'Failed to accept contract',
      };
    }
  }

  async completeContract(
    playerId: string,
    contractId: string,
    completionData: any
  ) {
    try {
      const contract = await this.prisma.contract.findFirst({
        where: {
          id: contractId,
          playerId,
          status: 'ACTIVE',
        },
      });

      if (!contract) {
        return {
          success: false,
          error: 'Contract not found or not active',
        };
      }

      // Update contract status
      await this.prisma.contract.update({
        where: { id: contractId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Award credits to player
      const player = await this.prisma.player.findFirst({
        where: { userId: playerId },
      });

      if (player) {
        await this.prisma.player.update({
          where: { id: player.id },
          data: {
            credits: {
              increment: contract.rewardCredits,
            },
          },
        });
      }

      return {
        success: true,
        reward: contract.rewardCredits,
        player: {
          credits: (player?.credits || 0) + contract.rewardCredits,
        },
      };
    } catch (error) {
      console.error('Complete contract error:', error);
      return {
        success: false,
        error: 'Failed to complete contract',
      };
    }
  }

  async cancelContract(playerId: string, contractId: string) {
    try {
      const contract = await this.prisma.contract.findFirst({
        where: {
          id: contractId,
          playerId,
          status: {
            in: ['ACTIVE', 'IN_PROGRESS'],
          },
        },
      });

      if (!contract) {
        return {
          success: false,
          error: 'Contract not found or not active',
        };
      }

      await this.prisma.contract.update({
        where: { id: contractId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Cancel contract error:', error);
      return {
        success: false,
        error: 'Failed to cancel contract',
      };
    }
  }

  async createContract(contractData: any) {
    try {
      const contract = await this.prisma.contract.create({
        data: {
          id: uuidv4(),
          type: contractData.type,
          fixerId: contractData.fixerId,
          targetData: contractData.targetData || {},
          rewardCredits: contractData.rewardCredits || 0,
          timeLimit: contractData.timeLimit || 30,
          status: 'AVAILABLE',
          description: contractData.description || '',
        },
      });

      return contract;
    } catch (error) {
      console.error('Create contract error:', error);
      return null;
    }
  }
}
