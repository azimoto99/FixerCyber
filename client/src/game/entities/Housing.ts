// Housing entity for player housing system
import { Vector2, HousingType } from '../../types/game'

export class Housing {
  public id: string
  public type: HousingType
  public district: string
  public position: Vector2
  public rentCost: number
  public ownerId: string | null
  public storage: any
  public features: any[]
  public isOccupied: boolean
  public rentDueDate: Date
  public rentPeriod: number // in days

  constructor(
    id: string,
    type: HousingType,
    district: string,
    position: Vector2,
    rentCost: number
  ) {
    this.id = id
    this.type = type
    this.district = district
    this.position = position
    this.rentCost = rentCost
    this.ownerId = null
    this.storage = this.createStorage(type)
    this.features = this.createFeatures(type)
    this.isOccupied = false
    this.rentDueDate = new Date()
    this.rentPeriod = 30 // 30 days
  }

  // Housing management
  purchase(playerId: string, cost: number): boolean {
    if (this.isOccupied) return false
    
    this.ownerId = playerId
    this.isOccupied = true
    this.rentDueDate = new Date(Date.now() + this.rentPeriod * 24 * 60 * 60 * 1000)
    return true
  }

  abandon(): boolean {
    if (!this.isOccupied) return false
    
    this.ownerId = null
    this.isOccupied = false
    this.storage = this.createStorage(this.type) // Reset storage
    return true
  }

  // Rent management
  payRent(amount: number): boolean {
    if (!this.isOccupied) return false
    if (amount < this.rentCost) return false
    
    this.rentDueDate = new Date(Date.now() + this.rentPeriod * 24 * 60 * 60 * 1000)
    return true
  }

  isRentOverdue(): boolean {
    return this.isOccupied && new Date() > this.rentDueDate
  }

  getDaysUntilRentDue(): number {
    if (!this.isOccupied) return 0
    const now = new Date()
    const diffTime = this.rentDueDate.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // Storage management
  getStorageCapacity(): number {
    return this.storage.capacity
  }

  getUsedStorage(): number {
    return this.storage.used
  }

  getFreeStorage(): number {
    return this.storage.capacity - this.storage.used
  }

  canStoreItem(item: any): boolean {
    return this.getFreeStorage() >= item.gridSize.x * item.gridSize.y
  }

  storeItem(item: any): boolean {
    if (!this.canStoreItem(item)) return false
    
    this.storage.used += item.gridSize.x * item.gridSize.y
    this.storage.items.push(item)
    return true
  }

  removeItem(itemId: string): any | null {
    const itemIndex = this.storage.items.findIndex((item: any) => item.id === itemId)
    if (itemIndex === -1) return null
    
    const item = this.storage.items[itemIndex]
    this.storage.used -= item.gridSize.x * item.gridSize.y
    this.storage.items.splice(itemIndex, 1)
    return item
  }

  getStoredItems(): any[] {
    return this.storage.items
  }

  // Features
  hasFeature(featureType: string): boolean {
    return this.features.some(feature => feature.type === featureType)
  }

  getFeatureLevel(featureType: string): number {
    const feature = this.features.find(f => f.type === featureType)
    return feature ? feature.level : 0
  }

  upgradeFeature(featureType: string, cost: number): boolean {
    const feature = this.features.find(f => f.type === featureType)
    if (!feature) return false
    
    feature.level += 1
    return true
  }

  // Housing types
  static getHousingTypes(): HousingType[] {
    return [
      HousingType.SLUM_APARTMENT,
      HousingType.RESIDENTIAL,
      HousingType.CORPORATE_SUITE
    ]
  }

  static getHousingTypeInfo(type: HousingType): any {
    const info = {
      [HousingType.SLUM_APARTMENT]: {
        baseRent: 500,
        storageCapacity: 20,
        features: ['basic_storage', 'save_point'],
        description: 'A small, cramped apartment in the underground'
      },
      [HousingType.RESIDENTIAL]: {
        baseRent: 1500,
        storageCapacity: 40,
        features: ['expanded_storage', 'save_point', 'workshop'],
        description: 'A decent apartment in the residential district'
      },
      [HousingType.CORPORATE_SUITE]: {
        baseRent: 5000,
        storageCapacity: 80,
        features: ['luxury_storage', 'save_point', 'workshop', 'medbay', 'security'],
        description: 'A luxurious suite in the corporate district'
      }
    }
    return info[type] || info[HousingType.SLUM_APARTMENT]
  }

  // Create storage based on housing type
  private createStorage(type: HousingType): any {
    const info = Housing.getHousingTypeInfo(type)
    return {
      capacity: info.storageCapacity,
      used: 0,
      items: []
    }
  }

  // Create features based on housing type
  private createFeatures(type: HousingType): any[] {
    const info = Housing.getHousingTypeInfo(type)
    return info.features.map((featureType: string) => ({
      type: featureType,
      level: 1,
      description: this.getFeatureDescription(featureType)
    }))
  }

  private getFeatureDescription(featureType: string): string {
    const descriptions = {
      basic_storage: 'Basic storage for items',
      expanded_storage: 'Expanded storage with better organization',
      luxury_storage: 'Luxury storage with climate control',
      save_point: 'Save your progress and respawn here',
      workshop: 'Craft and modify items',
      medbay: 'Heal and install augmentations',
      security: 'Enhanced security and protection'
    }
    return descriptions[featureType as keyof typeof descriptions] || 'Unknown feature'
  }

  // Utility methods
  getCenter(): Vector2 {
    // Vector2 is an interface, not a class, so return an object
    return {
      x: this.position.x + 50, // Assuming 100x100 building
      y: this.position.y + 50
    }
  }

  getDistanceTo(position: Vector2): number {
    const center = this.getCenter()
    // Calculate Euclidean distance manually
    const dx = center.x - position.x
    const dy = center.y - position.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  isNearby(position: Vector2, radius: number = 100): boolean {
    return this.getDistanceTo(position) <= radius
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      district: this.district,
      position: this.position.toJSON(),
      rentCost: this.rentCost,
      ownerId: this.ownerId,
      storage: this.storage,
      features: this.features,
      isOccupied: this.isOccupied,
      rentDueDate: this.rentDueDate.toISOString(),
      rentPeriod: this.rentPeriod
    }
  }

  static fromJSON(data: any): Housing {
    const housing = new Housing(
      data.id,
      data.type,
      data.district,
      // Vector2.fromJSON is not available, so parse manually
      { x: data.position.x, y: data.position.y },
      data.rentCost
    )
    
    housing.ownerId = data.ownerId
    housing.storage = data.storage
    housing.features = data.features
    housing.isOccupied = data.isOccupied
    housing.rentDueDate = new Date(data.rentDueDate)
    housing.rentPeriod = data.rentPeriod
    
    return housing
  }
}


