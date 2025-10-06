# Fixer Server

Node.js + Express + TypeScript backend for the Fixer cyberpunk roguelike game.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp env.example .env

# Set up database
npx prisma generate
npx prisma db push
npm run db:seed

# Start development server
npm run dev
```

## 📁 Project Structure

```
src/
├── routes/              # API endpoints
│   ├── auth.ts         # Authentication routes
│   ├── players.ts      # Player management
│   ├── contracts.ts    # Contract system
│   └── world.ts        # World data
├── services/            # Business logic
│   ├── AuthService.ts  # User authentication
│   ├── PlayerService.ts # Player management
│   ├── ContractService.ts # Contract logic
│   └── WorldService.ts # World generation
├── game/                # Game server logic
│   ├── GameServer.ts   # Main game server
│   ├── WorldManager.ts # World management
│   └── ContractManager.ts # Contract management
├── database/            # Database layer
│   └── models/         # Prisma models
├── middleware/          # Express middleware
│   ├── auth.ts         # JWT authentication
│   ├── validation.ts   # Input validation
│   └── rateLimiting.ts # Rate limiting
├── types/               # TypeScript definitions
└── utils/               # Utilities
    ├── logger.ts       # Logging system
    ├── encryption.ts   # Encryption utilities
    └── worldGen.ts     # World generation
```

## 🎮 Game Server

Real-time multiplayer game server with:

- **30 FPS Game Loop**: Consistent world updates
- **Spatial Partitioning**: Efficient player/world queries
- **Contract Management**: AI fixer system
- **World Generation**: Procedural cyberpunk city
- **Anti-cheat**: Server-authoritative gameplay

### Core Services

- **AuthService**: User registration, login, JWT tokens
- **PlayerService**: Character management, inventory, stats
- **ContractService**: AI fixer contracts, rewards
- **WorldService**: Chunk generation, NPCs, buildings

### Real-time Features

- Player position synchronization
- Combat events and damage
- Contract notifications
- World state updates
- Chat and communication

## 🗄️ Database

PostgreSQL with Prisma ORM:

### Core Tables

- **users**: User accounts and authentication
- **players**: Player characters and stats
- **world_chunks**: Procedurally generated world data
- **contracts**: AI fixer contracts and missions
- **housing**: Player-owned properties
- **inventory_items**: Player inventory and items
- **augmentations**: Cybernetic enhancements

### Prisma Commands

```bash
# Generate client
npx prisma generate

# Push schema changes
npx prisma db push

# Create migration
npx prisma migrate dev --name migration_name

# Seed database
npm run db:seed

# View database
npx prisma studio
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

### Players
- `GET /api/players/me` - Get player data
- `POST /api/players/create` - Create character
- `PUT /api/players/position` - Update position
- `GET /api/players/inventory` - Get inventory
- `PUT /api/players/inventory` - Update inventory

### Contracts
- `GET /api/contracts` - Available contracts
- `GET /api/contracts/active` - Player's contracts
- `POST /api/contracts/:id/accept` - Accept contract
- `POST /api/contracts/:id/complete` - Complete contract

### World
- `GET /api/world/chunk/:x/:y` - Get world chunk
- `GET /api/world/players/nearby` - Nearby players
- `POST /api/world/chunk/:x/:y/generate` - Generate chunk

## 🌐 WebSocket Events

### Player Events
- `player:move` - Player movement
- `player:action` - Player actions
- `player:disconnect` - Player disconnect

### Game Events
- `players:update` - Player position updates
- `combat:shoot` - Combat events
- `hack:attempt` - Hacking attempts
- `contract:accepted` - Contract updates

## 🔒 Security

### Authentication
- JWT tokens with expiration
- bcrypt password hashing
- Rate limiting on auth endpoints
- Input validation and sanitization

### Anti-cheat
- Server-authoritative movement
- Combat validation
- Action rate limiting
- Position sanity checks

### Data Protection
- Parameterized database queries
- CORS configuration
- Helmet.js security headers
- Environment variable secrets

## 🚀 Performance

### Optimization
- Spatial partitioning for world queries
- Database connection pooling
- Redis caching (optional)
- Efficient update frequencies

### Monitoring
- Custom logging system
- Error tracking and reporting
- Performance metrics
- Database query optimization

## 🔧 Development

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/fixer_db"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key"

# Server Config
PORT=5000
NODE_ENV="development"
CLIENT_URL="http://localhost:3000"
```

### Available Scripts

- `npm run dev` - Development with hot reload
- `npm run build` - Build TypeScript
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:seed` - Seed database

### Code Quality

- TypeScript strict mode
- ESLint + Prettier
- Comprehensive error handling
- Structured logging
- Input validation

## 🚀 Deployment

Configured for Render.com deployment:

1. **Database**: PostgreSQL service
2. **Server**: Node.js web service
3. **Environment**: Production variables
4. **Build**: Automatic TypeScript compilation

See `render.yaml` for deployment configuration.


