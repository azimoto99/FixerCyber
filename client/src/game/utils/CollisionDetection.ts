// Collision detection utilities
import { Vector2 } from './Vector2';

export class CollisionDetection {
  // Point vs Circle
  static pointInCircle(
    point: Vector2,
    center: Vector2,
    radius: number
  ): boolean {
    return point.distanceSquaredTo(center) <= radius * radius;
  }

  // Point vs Rectangle
  static pointInRectangle(
    point: Vector2,
    rect: { position: Vector2; size: Vector2 }
  ): boolean {
    return (
      point.x >= rect.position.x &&
      point.x <= rect.position.x + rect.size.x &&
      point.y >= rect.position.y &&
      point.y <= rect.position.y + rect.size.y
    );
  }

  // Circle vs Circle
  static circleCollision(
    center1: Vector2,
    radius1: number,
    center2: Vector2,
    radius2: number
  ): boolean {
    const distance = center1.distanceTo(center2);
    return distance <= radius1 + radius2;
  }

  // Rectangle vs Rectangle
  static rectangleCollision(
    rect1: { position: Vector2; size: Vector2 },
    rect2: { position: Vector2; size: Vector2 }
  ): boolean {
    return (
      rect1.position.x < rect2.position.x + rect2.size.x &&
      rect1.position.x + rect1.size.x > rect2.position.x &&
      rect1.position.y < rect2.position.y + rect2.size.y &&
      rect1.position.y + rect1.size.y > rect2.position.y
    );
  }

  // Circle vs Rectangle
  static circleRectangleCollision(
    center: Vector2,
    radius: number,
    rect: { position: Vector2; size: Vector2 }
  ): boolean {
    const closestX = Math.max(
      rect.position.x,
      Math.min(center.x, rect.position.x + rect.size.x)
    );
    const closestY = Math.max(
      rect.position.y,
      Math.min(center.y, rect.position.y + rect.size.y)
    );

    const distanceX = center.x - closestX;
    const distanceY = center.y - closestY;

    return distanceX * distanceX + distanceY * distanceY <= radius * radius;
  }

  // Line vs Circle
  static lineCircleCollision(
    start: Vector2,
    end: Vector2,
    center: Vector2,
    radius: number
  ): boolean {
    const lineLength = start.distanceTo(end);
    if (lineLength === 0) {
      return center.distanceTo(start) <= radius;
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        center.subtract(start).dot(end.subtract(start)) /
          (lineLength * lineLength)
      )
    );

    const projection = start.add(end.subtract(start).multiply(t));
    return projection.distanceTo(center) <= radius;
  }

  // Line vs Rectangle
  static lineRectangleCollision(
    start: Vector2,
    end: Vector2,
    rect: { position: Vector2; size: Vector2 }
  ): boolean {
    // Check if line endpoints are inside rectangle
    if (
      this.pointInRectangle(start, rect) ||
      this.pointInRectangle(end, rect)
    ) {
      return true;
    }

    // Check if line intersects with any of the rectangle's edges
    const edges = [
      {
        start: rect.position,
        end: new Vector2(rect.position.x + rect.size.x, rect.position.y),
      },
      {
        start: new Vector2(rect.position.x + rect.size.x, rect.position.y),
        end: new Vector2(
          rect.position.x + rect.size.x,
          rect.position.y + rect.size.y
        ),
      },
      {
        start: new Vector2(
          rect.position.x + rect.size.x,
          rect.position.y + rect.size.y
        ),
        end: new Vector2(rect.position.x, rect.position.y + rect.size.y),
      },
      {
        start: new Vector2(rect.position.x, rect.position.y + rect.size.y),
        end: rect.position,
      },
    ];

    for (const edge of edges) {
      if (this.lineLineCollision(start, end, edge.start, edge.end)) {
        return true;
      }
    }

    return false;
  }

  // Line vs Line
  static lineLineCollision(
    start1: Vector2,
    end1: Vector2,
    start2: Vector2,
    end2: Vector2
  ): boolean {
    const x1 = start1.x,
      y1 = start1.y;
    const x2 = end1.x,
      y2 = end1.y;
    const x3 = start2.x,
      y3 = start2.y;
    const x4 = end2.x,
      y4 = end2.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom === 0) return false;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  // Ray vs Circle
  static rayCircleCollision(
    origin: Vector2,
    direction: Vector2,
    center: Vector2,
    radius: number
  ): { hit: boolean; distance?: number } {
    const oc = origin.subtract(center);
    const a = direction.dot(direction);
    const b = 2 * oc.dot(direction);
    const c = oc.dot(oc) - radius * radius;

    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return { hit: false };
    }

    const distance = (-b - Math.sqrt(discriminant)) / (2 * a);
    return { hit: distance >= 0, distance };
  }

  // Ray vs Rectangle
  static rayRectangleCollision(
    origin: Vector2,
    direction: Vector2,
    rect: { position: Vector2; size: Vector2 }
  ): { hit: boolean; distance?: number; normal?: Vector2 } {
    const t1 = (rect.position.x - origin.x) / direction.x;
    const t2 = (rect.position.x + rect.size.x - origin.x) / direction.x;
    const t3 = (rect.position.y - origin.y) / direction.y;
    const t4 = (rect.position.y + rect.size.y - origin.y) / direction.y;

    const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
    const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));

    if (tmax < 0 || tmin > tmax) {
      return { hit: false };
    }

    const distance = tmin > 0 ? tmin : tmax;
    const hitPoint = origin.add(direction.multiply(distance));

    // Calculate normal
    let normal = new Vector2(0, 0);
    if (Math.abs(hitPoint.x - rect.position.x) < 0.1)
      normal = new Vector2(-1, 0);
    else if (Math.abs(hitPoint.x - (rect.position.x + rect.size.x)) < 0.1)
      normal = new Vector2(1, 0);
    else if (Math.abs(hitPoint.y - rect.position.y) < 0.1)
      normal = new Vector2(0, -1);
    else if (Math.abs(hitPoint.y - (rect.position.y + rect.size.y)) < 0.1)
      normal = new Vector2(0, 1);

    return { hit: true, distance, normal };
  }

  // Spatial partitioning helpers
  static getGridCell(position: Vector2, cellSize: number): Vector2 {
    return new Vector2(
      Math.floor(position.x / cellSize),
      Math.floor(position.y / cellSize)
    );
  }

  static getGridBounds(
    position: Vector2,
    size: Vector2,
    cellSize: number
  ): {
    min: Vector2;
    max: Vector2;
  } {
    const min = this.getGridCell(position, cellSize);
    const max = this.getGridCell(position.add(size), cellSize);
    return { min, max };
  }

  // Utility methods
  static getCollisionResponse(
    object1: { position: Vector2; velocity: Vector2; mass: number },
    object2: { position: Vector2; velocity: Vector2; mass: number }
  ): { velocity1: Vector2; velocity2: Vector2 } {
    const relativeVelocity = object1.velocity.subtract(object2.velocity);
    const relativePosition = object1.position.subtract(object2.position);
    const distance = relativePosition.magnitude;

    if (distance === 0)
      return { velocity1: object1.velocity, velocity2: object2.velocity };

    const normal = relativePosition.divide(distance);
    const relativeSpeed = relativeVelocity.dot(normal);

    if (relativeSpeed > 0)
      return { velocity1: object1.velocity, velocity2: object2.velocity };

    const restitution = 0.8; // Elasticity
    const impulse =
      (-(1 + restitution) * relativeSpeed) /
      (1 / object1.mass + 1 / object2.mass);

    const velocity1 = object1.velocity.add(
      normal.multiply(impulse / object1.mass)
    );
    const velocity2 = object2.velocity.subtract(
      normal.multiply(impulse / object2.mass)
    );

    return { velocity1, velocity2 };
  }
}
