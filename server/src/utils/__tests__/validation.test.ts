import { describe, expect, it } from '@jest/globals';

// Sample validation utilities for testing
export const validation = {
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isValidUsername: (username: string): boolean => {
    return (
      username.length >= 3 &&
      username.length <= 20 &&
      /^[a-zA-Z0-9_]+$/.test(username)
    );
  },

  isValidPassword: (password: string): boolean => {
    return (
      password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
    );
  },

  sanitizeInput: (input: string): string => {
    return input.trim().replace(/[<>]/g, '');
  },

  isValidPosition: (x: number, y: number): boolean => {
    return (
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      x >= -10000 &&
      x <= 10000 &&
      y >= -10000 &&
      y <= 10000
    );
  },
};

describe('Validation Utils', () => {
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validation.isValidEmail('test@example.com')).toBe(true);
      expect(validation.isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(validation.isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validation.isValidEmail('invalid-email')).toBe(false);
      expect(validation.isValidEmail('@example.com')).toBe(false);
      expect(validation.isValidEmail('test@')).toBe(false);
      expect(validation.isValidEmail('test@.com')).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    it('should validate correct usernames', () => {
      expect(validation.isValidUsername('player123')).toBe(true);
      expect(validation.isValidUsername('cyber_fixer')).toBe(true);
      expect(validation.isValidUsername('ABC')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(validation.isValidUsername('ab')).toBe(false); // too short
      expect(validation.isValidUsername('a'.repeat(21))).toBe(false); // too long
      expect(validation.isValidUsername('player-123')).toBe(false); // invalid character
      expect(validation.isValidUsername('player 123')).toBe(false); // space
    });
  });

  describe('isValidPassword', () => {
    it('should validate strong passwords', () => {
      expect(validation.isValidPassword('Password123')).toBe(true);
      expect(validation.isValidPassword('MySecure1Pass')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validation.isValidPassword('password')).toBe(false); // no uppercase/number
      expect(validation.isValidPassword('PASSWORD123')).toBe(false); // no lowercase
      expect(validation.isValidPassword('Password')).toBe(false); // no number
      expect(validation.isValidPassword('Pass1')).toBe(false); // too short
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      expect(validation.sanitizeInput('<script>alert("xss")</script>')).toBe(
        'scriptalert("xss")/script'
      );
      expect(validation.sanitizeInput('  hello world  ')).toBe('hello world');
    });

    it('should preserve safe content', () => {
      expect(validation.sanitizeInput('Hello, World!')).toBe('Hello, World!');
      expect(validation.sanitizeInput('Player123')).toBe('Player123');
    });
  });

  describe('isValidPosition', () => {
    it('should validate reasonable positions', () => {
      expect(validation.isValidPosition(0, 0)).toBe(true);
      expect(validation.isValidPosition(100, -50)).toBe(true);
      expect(validation.isValidPosition(9999, 9999)).toBe(true);
    });

    it('should reject invalid positions', () => {
      expect(validation.isValidPosition(NaN, 0)).toBe(false);
      expect(validation.isValidPosition(0, Infinity)).toBe(false);
      expect(validation.isValidPosition(10001, 0)).toBe(false);
      expect(validation.isValidPosition(0, -10001)).toBe(false);
    });
  });
});
