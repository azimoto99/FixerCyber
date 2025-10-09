import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export class PlayerService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getPlayer(userId: string) {
    try {
      const player = await this.prisma.player.findFirst({
        where: { userId },
        include: {
          inventoryItems: true,
          housing: true,
        },
      });

      return player;
    } catch (error) {
      console.error('Get player error:', error);
      return null;
    }
  }

  async createPlayer(userId: string, username: string) {
    try {
      // Check if player already exists
      const existingPlayer = await this.prisma.player.findFirst({
        where: { userId },
      });

      if (existingPlayer) {
        return null;
      }

      // Create new player
      const player = await this.prisma.player.create({
        data: {
          id: uuidv4(),
          userId,
          username,
          positionX: 0,
          positionY: 0,
          health: 100,
          credits: 0,
          isAlive: true,
        },
      });

      return player;
    } catch (error) {
      console.error('Create player error:', error);
      return null;
    }
  }

  async updatePlayerPosition(userId: string, x: number, y: number) {
    try {
      const player = await this.prisma.player.findFirst({
        where: { userId },
      });

      if (!player) {
        return false;
      }

      await this.prisma.player.update({
        where: { id: player.id },
        data: {
          positionX: x,
          positionY: y,
          lastSeen: new Date(),
        },
      });

      return true;
    } catch (error) {
      console.error('Update position error:', error);
      return false;
    }
  }

  async getPlayerInventory(userId: string) {
    try {
      const player = await this.prisma.player.findFirst({
        where: { userId },
        include: {
          inventoryItems: true,
        },
      });

      return player?.inventoryItems || [];
    } catch (error) {
      console.error('Get inventory error:', error);
      return [];
    }
  }

  async updatePlayerInventory(userId: string, items: any[]) {
    try {
      const player = await this.prisma.player.findFirst({
        where: { userId },
      });

      if (!player) {
        return false;
      }

      // Delete existing inventory items
      await this.prisma.inventoryItem.deleteMany({
        where: { playerId: player.id },
      });

      // Create new inventory items
      if (items.length > 0) {
        await this.prisma.inventoryItem.createMany({
          data: items.map(item => ({
            id: uuidv4(),
            playerId: player.id,
            itemType: item.type,
            itemData: item.data || {},
            gridX: item.position?.x || 0,
            gridY: item.position?.y || 0,
            gridWidth: item.gridSize?.width || 1,
            gridHeight: item.gridSize?.height || 1,
          })),
        });
      }

      return true;
    } catch (error) {
      console.error('Update inventory error:', error);
      return false;
    }
  }

  async updatePlayerHealth(userId: string, health: number) {
    try {
      const player = await this.prisma.player.findFirst({
        where: { userId },
      });

      if (!player) {
        return false;
      }

      await this.prisma.player.update({
        where: { id: player.id },
        data: {
          health: Math.max(0, Math.min(100, health)),
          isAlive: health > 0,
        },
      });

      return true;
    } catch (error) {
      console.error('Update health error:', error);
      return false;
    }
  }

  async updatePlayerCredits(userId: string, credits: number) {
    try {
      const player = await this.prisma.player.findFirst({
        where: { userId },
      });

      if (!player) {
        return false;
      }

      await this.prisma.player.update({
        where: { id: player.id },
        data: {
          credits: Math.max(0, credits),
        },
      });

      return true;
    } catch (error) {
      console.error('Update credits error:', error);
      return false;
    }
  }
}
