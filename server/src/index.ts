import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import configuration
import config from './config';

// Import middleware
import { generalRateLimit } from './middleware/rateLimiting';
import { requestLogger, requestSizeLimit, sanitizeInput, validateRequest } from './middleware/security';

// Import routes
import authRoutes from './routes/auth';
import contractRoutes from './routes/contracts';
import playerRoutes from './routes/players';
import worldRoutes from './routes/world';

// Import services
import { GameServer } from './game/GameServer';
import { Logger } from './utils/logger';

// Initialize logger
const logger = Logger.getInstance();

const app = express();
const server = createServer(app);

// Enhanced Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: config.clientUrls,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: config.socketio.pingTimeout,
  pingInterval: config.socketio.pingInterval,
  maxHttpBufferSize: config.socketio.maxHttpBufferSize,
});

// Initialize Prisma
const prisma = new PrismaClient();

// Trust proxy if configured (for proper IP detection behind load balancers)
if (config.security.trustProxy) {
  app.set('trust proxy', true);
}

// Security middleware (applied first)
app.use(helmet({
  contentSecurityPolicy: config.isDevelopment ? false : undefined,
  crossOriginEmbedderPolicy: false, // Allow game assets
}));

app.use(requestLogger);
app.use(sanitizeInput);
app.use(validateRequest);
app.use(requestSizeLimit());

// CORS configuration
app.use(cors({
  origin: config.clientUrls,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json({ limit: config.security.maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: config.security.maxRequestSize }));

// Rate limiting middleware
app.use(generalRateLimit);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/world', worldRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize game server
const gameServer = new GameServer(io, prisma);

// Socket.io connection handling
io.on('connection', socket => {
  console.log('Player connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    gameServer.handlePlayerDisconnect(socket.id);
  });

  // Game events
  socket.on('player:move', data => {
    gameServer.handlePlayerMovement(socket.id, data);
  });

  socket.on('player:action', data => {
    gameServer.handlePlayerAction(socket.id, data);
  });

  socket.on('contract:accept', data => {
    gameServer.handleContractAccept(socket.id, data);
  });

  socket.on('contract:complete', data => {
    gameServer.handleContractComplete(socket.id, data);
  });
});

// Error handling
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  }
);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Fixer server running on port ${PORT}`);
  console.log(
    `🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`
  );
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
