// Mock Prisma Client for database tests
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    player: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    worldChunk: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    contract: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));

// Test utilities
export const testUtils = {
  createMockUser: () => ({
    id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  createMockPlayer: () => ({
    id: 'test-player-id',
    userId: 'test-user-id',
    username: 'testplayer',
    position: { x: 0, y: 0 },
    health: 100,
    maxHealth: 100,
    credits: 1000,
    isAlive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
};
