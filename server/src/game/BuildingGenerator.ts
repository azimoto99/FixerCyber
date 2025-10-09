import { v4 as uuidv4 } from 'uuid';
import {
    Building,
    BuildingInterior,
    Corridor,
    DistrictType,
    HackableObject,
    HackableObjectType,
    Room,
    RoomType,
    Vector2
} from '../types';

export class BuildingGenerator {
  private static readonly MIN_ROOM_SIZE = 3;
  private static readonly MAX_ROOM_SIZE = 8;
  private static readonly CORRIDOR_WIDTH = 2;

  /**
   * Generate procedural interior layout for a building
   */
  static generateBuildingInterior(building: Building, districtType: DistrictType, rng: () => number): BuildingInterior {
    const rooms = this.generateRooms(building, districtType, rng);
    const corridors = this.generateCorridors(building, rooms, rng);
    const hackableObjects = this.generateHackableObjects(building, rooms, districtType, rng);

    return {
      rooms,
      corridors,
      hackableObjects
    };
  }

  /**
   * Generate rooms within a building
   */
  private static generateRooms(building: Building, districtType: DistrictType, rng: () => number): Room[] {
    const rooms: Room[] = [];
    const buildingArea = building.size.x * building.size.y;
    const maxRooms = Math.min(Math.floor(buildingArea / 20), 12); // Limit based on building size
    const numRooms = Math.floor(rng() * maxRooms) + 2; // At least 2 rooms

    // Create a grid to track occupied space
    const grid = Array(building.size.x).fill(null).map(() => Array(building.size.y).fill(false));

    // Generate main lobby/entrance room first
    const lobbyRoom = this.generateLobbyRoom(building, grid, rng);
    if (lobbyRoom) {
      rooms.push(lobbyRoom);
      this.markRoomInGrid(grid, lobbyRoom);
    }

    // Generate additional rooms
    for (let i = 1; i < numRooms; i++) {
      const room = this.generateRoom(building, grid, districtType, rng);
      if (room) {
        rooms.push(room);
        this.markRoomInGrid(grid, room);
      }
    }

    return rooms;
  }

  /**
   * Generate lobby/entrance room
   */
  private static generateLobbyRoom(building: Building, grid: boolean[][], rng: () => number): Room | null {
    // Place lobby near the main entrance
    const entrance = building.entrances[0];
    const localEntranceX = Math.floor(entrance.x - building.position.x);
    const localEntranceY = Math.floor(entrance.y - building.position.y);

    const roomWidth = Math.min(Math.floor(rng() * 4) + 4, building.size.x - 2);
    const roomHeight = Math.min(Math.floor(rng() * 3) + 3, building.size.y - 2);

    // Try to place lobby near entrance
    let roomX = Math.max(0, Math.min(localEntranceX - Math.floor(roomWidth / 2), building.size.x - roomWidth));
    let roomY = Math.max(0, Math.min(localEntranceY - Math.floor(roomHeight / 2), building.size.y - roomHeight));

    // Ensure room fits within building bounds
    if (roomX + roomWidth > building.size.x) roomX = building.size.x - roomWidth;
    if (roomY + roomHeight > building.size.y) roomY = building.size.y - roomHeight;
    if (roomX < 0) roomX = 0;
    if (roomY < 0) roomY = 0;

    if (this.canPlaceRoom(grid, roomX, roomY, roomWidth, roomHeight)) {
      return {
        id: uuidv4(),
        type: RoomType.LOBBY,
        bounds: {
          x: roomX,
          y: roomY,
          width: roomWidth,
          height: roomHeight
        },
        connections: []
      };
    }

    return null;
  }

  /**
   * Generate a single room
   */
  private static generateRoom(building: Building, grid: boolean[][], districtType: DistrictType, rng: () => number): Room | null {
    const maxAttempts = 20;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const roomWidth = Math.floor(rng() * (this.MAX_ROOM_SIZE - this.MIN_ROOM_SIZE)) + this.MIN_ROOM_SIZE;
      const roomHeight = Math.floor(rng() * (this.MAX_ROOM_SIZE - this.MIN_ROOM_SIZE)) + this.MIN_ROOM_SIZE;
      
      const roomX = Math.floor(rng() * (building.size.x - roomWidth));
      const roomY = Math.floor(rng() * (building.size.y - roomHeight));

      if (this.canPlaceRoom(grid, roomX, roomY, roomWidth, roomHeight)) {
        const roomType = this.selectRoomType(districtType, rng);
        
        return {
          id: uuidv4(),
          type: roomType,
          bounds: {
            x: roomX,
            y: roomY,
            width: roomWidth,
            height: roomHeight
          },
          connections: []
        };
      }
    }

    return null;
  }

  /**
   * Check if a room can be placed at the given position
   */
  private static canPlaceRoom(grid: boolean[][], x: number, y: number, width: number, height: number): boolean {
    // Check bounds
    if (x < 0 || y < 0 || x + width >= grid.length || y + height >= grid[0].length) {
      return false;
    }

    // Check for overlaps (with 1-tile buffer for corridors)
    for (let i = Math.max(0, x - 1); i < Math.min(grid.length, x + width + 1); i++) {
      for (let j = Math.max(0, y - 1); j < Math.min(grid[0].length, y + height + 1); j++) {
        if (grid[i][j]) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Mark room area in grid as occupied
   */
  private static markRoomInGrid(grid: boolean[][], room: Room): void {
    for (let x = room.bounds.x; x < room.bounds.x + room.bounds.width; x++) {
      for (let y = room.bounds.y; y < room.bounds.y + room.bounds.height; y++) {
        if (x >= 0 && x < grid.length && y >= 0 && y < grid[0].length) {
          grid[x][y] = true;
        }
      }
    }
  }

  /**
   * Select appropriate room type based on district
   */
  private static selectRoomType(districtType: DistrictType, rng: () => number): RoomType {
    const roomTypesByDistrict = {
      [DistrictType.CORPORATE]: [RoomType.OFFICE, RoomType.OFFICE, RoomType.SERVER_ROOM, RoomType.SECURITY],
      [DistrictType.RESIDENTIAL]: [RoomType.BEDROOM, RoomType.KITCHEN, RoomType.BATHROOM, RoomType.STORAGE],
      [DistrictType.INDUSTRIAL]: [RoomType.STORAGE, RoomType.OFFICE, RoomType.SECURITY],
      [DistrictType.UNDERGROUND]: [RoomType.STORAGE, RoomType.OFFICE, RoomType.SERVER_ROOM],
      [DistrictType.WASTELAND]: [RoomType.STORAGE, RoomType.BEDROOM, RoomType.OFFICE]
    };

    const availableTypes = roomTypesByDistrict[districtType] || [RoomType.OFFICE];
    return availableTypes[Math.floor(rng() * availableTypes.length)];
  }

  /**
   * Generate corridors connecting rooms
   */
  private static generateCorridors(building: Building, rooms: Room[], rng: () => number): Corridor[] {
    const corridors: Corridor[] = [];
    
    if (rooms.length < 2) return corridors;

    // Connect rooms using minimum spanning tree approach
    const connections = this.generateRoomConnections(rooms, rng);
    
    for (const connection of connections) {
      const room1 = rooms[connection.room1Index];
      const room2 = rooms[connection.room2Index];
      
      const corridor = this.createCorridor(room1, room2, rng);
      if (corridor) {
        corridors.push(corridor);
        
        // Update room connections
        room1.connections.push(room2.id);
        room2.connections.push(room1.id);
      }
    }

    return corridors;
  }

  /**
   * Generate room connections using a simplified MST approach
   */
  private static generateRoomConnections(rooms: Room[], rng: () => number): Array<{room1Index: number, room2Index: number}> {
    const connections: Array<{room1Index: number, room2Index: number}> = [];
    const connected = new Set<number>();
    
    if (rooms.length === 0) return connections;
    
    // Start with the first room (usually lobby)
    connected.add(0);
    
    while (connected.size < rooms.length) {
      let bestConnection: {room1Index: number, room2Index: number, distance: number} | null = null;
      
      // Find the closest unconnected room to any connected room
      for (const connectedIndex of connected) {
        for (let i = 0; i < rooms.length; i++) {
          if (!connected.has(i)) {
            const distance = this.getRoomDistance(rooms[connectedIndex], rooms[i]);
            if (!bestConnection || distance < bestConnection.distance) {
              bestConnection = {
                room1Index: connectedIndex,
                room2Index: i,
                distance
              };
            }
          }
        }
      }
      
      if (bestConnection) {
        connections.push({
          room1Index: bestConnection.room1Index,
          room2Index: bestConnection.room2Index
        });
        connected.add(bestConnection.room2Index);
      } else {
        break; // No more connections possible
      }
    }

    // Add some additional connections for more interesting layouts
    const additionalConnections = Math.floor(rng() * Math.max(1, rooms.length / 3));
    for (let i = 0; i < additionalConnections; i++) {
      const room1Index = Math.floor(rng() * rooms.length);
      const room2Index = Math.floor(rng() * rooms.length);
      
      if (room1Index !== room2Index) {
        // Check if connection already exists
        const exists = connections.some(conn => 
          (conn.room1Index === room1Index && conn.room2Index === room2Index) ||
          (conn.room1Index === room2Index && conn.room2Index === room1Index)
        );
        
        if (!exists) {
          connections.push({ room1Index, room2Index });
        }
      }
    }

    return connections;
  }

  /**
   * Calculate distance between two rooms
   */
  private static getRoomDistance(room1: Room, room2: Room): number {
    const center1 = {
      x: room1.bounds.x + room1.bounds.width / 2,
      y: room1.bounds.y + room1.bounds.height / 2
    };
    const center2 = {
      x: room2.bounds.x + room2.bounds.width / 2,
      y: room2.bounds.y + room2.bounds.height / 2
    };
    
    return Math.sqrt(Math.pow(center2.x - center1.x, 2) + Math.pow(center2.y - center1.y, 2));
  }

  /**
   * Create a corridor between two rooms
   */
  private static createCorridor(room1: Room, room2: Room, rng: () => number): Corridor | null {
    // Find connection points on room edges
    const connectionPoint1 = this.findRoomConnectionPoint(room1, room2);
    const connectionPoint2 = this.findRoomConnectionPoint(room2, room1);
    
    if (!connectionPoint1 || !connectionPoint2) return null;

    // Create L-shaped corridor
    const corridorId = uuidv4();
    
    return {
      id: corridorId,
      start: connectionPoint1,
      end: connectionPoint2,
      width: this.CORRIDOR_WIDTH
    };
  }

  /**
   * Find the best connection point on a room's edge toward another room
   */
  private static findRoomConnectionPoint(fromRoom: Room, toRoom: Room): Vector2 | null {
    const fromCenter = {
      x: fromRoom.bounds.x + fromRoom.bounds.width / 2,
      y: fromRoom.bounds.y + fromRoom.bounds.height / 2
    };
    const toCenter = {
      x: toRoom.bounds.x + toRoom.bounds.width / 2,
      y: toRoom.bounds.y + toRoom.bounds.height / 2
    };

    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    // Determine which edge of the room to connect from
    if (Math.abs(dx) > Math.abs(dy)) {
      // Connect from left or right edge
      if (dx > 0) {
        // Connect from right edge
        return {
          x: fromRoom.bounds.x + fromRoom.bounds.width,
          y: fromCenter.y
        };
      } else {
        // Connect from left edge
        return {
          x: fromRoom.bounds.x,
          y: fromCenter.y
        };
      }
    } else {
      // Connect from top or bottom edge
      if (dy > 0) {
        // Connect from bottom edge
        return {
          x: fromCenter.x,
          y: fromRoom.bounds.y + fromRoom.bounds.height
        };
      } else {
        // Connect from top edge
        return {
          x: fromCenter.x,
          y: fromRoom.bounds.y
        };
      }
    }
  }

  /**
   * Generate hackable objects within rooms
   */
  private static generateHackableObjects(
    building: Building, 
    rooms: Room[], 
    districtType: DistrictType, 
    rng: () => number
  ): HackableObject[] {
    const hackableObjects: HackableObject[] = [];
    
    for (const room of rooms) {
      const objectsInRoom = this.generateHackableObjectsForRoom(room, districtType, rng);
      hackableObjects.push(...objectsInRoom);
    }

    return hackableObjects;
  }

  /**
   * Generate hackable objects for a specific room
   */
  private static generateHackableObjectsForRoom(
    room: Room, 
    districtType: DistrictType, 
    rng: () => number
  ): HackableObject[] {
    const objects: HackableObject[] = [];
    const roomArea = room.bounds.width * room.bounds.height;
    const maxObjects = Math.min(Math.floor(roomArea / 8), 4); // Limit based on room size
    const numObjects = Math.floor(rng() * maxObjects) + 1;

    const availableObjectTypes = this.getHackableObjectTypesForRoom(room.type, districtType);
    
    for (let i = 0; i < numObjects; i++) {
      const objectType = availableObjectTypes[Math.floor(rng() * availableObjectTypes.length)];
      const position = this.findObjectPosition(room, rng);
      
      if (position) {
        objects.push({
          id: uuidv4(),
          type: objectType,
          position,
          securityLevel: this.getObjectSecurityLevel(objectType, districtType, rng),
          data: this.generateObjectData(objectType, districtType, rng)
        });
      }
    }

    return objects;
  }

  /**
   * Get available hackable object types for a room type and district
   */
  private static getHackableObjectTypesForRoom(roomType: RoomType, districtType: DistrictType): HackableObjectType[] {
    const baseTypes: Record<RoomType, HackableObjectType[]> = {
      [RoomType.OFFICE]: [HackableObjectType.COMPUTER, HackableObjectType.PHONE, HackableObjectType.TERMINAL],
      [RoomType.SERVER_ROOM]: [HackableObjectType.TERMINAL, HackableObjectType.COMPUTER],
      [RoomType.SECURITY]: [HackableObjectType.TERMINAL, HackableObjectType.CAMERA, HackableObjectType.DOOR_LOCK],
      [RoomType.LOBBY]: [HackableObjectType.PHONE, HackableObjectType.ELEVATOR, HackableObjectType.DOOR_LOCK],
      [RoomType.BEDROOM]: [HackableObjectType.PHONE, HackableObjectType.COMPUTER],
      [RoomType.KITCHEN]: [HackableObjectType.PHONE],
      [RoomType.BATHROOM]: [],
      [RoomType.STORAGE]: [HackableObjectType.DOOR_LOCK]
    };

    let availableTypes = baseTypes[roomType] || [];

    // Add district-specific objects
    if (districtType === DistrictType.CORPORATE) {
      availableTypes = [...availableTypes, HackableObjectType.TERMINAL];
    } else if (districtType === DistrictType.UNDERGROUND) {
      availableTypes = [...availableTypes, HackableObjectType.COMPUTER];
    }

    return availableTypes.length > 0 ? availableTypes : [HackableObjectType.COMPUTER];
  }

  /**
   * Find a suitable position for an object within a room
   */
  private static findObjectPosition(room: Room, rng: () => number): Vector2 | null {
    // Place objects along walls, not in the center
    const wallPositions: Vector2[] = [];
    
    // Top and bottom walls
    for (let x = room.bounds.x + 1; x < room.bounds.x + room.bounds.width - 1; x++) {
      wallPositions.push({ x, y: room.bounds.y + 1 }); // Top wall
      wallPositions.push({ x, y: room.bounds.y + room.bounds.height - 2 }); // Bottom wall
    }
    
    // Left and right walls
    for (let y = room.bounds.y + 1; y < room.bounds.y + room.bounds.height - 1; y++) {
      wallPositions.push({ x: room.bounds.x + 1, y }); // Left wall
      wallPositions.push({ x: room.bounds.x + room.bounds.width - 2, y }); // Right wall
    }

    if (wallPositions.length === 0) {
      // Fallback to center if room is too small
      return {
        x: room.bounds.x + Math.floor(room.bounds.width / 2),
        y: room.bounds.y + Math.floor(room.bounds.height / 2)
      };
    }

    return wallPositions[Math.floor(rng() * wallPositions.length)];
  }

  /**
   * Get security level for an object based on type and district
   */
  private static getObjectSecurityLevel(objectType: HackableObjectType, districtType: DistrictType, rng: () => number): number {
    const baseSecurityLevels = {
      [HackableObjectType.PHONE]: 1,
      [HackableObjectType.COMPUTER]: 2,
      [HackableObjectType.TERMINAL]: 3,
      [HackableObjectType.CAMERA]: 2,
      [HackableObjectType.DOOR_LOCK]: 1,
      [HackableObjectType.ELEVATOR]: 2
    };

    const districtModifiers = {
      [DistrictType.CORPORATE]: 2,
      [DistrictType.INDUSTRIAL]: 1,
      [DistrictType.RESIDENTIAL]: 0,
      [DistrictType.UNDERGROUND]: 1,
      [DistrictType.WASTELAND]: -1
    };

    const baseLevel = baseSecurityLevels[objectType] || 1;
    const districtModifier = districtModifiers[districtType] || 0;
    const randomVariation = Math.floor(rng() * 3) - 1; // -1, 0, or 1

    return Math.max(1, Math.min(5, baseLevel + districtModifier + randomVariation));
  }

  /**
   * Generate object-specific data
   */
  private static generateObjectData(objectType: HackableObjectType, districtType: DistrictType, rng: () => number): any {
    switch (objectType) {
      case HackableObjectType.PHONE:
        return {
          contacts: Math.floor(rng() * 10) + 5,
          hasVoicemail: rng() > 0.5,
          encryptionLevel: Math.floor(rng() * 3) + 1
        };
      
      case HackableObjectType.COMPUTER:
        return {
          files: Math.floor(rng() * 20) + 10,
          hasDatabase: rng() > 0.7,
          operatingSystem: rng() > 0.5 ? 'CyberOS' : 'NeuroNet',
          encryptionLevel: Math.floor(rng() * 4) + 1
        };
      
      case HackableObjectType.TERMINAL:
        return {
          accessLevel: Math.floor(rng() * 5) + 1,
          connectedSystems: Math.floor(rng() * 5) + 2,
          hasAdminAccess: rng() > 0.8,
          encryptionLevel: Math.floor(rng() * 5) + 2
        };
      
      case HackableObjectType.CAMERA:
        return {
          recordingDuration: Math.floor(rng() * 72) + 24, // 24-96 hours
          hasMotionDetection: rng() > 0.3,
          hasNightVision: rng() > 0.6,
          encryptionLevel: Math.floor(rng() * 3) + 1
        };
      
      case HackableObjectType.DOOR_LOCK:
        return {
          lockType: rng() > 0.5 ? 'electronic' : 'biometric',
          hasBackupKey: rng() > 0.7,
          encryptionLevel: Math.floor(rng() * 3) + 1
        };
      
      case HackableObjectType.ELEVATOR:
        return {
          floors: Math.floor(rng() * 20) + 5,
          hasMaintenanceAccess: rng() > 0.8,
          hasEmergencyOverride: rng() > 0.9,
          encryptionLevel: Math.floor(rng() * 4) + 2
        };
      
      default:
        return {
          encryptionLevel: Math.floor(rng() * 3) + 1
        };
    }
  }

  /**
   * Validate building interior layout
   */
  static validateBuildingInterior(interior: BuildingInterior): boolean {
    // Check that all rooms are connected
    if (interior.rooms.length === 0) return false;
    
    // Check that there are corridors if there are multiple rooms
    if (interior.rooms.length > 1 && interior.corridors.length === 0) return false;
    
    // Check that all rooms have valid bounds
    for (const room of interior.rooms) {
      if (room.bounds.width <= 0 || room.bounds.height <= 0) return false;
    }
    
    return true;
  }

  /**
   * Get building entrance navigation points
   */
  static generateEntranceNavigation(building: Building): Vector2[] {
    const navigationPoints: Vector2[] = [];
    
    for (const entrance of building.entrances) {
      // Add points leading to the entrance
      const approachPoints = this.generateApproachPoints(entrance, building);
      navigationPoints.push(...approachPoints);
    }
    
    return navigationPoints;
  }

  /**
   * Generate approach points for building entrances
   */
  private static generateApproachPoints(entrance: Vector2, building: Building): Vector2[] {
    const points: Vector2[] = [];
    
    // Add the entrance itself
    points.push(entrance);
    
    // Add points in front of the entrance
    const directions = [
      { x: 0, y: -2 }, // North
      { x: 2, y: 0 },  // East
      { x: 0, y: 2 },  // South
      { x: -2, y: 0 }  // West
    ];
    
    for (const dir of directions) {
      const approachPoint = {
        x: entrance.x + dir.x,
        y: entrance.y + dir.y
      };
      
      // Check if approach point is outside the building
      if (approachPoint.x < building.position.x || 
          approachPoint.x >= building.position.x + building.size.x ||
          approachPoint.y < building.position.y || 
          approachPoint.y >= building.position.y + building.size.y) {
        points.push(approachPoint);
      }
    }
    
    return points;
  }
}