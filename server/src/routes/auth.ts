import express from 'express';
import { AuthService } from '../services/AuthService';

const router = express.Router();
const authService = new AuthService();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: 'Username, email, and password are required' });
    }

    const result = await authService.register(username, email, password);

    if (result.success) {
      res.status(201).json({
        message: 'User created successfully',
        user: result.user,
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: 'Username and password are required' });
    }

    const result = await authService.login(username, password);

    if (result.success) {
      res.json({
        message: 'Login successful',
        token: result.token,
        user: result.user,
      });
    } else {
      res.status(401).json({ error: result.error });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const result = await authService.verifyToken(token);

    if (result.success) {
      res.json({ user: result.user });
    } else {
      res.status(401).json({ error: result.error });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
