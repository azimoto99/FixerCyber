import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AuthService } from '../AuthService';

// Mock dependencies
const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockBcrypt = {
  hash: jest.fn(),
  compare: jest.fn(),
};

const mockJwt = {
  sign: jest.fn(),
  verify: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

jest.mock('bcryptjs', () => mockBcrypt);
jest.mock('jsonwebtoken', () => mockJwt);

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      };

      const hashedPassword = 'hashed_password';
      const createdUser = {
        id: 'user-id',
        username: userData.username,
        email: userData.email,
        passwordHash: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue(hashedPassword);
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await authService.register(
        userData.username,
        userData.email,
        userData.password
      );

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: createdUser.id,
        username: createdUser.username,
        email: createdUser.email,
        createdAt: createdUser.createdAt,
      });
      expect(mockBcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
    });

    it('should fail if username already exists', async () => {
      const existingUser = {
        id: 'existing-id',
        username: 'testuser',
        email: 'existing@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findFirst.mockResolvedValue(existingUser);

      const result = await authService.register(
        'testuser',
        'test@example.com',
        'Password123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Username or email already exists');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.user.findFirst.mockRejectedValue(new Error('Database error'));

      const result = await authService.register(
        'testuser',
        'test@example.com',
        'Password123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Registration failed');
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const userData = {
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = 'jwt_token';

      mockPrisma.user.findFirst.mockResolvedValue(userData);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign.mockReturnValue(token);

      const result = await authService.login('testuser', 'Password123');

      expect(result.success).toBe(true);
      expect(result.token).toBe(token);
      expect(result.user).toEqual({
        id: userData.id,
        username: userData.username,
        email: userData.email,
      });
    });

    it('should fail with invalid username', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await authService.login('nonexistent', 'Password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should fail with invalid password', async () => {
      const userData = {
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findFirst.mockResolvedValue(userData);
      mockBcrypt.compare.mockResolvedValue(false);

      const result = await authService.login('testuser', 'WrongPassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('verifyToken', () => {
    it('should successfully verify valid token', async () => {
      const decodedToken = { userId: 'user-id', username: 'testuser' };
      const userData = {
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        createdAt: new Date(),
      };

      mockJwt.verify.mockReturnValue(decodedToken);
      mockPrisma.user.findUnique.mockResolvedValue(userData);

      const result = await authService.verifyToken('valid_token');

      expect(result.success).toBe(true);
      expect(result.user).toEqual(userData);
    });

    it('should fail with invalid token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await authService.verifyToken('invalid_token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('should fail if user not found', async () => {
      const decodedToken = { userId: 'user-id', username: 'testuser' };

      mockJwt.verify.mockReturnValue(decodedToken);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await authService.verifyToken('valid_token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });
});