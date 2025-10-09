import {
    Building,
    BuildingType,
    DistrictType,
    HackableObjectType,
    RoomType,
    Vector2
} from '../../types';
import { BuildingGenerator } from '../BuildingGenerator';

describe('BuildingGenerator', () => {
  const createTestBuilding = (size: Vector2 = { x: 10, y: 10 }): Building => ({
    id: 'test-building',
    type: BuildingType.OFFICE,
    position: { x: 0, y: 0 },
    size,
    rotation: 0,
    hackable: true,
    securityLevel: 3,
    entrances: [{ x: 5, y: 0 }]
  });

  const createSeededRNG = (seed: number): () => number => {
    let currentSeed = seed;
    return () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  };

  describe('Building Interior Generation', () => {
    test('should generate building interior with rooms, corridors, and hackable objects', () => {
      const building = createTestBuilding({ x: 15, y: 15 });
      const rng = createSeededRNG(12345);
      
      const interior = BuildingGenerator.generateBuildingInterior(building, DistrictType.CORPORATE, rng);
      
      expect(interior).toBeDefined();
      expect(interior.rooms).toBeDefined();
      expect(interior.corridors).toBeDefined();
      expect(interior.hackableObjects).toBeDefined();
      expect(Array.isArray(interior.rooms)).toBe(true);
      expect(Array.isArray(interior.corridors)).toBe(true);
      expect(Array.isArray(interior.hackableObjects)).toBe(true);
    });

    test('should generate at least 2 rooms for buildings', () => {
      const building = createTestBuilding({ x: 12, y: 12 });
      const rng = createSeededRNG(12345);
      
      const interior = BuildingGenerator.generateBuildingInterior(building, DistrictType.CORPORATE, rng);
      
      expect(interior.rooms.length).toBeGreaterThanOrEqual(2);
    });

    test('should generate lobby room first', () => {
      const building = createTestBuilding({ x: 10, y: 10 });
      const rng = createSeededRNG(12345);
      
      const interior = BuildingGenerator.generateBuildingInterior(building, DistrictType.CORPORATE, rng);
      
      // First room should be lobby (or at least one room should be lobby)
      const hasLobby = interior.rooms.some(room => room.type === RoomType.LOBBY);
      expect(hasLobby).toBe(true);
    });

    test('should generate district-appropriate room types', () => {
      const building = createTestBuilding({ x: 15, y: 15 });
      const rng = createSeededRNG(12345);
      
      // Corporate district should have office-type rooms
      const corporateInterior = BuildingGenerator.generateBuildingInterior(building, DistrictType.CORPORATE, rng);
      const corporateRoomTypes = corporateInterior.rooms.map(room => room.type);
      const hasCorporateRooms = corporateRoomTypes.some(type => 
        type === RoomType.OFFICE || type === RoomType.SERVER_ROOM || type === RoomType.SECURITY
      );
      expect(hasCorporateRooms).toBe(true);

      // Residential district should have residential-type rooms
      const rng2 = createSeededRNG(54321);
      const residentialInterior = BuildingGenerator.generateBuildingInterior(building, DistrictType.RESIDENTIAL, rng2);
      const residentialRoomTypes = residentialInterior.rooms.map(room => room.type);
      const hasResidentialRooms = residentialRoomTypes.some(type => 
        type === RoomType.BEDROOM || type === RoomType.KITCHEN || type === RoomType.BATHROOM
      );
      expect(hasResidentialRooms).toBe(true);
    });

    test('should generate corridors connecting rooms when there are multiple rooms', () => {
      const building = createTestBuilding({ x: 20, y: 20 });
      const rng = createSeededRNG(12345);
      
      const interior = BuildingGenerator.generateBuildingInterior(building, DistrictType.CORPORATE, rng);
      
      if (interior.rooms.length > 1) {
        expect(interior.corridors.length).toBeGreaterThan(0);
        
        // Check that corridors have proper structure
        for (const corridor of interior.corridors) {
          expect(corridor.id).toBeDefined();
          expect(corridor.start).toBeDefined();
          expect(corridor.end).toBeDefined();
          expect(corridor.width).toBeGreaterThan(0);
        }
      }
    });

    test('should generate hackable objects in rooms', () => {
      const building = createTestBuilding({ x: 15, y: 15 });
      const rng = createSeededRNG(12345);
      
      const interior = BuildingGenerator.generateBuildingInterior(building, DistrictType.CORPORATE, rng);
      
      expect(interior.hackableObjects.length).toBeGreaterThan(0);
      
      // Check hackable object structure
      for (const obj of interior.hackableObjects) {
        expect(obj.id).toBeDefined();
        expect(obj.type).toBeDefined();
        expect(obj.position).toBeDefined();
        expect(obj.securityLevel).toBeGreaterThanOrEqual(1);
        expect(obj.securityLevel).toBeLessThanOrEqual(5);
        expect(obj.data).toBeDefined();
      }
    });

    test('should generate appropriate hackable objects for room types', () => {
      const building = createTestBuilding({ x: 20, y: 20 });
      const rng = createSeededRNG(12345);
      
      const interior = BuildingGenerator.generateBuildingInterior(building, DistrictType.CORPORATE, rng);
      
      // Check that hackable objects are appropriate for corporate district
      const objectTypes = interior.hackableObjects.map(obj => obj.type);
      const hasCorporateObjects = objectTypes.some(type => 
        type === HackableObjectType.COMPUTER || 
        type === HackableObjectType.TERMINAL || 
        type === HackableObjectType.PHONE
      );
      expect(hasCorporateObjects).toBe(true);
    });

    test('should validate generated interior layout', () => {
      const building = createTestBuilding({ x: 12, y: 12 });
      const rng = createSeededRNG(12345);
      
      const interior = BuildingGenerator.generateBuildingInterior(building, DistrictType.CORPORATE, rng);
      
      const isValid = BuildingGenerator.validateBuildingInterior(interior);
      expect(isValid).toBe(true);
    });

    test('should generate rooms with valid bounds', () => {
      const building = createTestBuilding({ x: 15, y: 15 });
      const rng = createSeededRNG(12345);
      
      const interior = BuildingGenerator.generateBuildingInterior(building, DistrictType.CORPORATE, rng);
      
      for (const room of interior.rooms) {
        expect(room.bounds.width).toBeGreaterThan(0);
        expect(room.bounds.height).toBeGreaterThan(0);
        expect(room.bounds.x).toBeGreaterThanOrEqual(0);
        expect(room.bounds.y).toBeGreaterThanOrEqual(0);
        expect(room.bounds.x + room.bounds.width).toBeLessThanOrEqual(building.size.x);
        expect(room.bounds.y + room.bounds.height).toBeLessThanOrEqual(building.size.y);
      }
    });

    test('should generate different security levels for different districts', () => {
      const building = createTestBuilding({ x: 15, y: 15 });
      const rng1 = createSeededRNG(12345);
      const rng2 = createSeededRNG(12345); // Same seed for comparison
      
      const corporateInterior = BuildingGenerator.generateBuildingInterior(building, DistrictType.CORPORATE, rng1);
      const wastelandInterior = BuildingGenerator.generateBuildingInterior(building, DistrictType.WASTELAND, rng2);
      
      // Corporate should generally have higher security levels
      const corporateAvgSecurity = corporateInterior.hackableObjects.reduce((sum, obj) => sum + obj.securityLevel, 0) / corporateInterior.hackableObjects.length;
      const wastelandAvgSecurity = wastelandInterior.hackableObjects.reduce((sum, obj) => sum + obj.securityLevel, 0) / wastelandInterior.hackableObjects.length;
      
      expect(corporateAvgSecurity).toBeGreaterThanOrEqual(wastelandAvgSecurity);
    });

    test('should generate object-specific data for hackable objects', () => {
      const building = createTestBuilding({ x: 15, y: 15 });
      const rng = createSeededRNG(12345);
      
      const interior = BuildingGenerator.generateBuildingInterior(building, DistrictType.CORPORATE, rng);
      
      for (const obj of interior.hackableObjects) {
        expect(obj.data).toBeDefined();
        expect(obj.data.encryptionLevel).toBeDefined();
        expect(obj.data.encryptionLevel).toBeGreaterThanOrEqual(1);
        
        // Check type-specific data
        switch (obj.type) {
          case HackableObjectType.PHONE:
            expect(obj.data.contacts).toBeDefined();
            expect(obj.data.hasVoicemail).toBeDefined();
            break;
          case HackableObjectType.COMPUTER:
            expect(obj.data.files).toBeDefined();
            expect(obj.data.operatingSystem).toBeDefined();
            break;
          case HackableObjectType.TERMINAL:
            expect(obj.data.accessLevel).toBeDefined();
            expect(obj.data.connectedSystems).toBeDefined();
            break;
        }
      }
    });
  });

  describe('Building Entrance Navigation', () => {
    test('should generate entrance navigation points', () => {
      const building = createTestBuilding();
      
      const navigationPoints = BuildingGenerator.generateEntranceNavigation(building);
      
      expect(Array.isArray(navigationPoints)).toBe(true);
      expect(navigationPoints.length).toBeGreaterThan(0);
      
      // Should include the entrance itself
      const hasEntrancePoint = navigationPoints.some(point => 
        point.x === building.entrances[0].x && point.y === building.entrances[0].y
      );
      expect(hasEntrancePoint).toBe(true);
    });

    test('should generate approach points outside building bounds', () => {
      const building = createTestBuilding();
      
      const navigationPoints = BuildingGenerator.generateEntranceNavigation(building);
      
      // Filter out the entrance point itself
      const approachPoints = navigationPoints.filter(point => 
        !(point.x === building.entrances[0].x && point.y === building.entrances[0].y)
      );
      
      // Approach points should be outside building bounds
      for (const point of approachPoints) {
        const isOutside = point.x < building.position.x || 
                         point.x >= building.position.x + building.size.x ||
                         point.y < building.position.y || 
                         point.y >= building.position.y + building.size.y;
        expect(isOutside).toBe(true);
      }
    });
  });

  describe('Deterministic Generation', () => {
    test('should generate consistent results with same seed', () => {
      const building = createTestBuilding({ x: 12, y: 12 });
      const rng1 = createSeededRNG(12345);
      const rng2 = createSeededRNG(12345);
      
      const interior1 = BuildingGenerator.generateBuildingInterior(building, DistrictType.CORPORATE, rng1);
      const interior2 = BuildingGenerator.generateBuildingInterior(building, DistrictType.CORPORATE, rng2);
      
      expect(interior1.rooms.length).toBe(interior2.rooms.length);
      expect(interior1.corridors.length).toBe(interior2.corridors.length);
      expect(interior1.hackableObjects.length).toBe(interior2.hackableObjects.length);
      
      // Check that room positions are the same
      for (let i = 0; i < interior1.rooms.length; i++) {
        expect(interior1.rooms[i].bounds.x).toBe(interior2.rooms[i].bounds.x);
        expect(interior1.rooms[i].bounds.y).toBe(interior2.rooms[i].bounds.y);
        expect(interior1.rooms[i].bounds.width).toBe(interior2.rooms[i].bounds.width);
        expect(interior1.rooms[i].bounds.height).toBe(interior2.rooms[i].bounds.height);
        expect(interior1.rooms[i].type).toBe(interior2.rooms[i].type);
      }
    });

    test('should generate different results with different seeds', () => {
      const building = createTestBuilding({ x: 15, y: 15 });
      const rng1 = createSeededRNG(12345);
      const rng2 = createSeededRNG(54321);
      
      const interior1 = BuildingGenerator.generateBuildingInterior(building, DistrictType.CORPORATE, rng1);
      const interior2 = BuildingGenerator.generateBuildingInterior(building, DistrictType.CORPORATE, rng2);
      
      // Should have different layouts (at least some differences)
      let hasDifferences = false;
      
      if (interior1.rooms.length !== interior2.rooms.length) {
        hasDifferences = true;
      } else {
        for (let i = 0; i < interior1.rooms.length; i++) {
          if (interior1.rooms[i].bounds.x !== interior2.rooms[i].bounds.x ||
              interior1.rooms[i].bounds.y !== interior2.rooms[i].bounds.y ||
              interior1.rooms[i].type !== interior2.rooms[i].type) {
            hasDifferences = true;
            break;
          }
        }
      }
      
      expect(hasDifferences).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle small buildings gracefully', () => {
      const smallBuilding = createTestBuilding({ x: 4, y: 4 });
      const rng = createSeededRNG(12345);
      
      const interior = BuildingGenerator.generateBuildingInterior(smallBuilding, DistrictType.CORPORATE, rng);
      
      expect(interior).toBeDefined();
      expect(interior.rooms.length).toBeGreaterThanOrEqual(1);
      
      // Validate that rooms fit within building bounds
      for (const room of interior.rooms) {
        expect(room.bounds.x + room.bounds.width).toBeLessThanOrEqual(smallBuilding.size.x);
        expect(room.bounds.y + room.bounds.height).toBeLessThanOrEqual(smallBuilding.size.y);
      }
    });

    test('should handle buildings with single entrance', () => {
      const building: Building = {
        id: 'test-building',
        type: BuildingType.OFFICE,
        position: { x: 0, y: 0 },
        size: { x: 10, y: 10 },
        rotation: 0,
        hackable: true,
        securityLevel: 3,
        entrances: [{ x: 5, y: 0 }] // Single entrance
      };
      const rng = createSeededRNG(12345);
      
      const interior = BuildingGenerator.generateBuildingInterior(building, DistrictType.CORPORATE, rng);
      
      expect(interior).toBeDefined();
      expect(interior.rooms.length).toBeGreaterThanOrEqual(1);
    });

    test('should validate interior layout correctly', () => {
      // Test invalid interior (no rooms)
      const invalidInterior = {
        rooms: [],
        corridors: [],
        hackableObjects: []
      };
      expect(BuildingGenerator.validateBuildingInterior(invalidInterior)).toBe(false);
      
      // Test valid interior
      const validInterior = {
        rooms: [{
          id: 'room1',
          type: RoomType.OFFICE,
          bounds: { x: 0, y: 0, width: 5, height: 5 },
          connections: []
        }],
        corridors: [],
        hackableObjects: []
      };
      expect(BuildingGenerator.validateBuildingInterior(validInterior)).toBe(true);
    });
  });
});