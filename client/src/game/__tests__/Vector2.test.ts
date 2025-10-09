import { describe, it, expect } from 'vitest';

// Sample Vector2 utility for testing
export class Vector2 {
  constructor(
    public x: number,
    public y: number
  ) {}

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vector2 {
    const len = this.length();
    if (len === 0) return new Vector2(0, 0);
    return new Vector2(this.x / len, this.y / len);
  }
}

describe('Vector2', () => {
  it('should create a vector with x and y coordinates', () => {
    const vector = new Vector2(3, 4);
    expect(vector.x).toBe(3);
    expect(vector.y).toBe(4);
  });

  it('should add two vectors correctly', () => {
    const v1 = new Vector2(1, 2);
    const v2 = new Vector2(3, 4);
    const result = v1.add(v2);

    expect(result.x).toBe(4);
    expect(result.y).toBe(6);
  });

  it('should subtract two vectors correctly', () => {
    const v1 = new Vector2(5, 7);
    const v2 = new Vector2(2, 3);
    const result = v1.subtract(v2);

    expect(result.x).toBe(3);
    expect(result.y).toBe(4);
  });

  it('should multiply vector by scalar correctly', () => {
    const vector = new Vector2(2, 3);
    const result = vector.multiply(2);

    expect(result.x).toBe(4);
    expect(result.y).toBe(6);
  });

  it('should calculate length correctly', () => {
    const vector = new Vector2(3, 4);
    expect(vector.length()).toBe(5);
  });

  it('should normalize vector correctly', () => {
    const vector = new Vector2(3, 4);
    const normalized = vector.normalize();

    expect(normalized.length()).toBeCloseTo(1, 5);
    expect(normalized.x).toBeCloseTo(0.6, 5);
    expect(normalized.y).toBeCloseTo(0.8, 5);
  });

  it('should handle zero vector normalization', () => {
    const vector = new Vector2(0, 0);
    const normalized = vector.normalize();

    expect(normalized.x).toBe(0);
    expect(normalized.y).toBe(0);
  });
});
