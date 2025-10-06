// 2D Vector utility class
export class Vector2 {
  public x: number
  public y: number

  constructor(x: number = 0, y: number = 0) {
    this.x = x
    this.y = y
  }

  // Basic operations
  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y)
  }

  subtract(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y)
  }

  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar)
  }

  divide(scalar: number): Vector2 {
    return new Vector2(this.x / scalar, this.y / scalar)
  }

  // Vector properties
  get magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  get magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y
  }

  normalize(): Vector2 {
    const mag = this.magnitude
    if (mag === 0) return new Vector2(0, 0)
    return this.divide(mag)
  }

  // Distance calculations
  distanceTo(other: Vector2): number {
    return this.subtract(other).magnitude
  }

  distanceSquaredTo(other: Vector2): number {
    return this.subtract(other).magnitudeSquared
  }

  // Angle calculations
  get angle(): number {
    return Math.atan2(this.y, this.x)
  }

  angleTo(other: Vector2): number {
    return other.subtract(this).angle
  }

  // Dot product
  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y
  }

  // Cross product (returns scalar for 2D)
  cross(other: Vector2): number {
    return this.x * other.y - this.y * other.x
  }

  // Linear interpolation
  lerp(other: Vector2, t: number): Vector2 {
    return this.add(other.subtract(this).multiply(t))
  }

  // Clamping
  clamp(min: Vector2, max: Vector2): Vector2 {
    return new Vector2(
      Math.max(min.x, Math.min(max.x, this.x)),
      Math.max(min.y, Math.min(max.y, this.y))
    )
  }

  // Rotation
  rotate(angle: number): Vector2 {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return new Vector2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    )
  }

  // Utility methods
  clone(): Vector2 {
    return new Vector2(this.x, this.y)
  }

  equals(other: Vector2): boolean {
    return this.x === other.x && this.y === other.y
  }

  toString(): string {
    return `Vector2(${this.x}, ${this.y})`
  }

  // Static methods
  static zero(): Vector2 {
    return new Vector2(0, 0)
  }

  static one(): Vector2 {
    return new Vector2(1, 1)
  }

  static up(): Vector2 {
    return new Vector2(0, -1)
  }

  static down(): Vector2 {
    return new Vector2(0, 1)
  }

  static left(): Vector2 {
    return new Vector2(-1, 0)
  }

  static right(): Vector2 {
    return new Vector2(1, 0)
  }

  static fromAngle(angle: number, magnitude: number = 1): Vector2 {
    return new Vector2(
      Math.cos(angle) * magnitude,
      Math.sin(angle) * magnitude
    )
  }

  static random(magnitude: number = 1): Vector2 {
    const angle = Math.random() * Math.PI * 2
    return Vector2.fromAngle(angle, magnitude)
  }

  static randomInCircle(radius: number): Vector2 {
    const angle = Math.random() * Math.PI * 2
    const distance = Math.sqrt(Math.random()) * radius
    return Vector2.fromAngle(angle, distance)
  }

  static randomInRectangle(width: number, height: number): Vector2 {
    return new Vector2(
      (Math.random() - 0.5) * width,
      (Math.random() - 0.5) * height
    )
  }

  // Serialization
  toJSON() {
    return { x: this.x, y: this.y }
  }

  static fromJSON(data: any): Vector2 {
    return new Vector2(data.x, data.y)
  }
}


