import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  isDevelopment: boolean;
  isProduction: boolean;
  
  // Database
  databaseUrl: string;
  
  // JWT
  jwtSecret: string;
  jwtExpiresIn: string;
  
  // CORS
  clientUrls: string[];
  
  // Rate limiting
  rateLimiting: {
    general: {
      windowMs: number;
      maxRequests: number;
    };
    auth: {
      windowMs: number;
      maxRequests: number;
    };
    gameActions: {
      windowMs: number;
      maxRequests: number;
    };
  };
  
  // Socket.io
  socketio: {
    pingTimeout: number;
    pingInterval: number;
    maxHttpBufferSize: number;
  };
  
  // Security
  security: {
    bcryptRounds: number;
    maxRequestSize: string;
    trustProxy: boolean;
  };
  
  // Game settings
  game: {
    maxPlayersPerChunk: number;
    chunkSize: number;
    worldUpdateInterval: number;
    playerSyncInterval: number;
  };
}

const config: ServerConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/fixer',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  
  // CORS
  clientUrls: [
    'https://www.fixer.gg',
    'https://fixer.gg',
    'http://localhost:3000',
    'http://localhost:5173', // Vite dev server
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
    ...(process.env.ADDITIONAL_CORS_ORIGINS ? process.env.ADDITIONAL_CORS_ORIGINS.split(',') : []),
  ],
  
  // Rate limiting
  rateLimiting: {
    general: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
    auth: {
      windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
      maxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5', 10),
    },
    gameActions: {
      windowMs: parseInt(process.env.GAME_RATE_LIMIT_WINDOW_MS || '1000', 10), // 1 second
      maxRequests: parseInt(process.env.GAME_RATE_LIMIT_MAX_REQUESTS || '10', 10),
    },
  },
  
  // Socket.io
  socketio: {
    pingTimeout: parseInt(process.env.SOCKETIO_PING_TIMEOUT || '60000', 10),
    pingInterval: parseInt(process.env.SOCKETIO_PING_INTERVAL || '25000', 10),
    maxHttpBufferSize: parseInt(process.env.SOCKETIO_MAX_HTTP_BUFFER_SIZE || '1048576', 10), // 1MB
  },
  
  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
    trustProxy: process.env.TRUST_PROXY === 'true',
  },
  
  // Game settings
  game: {
    maxPlayersPerChunk: parseInt(process.env.MAX_PLAYERS_PER_CHUNK || '50', 10),
    chunkSize: parseInt(process.env.CHUNK_SIZE || '64', 10),
    worldUpdateInterval: parseInt(process.env.WORLD_UPDATE_INTERVAL || '16', 10), // ~60fps
    playerSyncInterval: parseInt(process.env.PLAYER_SYNC_INTERVAL || '50', 10), // 20fps
  },
};

// Validation
if (!config.jwtSecret || config.jwtSecret === 'your-super-secret-jwt-key-change-in-production') {
  if (config.isProduction) {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  console.warn('⚠️  Using default JWT secret. Set JWT_SECRET environment variable for production.');
}

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL must be set');
}

export default config;