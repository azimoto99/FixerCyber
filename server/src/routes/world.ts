import express from 'express';
import { WorldService } from '../services/WorldService';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const worldService = new WorldService();

// Get world chunk
router.get('/chunk/:x/:y', authMiddleware, async (req: any, res) => {
  try {
    const { x, y } = req.params;
    const chunkX = parseInt(x);
    const chunkY = parseInt(y);

    if (isNaN(chunkX) || isNaN(chunkY)) {
      return res.status(400).json({ error: 'Invalid chunk coordinates' });
    }

    const chunk = await worldService.getChunk(chunkX, chunkY);

    if (chunk) {
      res.json(chunk);
    } else {
      res.status(404).json({ error: 'Chunk not found' });
    }
  } catch (error) {
    console.error('Get chunk error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get nearby players
router.get('/players/nearby', authMiddleware, async (req: any, res) => {
  try {
    const { x, y, radius = 1000 } = req.query;

    if (typeof x !== 'string' || typeof y !== 'string') {
      return res
        .status(400)
        .json({ error: 'x and y coordinates are required' });
    }

    const posX = parseFloat(x);
    const posY = parseFloat(y);
    const searchRadius = parseInt(radius as string) || 1000;

    if (isNaN(posX) || isNaN(posY)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const players = await worldService.getNearbyPlayers(
      posX,
      posY,
      searchRadius
    );
    res.json(players);
  } catch (error) {
    console.error('Get nearby players error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get world info
router.get('/info', authMiddleware, async (req: any, res) => {
  try {
    const worldInfo = await worldService.getWorldInfo();
    res.json(worldInfo);
  } catch (error) {
    console.error('Get world info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate new chunk
router.post('/chunk/:x/:y/generate', authMiddleware, async (req: any, res) => {
  try {
    const { x, y } = req.params;
    const chunkX = parseInt(x);
    const chunkY = parseInt(y);

    if (isNaN(chunkX) || isNaN(chunkY)) {
      return res.status(400).json({ error: 'Invalid chunk coordinates' });
    }

    const chunk = await worldService.generateChunk(chunkX, chunkY);

    if (chunk) {
      res.json(chunk);
    } else {
      res.status(500).json({ error: 'Failed to generate chunk' });
    }
  } catch (error) {
    console.error('Generate chunk error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
