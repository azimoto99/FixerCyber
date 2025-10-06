import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Import routes
import authRoutes from './routes/auth'
import playerRoutes from './routes/players'
import contractRoutes from './routes/contracts'
import worldRoutes from './routes/world'

// Import services
import { GameServer } from './game/GameServer'
import { AuthService } from './services/AuthService'

// Load environment variables
dotenv.config()

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

// Initialize Prisma
const prisma = new PrismaClient()

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/players', playerRoutes)
app.use('/api/contracts', contractRoutes)
app.use('/api/world', worldRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Initialize game server
const gameServer = new GameServer(io, prisma)

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id)
  
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id)
    gameServer.handlePlayerDisconnect(socket.id)
  })

  // Game events
  socket.on('player:move', (data) => {
    gameServer.handlePlayerMovement(socket.id, data)
  })

  socket.on('player:action', (data) => {
    gameServer.handlePlayerAction(socket.id, data)
  })

  socket.on('contract:accept', (data) => {
    gameServer.handleContractAccept(socket.id, data)
  })

  socket.on('contract:complete', (data) => {
    gameServer.handleContractComplete(socket.id, data)
  })
})

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

// Start server
const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`🚀 Fixer server running on port ${PORT}`)
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL || "http://localhost:3000"}`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully')
  await prisma.$disconnect()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})



