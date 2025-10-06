import express from 'express'
import { ContractService } from '../services/ContractService'
import { authMiddleware } from '../middleware/auth'

const router = express.Router()
const contractService = new ContractService()

// Get available contracts
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const contracts = await contractService.getAvailableContracts(req.user.id)
    res.json(contracts)
  } catch (error) {
    console.error('Get contracts error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get player's active contracts
router.get('/active', authMiddleware, async (req: any, res) => {
  try {
    const contracts = await contractService.getPlayerContracts(req.user.id)
    res.json(contracts)
  } catch (error) {
    console.error('Get active contracts error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Accept a contract
router.post('/:contractId/accept', authMiddleware, async (req: any, res) => {
  try {
    const { contractId } = req.params
    
    const result = await contractService.acceptContract(req.user.id, contractId)
    
    if (result.success) {
      res.json({ message: 'Contract accepted', contract: result.contract })
    } else {
      res.status(400).json({ error: result.error })
    }
  } catch (error) {
    console.error('Accept contract error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Complete a contract
router.post('/:contractId/complete', authMiddleware, async (req: any, res) => {
  try {
    const { contractId } = req.params
    const { completionData } = req.body
    
    const result = await contractService.completeContract(req.user.id, contractId, completionData)
    
    if (result.success) {
      res.json({ 
        message: 'Contract completed', 
        reward: result.reward,
        player: result.player 
      })
    } else {
      res.status(400).json({ error: result.error })
    }
  } catch (error) {
    console.error('Complete contract error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Cancel a contract
router.post('/:contractId/cancel', authMiddleware, async (req: any, res) => {
  try {
    const { contractId } = req.params
    
    const result = await contractService.cancelContract(req.user.id, contractId)
    
    if (result.success) {
      res.json({ message: 'Contract cancelled' })
    } else {
      res.status(400).json({ error: result.error })
    }
  } catch (error) {
    console.error('Cancel contract error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router



