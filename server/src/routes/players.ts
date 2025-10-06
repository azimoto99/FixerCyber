import express from 'express'
import { PlayerService } from '../services/PlayerService'
import { authMiddleware } from '../middleware/auth'

const router = express.Router()
const playerService = new PlayerService()

// Get player data
router.get('/me', authMiddleware, async (req: any, res) => {
  try {
    const player = await playerService.getPlayer(req.user.id)
    
    if (player) {
      res.json(player)
    } else {
      res.status(404).json({ error: 'Player not found' })
    }
  } catch (error) {
    console.error('Get player error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create new player character
router.post('/create', authMiddleware, async (req: any, res) => {
  try {
    const { username } = req.body
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' })
    }

    const player = await playerService.createPlayer(req.user.id, username)
    
    if (player) {
      res.status(201).json(player)
    } else {
      res.status(400).json({ error: 'Failed to create player' })
    }
  } catch (error) {
    console.error('Create player error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update player position
router.put('/position', authMiddleware, async (req: any, res) => {
  try {
    const { x, y } = req.body
    
    if (typeof x !== 'number' || typeof y !== 'number') {
      return res.status(400).json({ error: 'Valid x and y coordinates are required' })
    }

    const result = await playerService.updatePlayerPosition(req.user.id, x, y)
    
    if (result) {
      res.json({ success: true })
    } else {
      res.status(400).json({ error: 'Failed to update position' })
    }
  } catch (error) {
    console.error('Update position error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get player inventory
router.get('/inventory', authMiddleware, async (req: any, res) => {
  try {
    const inventory = await playerService.getPlayerInventory(req.user.id)
    res.json(inventory)
  } catch (error) {
    console.error('Get inventory error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update player inventory
router.put('/inventory', authMiddleware, async (req: any, res) => {
  try {
    const { items } = req.body
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' })
    }

    const result = await playerService.updatePlayerInventory(req.user.id, items)
    
    if (result) {
      res.json({ success: true })
    } else {
      res.status(400).json({ error: 'Failed to update inventory' })
    }
  } catch (error) {
    console.error('Update inventory error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router



