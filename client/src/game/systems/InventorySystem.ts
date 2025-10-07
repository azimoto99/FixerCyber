// Enhanced inventory system for looter shooter

// Import loot types (compatible with LootSystem)
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
type WeaponType = 'pistol' | 'rifle' | 'smg' | 'shotgun' | 'cyber' | 'melee'
type ArmorType = 'helmet' | 'vest' | 'boots' | 'gloves' | 'cyberware'

interface LootItem {
  id: string
  name: string
  type: 'weapon' | 'armor' | 'item'
  rarity: Rarity
  value: number
  stackable: boolean
  maxStack: number
  description: string
  iconColor: string
}

interface WeaponItem extends LootItem {
  type: 'weapon'
  weaponType: WeaponType
  damage: number
  accuracy: number
  fireRate: number
  range: number
  durability: number
  ammoType: string
  specialEffect?: string
}

interface ArmorItem extends LootItem {
  type: 'armor'
  armorType: ArmorType
  protection: number
  durability: number
  resistances: {
    kinetic: number
    energy: number
    cyber: number
  }
  specialEffect?: string
}


interface InventorySlot {
  id: string
  item: LootItem | null
  quantity: number
  locked: boolean // For equipped items
}

interface EquippedGear {
  primaryWeapon: WeaponItem | null
  secondaryWeapon: WeaponItem | null
  melee: WeaponItem | null
  helmet: ArmorItem | null
  vest: ArmorItem | null
  boots: ArmorItem | null
  gloves: ArmorItem | null
  cyberware: ArmorItem | null
}

interface PlayerStats {
  maxHealth: number
  damage: number
  accuracy: number
  fireRate: number
  range: number
  protection: number
  resistances: {
    kinetic: number
    energy: number
    cyber: number
  }
  movementSpeed: number
  hackingBonus: number
}

// Simple event emitter implementation
class EventEmitter {
  private events: { [key: string]: Function[] } = {}

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(listener)
  }

  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args))
    }
  }
}

export class InventorySystem extends EventEmitter {
  private playerInventories: Map<string, InventorySlot[]> = new Map()
  private playerEquipment: Map<string, EquippedGear> = new Map()
  
  // Inventory constraints
  private readonly MAX_INVENTORY_SLOTS = 20
  
  // Base player stats (modified by equipment)
  private readonly BASE_STATS: PlayerStats = {
    maxHealth: 100,
    damage: 10, // Base melee damage
    accuracy: 50,
    fireRate: 1000,
    range: 100,
    protection: 0,
    resistances: { kinetic: 0, energy: 0, cyber: 0 },
    movementSpeed: 300,
    hackingBonus: 0
  }

  constructor() {
    super()
  }

  update(_deltaTime: number, _inputManager?: any) {
    // Could add auto-save, durability decay, etc.
  }

  // Initialize player inventory
  initializePlayerInventory(playerId: string): void {
    const inventory: InventorySlot[] = []
    
    for (let i = 0; i < this.MAX_INVENTORY_SLOTS; i++) {
      inventory.push({
        id: `slot_${i}`,
        item: null,
        quantity: 0,
        locked: false
      })
    }
    
    this.playerInventories.set(playerId, inventory)
    
    // Initialize empty equipment
    this.playerEquipment.set(playerId, {
      primaryWeapon: null,
      secondaryWeapon: null,
      melee: null,
      helmet: null,
      vest: null,
      boots: null,
      gloves: null,
      cyberware: null
    })
    
    console.log(`🎒 Initialized inventory for player ${playerId}`)
  }

  // Add item to inventory
  addItem(playerId: string, item: LootItem, quantity: number = 1): boolean {
    const inventory = this.playerInventories.get(playerId)
    if (!inventory) {
      console.log(`❌ No inventory found for player ${playerId}`)
      return false
    }

    // Check if item is stackable and already exists
    if (item.stackable) {
      const existingSlot = inventory.find(slot => 
        slot.item?.id === item.id && 
        slot.quantity < item.maxStack &&
        !slot.locked
      )
      
      if (existingSlot && existingSlot.item) {
        const spaceAvailable = existingSlot.item.maxStack - existingSlot.quantity
        const amountToAdd = Math.min(quantity, spaceAvailable)
        
        existingSlot.quantity += amountToAdd
        quantity -= amountToAdd
        
        if (quantity === 0) {
          this.emit('itemAdded', { playerId, item, quantity: amountToAdd, slotId: existingSlot.id })
          return true
        }
      }
    }

    // Find empty slot for remaining items
    while (quantity > 0) {
      const emptySlot = inventory.find(slot => slot.item === null && !slot.locked)
      
      if (!emptySlot) {
        console.log(`❌ Inventory full for player ${playerId}`)
        this.emit('inventoryFull', { playerId, item, quantity })
        return false
      }

      const amountToAdd = item.stackable ? Math.min(quantity, item.maxStack) : 1
      
      emptySlot.item = { ...item }
      emptySlot.quantity = amountToAdd
      quantity -= amountToAdd

      this.emit('itemAdded', { playerId, item, quantity: amountToAdd, slotId: emptySlot.id })
      
      if (!item.stackable) break
    }

    return true
  }

  // Remove item from inventory
  removeItem(playerId: string, slotId: string, quantity: number = 1): LootItem | null {
    const inventory = this.playerInventories.get(playerId)
    if (!inventory) return null

    const slot = inventory.find(s => s.id === slotId)
    if (!slot || !slot.item || slot.locked) return null

    const removedQuantity = Math.min(quantity, slot.quantity)
    const removedItem = { ...slot.item }
    
    slot.quantity -= removedQuantity

    if (slot.quantity <= 0) {
      slot.item = null
      slot.quantity = 0
    }

    this.emit('itemRemoved', { playerId, item: removedItem, quantity: removedQuantity, slotId })
    
    return removedItem
  }

  // Equip weapon or armor
  equipItem(playerId: string, slotId: string): boolean {
    const inventory = this.playerInventories.get(playerId)
    const equipment = this.playerEquipment.get(playerId)
    
    if (!inventory || !equipment) return false

    const slot = inventory.find(s => s.id === slotId)
    if (!slot || !slot.item) return false

    const item = slot.item

    // Determine equipment slot
    let equipSlot: keyof EquippedGear | null = null
    
    if (item.type === 'weapon') {
      const weapon = item as WeaponItem
      switch (weapon.weaponType) {
        case 'melee':
          equipSlot = 'melee'
          break
        case 'pistol':
        case 'smg':
          equipSlot = equipment.secondaryWeapon ? 'primaryWeapon' : 'secondaryWeapon'
          break
        case 'rifle':
        case 'shotgun':
        case 'cyber':
          equipSlot = 'primaryWeapon'
          break
      }
    } else if (item.type === 'armor') {
      const armor = item as ArmorItem
      equipSlot = armor.armorType as keyof EquippedGear
    }

    if (!equipSlot) return false

    // Unequip current item if any
    const currentEquipped = equipment[equipSlot] as LootItem
    if (currentEquipped) {
      this.unequipItem(playerId, equipSlot)
    }

    // Equip new item
    ;(equipment[equipSlot] as LootItem) = item
    slot.locked = true

    // Update player stats
    this.updatePlayerStats(playerId)

    console.log(`⚔️ ${playerId} equipped ${item.name}`)
    this.emit('itemEquipped', { playerId, item, equipSlot })
    
    return true
  }

  // Unequip item
  unequipItem(playerId: string, equipSlot: keyof EquippedGear): boolean {
    const inventory = this.playerInventories.get(playerId)
    const equipment = this.playerEquipment.get(playerId)
    
    if (!inventory || !equipment) return false

    const equippedItem = equipment[equipSlot] as LootItem
    if (!equippedItem) return false

    // Find the locked slot with this item
    const inventorySlot = inventory.find(slot => 
      slot.item?.id === equippedItem.id && slot.locked
    )
    
    if (inventorySlot) {
      inventorySlot.locked = false
    }

    // Remove from equipment
    ;(equipment[equipSlot] as LootItem | null) = null

    // Update player stats
    this.updatePlayerStats(playerId)

    console.log(`📤 ${playerId} unequipped ${equippedItem.name}`)
    this.emit('itemUnequipped', { playerId, item: equippedItem, equipSlot })
    
    return true
  }

  // Calculate total player stats from equipment
  private updatePlayerStats(playerId: string): void {
    const equipment = this.playerEquipment.get(playerId)
    if (!equipment) return

    const stats: PlayerStats = { ...this.BASE_STATS }
    
    // Apply weapon stats
    const primaryWeapon = equipment.primaryWeapon as WeaponItem
    if (primaryWeapon) {
      stats.damage = Math.max(stats.damage, primaryWeapon.damage)
      stats.accuracy = Math.max(stats.accuracy, primaryWeapon.accuracy)
      stats.fireRate = Math.min(stats.fireRate, primaryWeapon.fireRate) // Lower is better
      stats.range = Math.max(stats.range, primaryWeapon.range)
    }

    // Apply armor stats
    Object.values(equipment).forEach(item => {
      if (item?.type === 'armor') {
        const armor = item as ArmorItem
        stats.maxHealth += armor.protection * 2 // 2 health per protection point
        stats.protection += armor.protection
        stats.resistances.kinetic += armor.resistances.kinetic
        stats.resistances.energy += armor.resistances.energy
        stats.resistances.cyber += armor.resistances.cyber
      }
    })

    // Special cyberware bonuses
    const cyberware = equipment.cyberware as ArmorItem
    if (cyberware) {
      stats.hackingBonus += 25
      stats.movementSpeed += 50
    }

    this.emit('playerStatsUpdated', { playerId, stats })
  }

  // Get inventory for UI display
  getInventory(playerId: string): InventorySlot[] | null {
    return this.playerInventories.get(playerId) || null
  }

  // Get equipped gear
  getEquippedGear(playerId: string): EquippedGear | null {
    return this.playerEquipment.get(playerId) || null
  }

  // Check if inventory has space
  hasInventorySpace(playerId: string, item: LootItem, quantity: number = 1): boolean {
    const inventory = this.playerInventories.get(playerId)
    if (!inventory) return false

    if (item.stackable) {
      let remainingQuantity = quantity
      
      inventory.forEach(slot => {
        if (slot.item?.id === item.id && !slot.locked) {
          const spaceInStack = slot.item.maxStack - slot.quantity
          remainingQuantity -= spaceInStack
        }
      })

      if (remainingQuantity <= 0) return true

      const emptySlots = inventory.filter(slot => slot.item === null && !slot.locked).length
      const slotsNeeded = Math.ceil(remainingQuantity / item.maxStack)
      
      return emptySlots >= slotsNeeded
    } else {
      const emptySlots = inventory.filter(slot => slot.item === null && !slot.locked).length
      return emptySlots >= quantity
    }
  }

  // Clear player inventory (on death)
  clearPlayerInventory(playerId: string): void {
    this.playerInventories.delete(playerId)
    this.playerEquipment.delete(playerId)
    console.log(`🧯 Cleared inventory for player ${playerId}`)
  }

  // Handle inventory actions for compatibility
  handleInventoryAction(action: string, data: any, playerId: string): boolean {
    switch (action) {
      case 'equip':
        return this.equipItem(playerId, data.slotId)
      case 'unequip':
        return this.unequipItem(playerId, data.equipSlot)
      default:
        return false
    }
  }
}


