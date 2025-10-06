// Grid-based inventory system
import { EventEmitter } from 'events'
import { InventoryItem, ItemType, Vector2 } from '../../types/game'

export class InventorySystem extends EventEmitter {
  private inventory: Map<string, InventoryItem> = new Map()
  private gridWidth: number = 10
  private gridHeight: number = 6
  private grid: (string | null)[][] = []
  private equippedItems: Map<string, string> = new Map()

  constructor() {
    super()
    this.initializeGrid()
  }

  update(deltaTime: number) {
    // Update item states, durability, etc.
    this.updateItemStates(deltaTime)
  }

  private updateItemStates(deltaTime: number) {
    this.inventory.forEach((item, id) => {
      if (item.stats.durability !== undefined) {
        // Update durability based on usage
        // This would be called when items are used
      }
    })
  }

  private initializeGrid() {
    this.grid = Array(this.gridHeight).fill(null).map(() => Array(this.gridWidth).fill(null))
  }

  // Inventory management
  addItem(item: InventoryItem): boolean {
    if (this.inventory.has(item.id)) {
      return false // Item already exists
    }

    // Check if item fits in inventory
    const position = this.findItemPosition(item)
    if (!position) {
      this.emit('inventoryFull', { item })
      return false
    }

    // Place item in grid
    this.placeItemInGrid(item, position)
    this.inventory.set(item.id, item)
    
    this.emit('itemAdded', { item, position })
    return true
  }

  removeItem(itemId: string): boolean {
    const item = this.inventory.get(itemId)
    if (!item) return false

    // Remove from grid
    this.removeItemFromGrid(item)
    this.inventory.delete(itemId)
    
    // Remove from equipped items if equipped
    this.unequipItem(itemId)
    
    this.emit('itemRemoved', { item })
    return true
  }

  moveItem(itemId: string, newPosition: Vector2): boolean {
    const item = this.inventory.get(itemId)
    if (!item) return false

    // Check if new position is valid
    if (!this.canPlaceItemAt(item, newPosition)) {
      this.emit('invalidPosition', { item, position: newPosition })
      return false
    }

    // Remove from old position
    this.removeItemFromGrid(item)
    
    // Place at new position
    item.position = newPosition
    this.placeItemInGrid(item, newPosition)
    
    this.emit('itemMoved', { item, position: newPosition })
    return true
  }

  // Equipment system
  equipItem(itemId: string, slot: string): boolean {
    const item = this.inventory.get(itemId)
    if (!item) return false

    // Check if item can be equipped in this slot
    if (!this.canEquipInSlot(item, slot)) {
      this.emit('invalidSlot', { item, slot })
      return false
    }

    // Unequip current item in slot
    const currentItem = this.equippedItems.get(slot)
    if (currentItem) {
      this.unequipItem(currentItem)
    }

    // Equip new item
    this.equippedItems.set(slot, itemId)
    this.emit('itemEquipped', { item, slot })
    return true
  }

  unequipItem(itemId: string): boolean {
    const item = this.inventory.get(itemId)
    if (!item) return false

    // Find and remove from equipped items
    for (const [slot, equippedId] of this.equippedItems.entries()) {
      if (equippedId === itemId) {
        this.equippedItems.delete(slot)
        this.emit('itemUnequipped', { item, slot })
        return true
      }
    }

    return false
  }

  // Grid management
  private findItemPosition(item: InventoryItem): Vector2 | null {
    for (let y = 0; y <= this.gridHeight - item.gridSize.height; y++) {
      for (let x = 0; x <= this.gridWidth - item.gridSize.width; x++) {
        if (this.canPlaceItemAt(item, { x, y })) {
          return { x, y }
        }
      }
    }
    return null
  }

  private canPlaceItemAt(item: InventoryItem, position: Vector2): boolean {
    // Check bounds
    if (position.x < 0 || position.y < 0) return false
    if (position.x + item.gridSize.width > this.gridWidth) return false
    if (position.y + item.gridSize.height > this.gridHeight) return false

    // Check if all required cells are empty
    for (let y = position.y; y < position.y + item.gridSize.height; y++) {
      for (let x = position.x; x < position.x + item.gridSize.width; x++) {
        if (this.grid[y][x] !== null) {
          return false
        }
      }
    }

    return true
  }

  private placeItemInGrid(item: InventoryItem, position: Vector2) {
    for (let y = position.y; y < position.y + item.gridSize.height; y++) {
      for (let x = position.x; x < position.x + item.gridSize.width; x++) {
        this.grid[y][x] = item.id
      }
    }
  }

  private removeItemFromGrid(item: InventoryItem) {
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.grid[y][x] === item.id) {
          this.grid[y][x] = null
        }
      }
    }
  }

  private canEquipInSlot(item: InventoryItem, slot: string): boolean {
    const slotRequirements = {
      weapon: [ItemType.WEAPON],
      armor: [ItemType.ARMOR],
      augmentation: [ItemType.AUGMENTATION],
      utility: [ItemType.UTILITY]
    }

    const allowedTypes = slotRequirements[slot as keyof typeof slotRequirements]
    return allowedTypes ? allowedTypes.includes(item.type) : false
  }

  // Item usage
  useItem(itemId: string): boolean {
    const item = this.inventory.get(itemId)
    if (!item) return false

    switch (item.type) {
      case ItemType.CONSUMABLE:
        return this.useConsumable(item)
      case ItemType.AUGMENTATION:
        return this.useAugmentation(item)
      case ItemType.WEAPON:
        return this.useWeapon(item)
      default:
        return false
    }
  }

  private useConsumable(item: InventoryItem): boolean {
    // Apply consumable effects
    this.emit('consumableUsed', { item, effects: item.stats })
    
    // Remove item if it's a single-use consumable
    if (item.stats.durability === 1) {
      this.removeItem(item.id)
    } else if (item.stats.durability) {
      item.stats.durability -= 1
    }
    
    return true
  }

  private useAugmentation(item: InventoryItem): boolean {
    // Apply augmentation effects
    this.emit('augmentationUsed', { item, effects: item.stats })
    return true
  }

  private useWeapon(item: InventoryItem): boolean {
    // Weapon usage is handled by combat system
    this.emit('weaponUsed', { item })
    return true
  }

  // Search and filtering
  getItemsByType(type: ItemType): InventoryItem[] {
    return Array.from(this.inventory.values()).filter(item => item.type === type)
  }

  getEquippedItems(): Map<string, InventoryItem> {
    const equipped = new Map<string, InventoryItem>()
    
    for (const [slot, itemId] of this.equippedItems.entries()) {
      const item = this.inventory.get(itemId)
      if (item) {
        equipped.set(slot, item)
      }
    }
    
    return equipped
  }

  getItemAtPosition(position: Vector2): InventoryItem | null {
    const itemId = this.grid[position.y]?.[position.x]
    return itemId ? this.inventory.get(itemId) || null : null
  }

  getEmptySlots(): Vector2[] {
    const emptySlots: Vector2[] = []
    
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.grid[y][x] === null) {
          emptySlots.push({ x, y })
        }
      }
    }
    
    return emptySlots
  }

  // Getters
  getInventory(): InventoryItem[] {
    return Array.from(this.inventory.values())
  }

  getGrid(): (string | null)[][] {
    return this.grid
  }

  getGridSize(): Vector2 {
    return { x: this.gridWidth, y: this.gridHeight }
  }

  getTotalSlots(): number {
    return this.gridWidth * this.gridHeight
  }

  getUsedSlots(): number {
    return this.inventory.size
  }

  getFreeSlots(): number {
    return this.getTotalSlots() - this.getUsedSlots()
  }

  isFull(): boolean {
    return this.getFreeSlots() === 0
  }

  // Cleanup
  clearInventory() {
    this.inventory.clear()
    this.initializeGrid()
    this.equippedItems.clear()
  }
}


