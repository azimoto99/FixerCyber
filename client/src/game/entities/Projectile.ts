// Projectile entity for combat
import { Vector2 } from '../utils/Vector2';

export class Projectile {
  public id: string;
  public position: Vector2;
  public velocity: Vector2;
  public damage: number;
  public damageType: string;
  public weapon: string;
  public ownerId: string;
  public lifetime: number;
  public maxLifetime: number;
  public size: number;
  public color: string;
  public trail: Vector2[] = [];
  public maxTrailLength: number = 10;

  constructor(
    id: string,
    position: Vector2,
    velocity: Vector2,
    damage: number,
    damageType: string,
    weapon: string,
    ownerId: string,
    lifetime: number = 2000
  ) {
    this.id = id;
    this.position = position;
    this.velocity = velocity;
    this.damage = damage;
    this.damageType = damageType;
    this.weapon = weapon;
    this.ownerId = ownerId;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.size = this.getSizeForWeapon(weapon);
    this.color = this.getColorForDamageType(damageType);
  }

  // Update projectile
  update(deltaTime: number): void {
    // Update position
    this.position = this.position.add(this.velocity.multiply(deltaTime / 1000));

    // Update trail
    this.trail.push(this.position.clone());
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }

    // Update lifetime
    this.lifetime -= deltaTime;
  }

  // Check if projectile is expired
  isExpired(): boolean {
    return this.lifetime <= 0;
  }

  // Get projectile bounds for collision detection
  getBounds(): { position: Vector2; size: Vector2 } {
    return {
      position: this.position.subtract(
        new Vector2(this.size / 2, this.size / 2)
      ),
      size: new Vector2(this.size, this.size),
    };
  }

  // Get projectile direction
  getDirection(): Vector2 {
    return this.velocity.normalize();
  }

  // Get projectile speed
  getSpeed(): number {
    return this.velocity.magnitude;
  }

  // Get projectile angle
  getAngle(): number {
    return this.velocity.angle;
  }

  // Get projectile lifetime percentage
  getLifetimePercentage(): number {
    return (this.lifetime / this.maxLifetime) * 100;
  }

  // Get projectile trail
  getTrail(): Vector2[] {
    return this.trail;
  }

  // Weapon-specific properties
  private getSizeForWeapon(weapon: string): number {
    const sizes = {
      pistol: 4,
      rifle: 6,
      smg: 3,
      cyber: 8,
      shotgun: 5,
      sniper: 8,
    };
    return sizes[weapon as keyof typeof sizes] || 4;
  }

  private getColorForDamageType(damageType: string): string {
    const colors = {
      kinetic: '#ffffff',
      energy: '#00ffff',
      emp: '#ff00ff',
      explosive: '#ff8800',
      poison: '#00ff00',
      fire: '#ff0000',
    };
    return colors[damageType as keyof typeof colors] || '#ffffff';
  }

  // Create projectile from weapon data
  static createFromWeapon(
    weapon: any,
    position: Vector2,
    direction: Vector2,
    ownerId: string
  ): Projectile {
    const speed = weapon.speed || 1000;
    const velocity = direction.normalize().multiply(speed);

    return new Projectile(
      Math.random().toString(36).substr(2, 9),
      position,
      velocity,
      weapon.damage || 25,
      weapon.damageType || 'kinetic',
      weapon.type || 'pistol',
      ownerId,
      weapon.lifetime || 2000
    );
  }

  // Create projectile from shooting data
  static createFromShooting(
    position: Vector2,
    target: Vector2,
    weapon: any,
    ownerId: string
  ): Projectile {
    const direction = target.subtract(position);
    const speed = weapon.speed || 1000;
    const velocity = direction.normalize().multiply(speed);

    return new Projectile(
      Math.random().toString(36).substr(2, 9),
      position,
      velocity,
      weapon.damage || 25,
      weapon.damageType || 'kinetic',
      weapon.type || 'pistol',
      ownerId,
      weapon.lifetime || 2000
    );
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      position: this.position.toJSON(),
      velocity: this.velocity.toJSON(),
      damage: this.damage,
      damageType: this.damageType,
      weapon: this.weapon,
      ownerId: this.ownerId,
      lifetime: this.lifetime,
      maxLifetime: this.maxLifetime,
      size: this.size,
      color: this.color,
      trail: this.trail.map(point => point.toJSON()),
    };
  }

  static fromJSON(data: any): Projectile {
    const projectile = new Projectile(
      data.id,
      Vector2.fromJSON(data.position),
      Vector2.fromJSON(data.velocity),
      data.damage,
      data.damageType,
      data.weapon,
      data.ownerId,
      data.maxLifetime
    );

    projectile.lifetime = data.lifetime;
    projectile.size = data.size;
    projectile.color = data.color;
    projectile.trail = data.trail.map((point: any) => Vector2.fromJSON(point));

    return projectile;
  }
}
