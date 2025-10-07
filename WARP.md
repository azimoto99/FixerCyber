# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Fixer** is a multiplayer cyberpunk roguelike game where players spawn as mercenary "fixers" in a procedurally generated cyberpunk city. Features include:
- Real-time multiplayer with PvP assassination contracts
- Augmentation system with cybernetic enhancements
- Neural programs (hacking "cheats" like wallhack.exe, aimbot.exe, bullettime.exe)
- Grid-based Tetris inventory system
- Housing system for progress persistence
- Contract system with AI fixers

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Socket.io-client + Zustand + Howler.js
- **Backend**: Node.js + Express + TypeScript + Socket.io + Prisma ORM + PostgreSQL
- **Deployment**: Render.com (configured via render.yaml)

## Development Commands

### Client (React Frontend)
```bash
cd client
npm install                 # Install dependencies
npm run dev                # Start development server (http://localhost:3000)
npm run build              # Build for production (TypeScript + Vite)
npm run preview            # Preview production build
npm run lint               # Run ESLint
```

### Server (Node.js Backend)
```bash
cd server
npm install                 # Install dependencies
npm run dev                # Start development server with hot reload (tsx watch)
npm run build              # Compile TypeScript to dist/
npm run start              # Start production server (node dist/index.js)
```

### Database Commands (Prisma)
```bash
cd server
npx prisma generate         # Generate Prisma client
npx prisma db push          # Push schema changes to database
npx prisma migrate dev      # Create and apply migration
npm run db:seed            # Seed database with initial data (tsx prisma/seed.ts)
npx prisma studio          # Open database browser interface
npx prisma migrate reset    # Reset database (destructive)
```

### Testing
```bash
# Run single test file
cd client && npm run test -- GameEngine.test.ts
cd server && npm run test -- PlayerService.test.ts

# Run specific test pattern
cd client && npm run test -- --grep "inventory"
```

## Architecture Overview

### Monorepo Structure
- `client/` - React frontend with custom 2D game engine
- `server/` - Node.js backend with real-time game server
- `render.yaml` - Production deployment configuration

### Real-time Multiplayer Architecture
The game uses Socket.io for real-time communication:
- **Client**: Custom 2D canvas-based game engine with 60fps rendering
- **Server**: 30fps authoritative game loop with spatial partitioning
- **Communication**: Position updates, combat events, contract notifications

### Database Schema (Prisma)
Core entities:
- **User/Player**: Authentication and character data
- **WorldChunk**: Procedurally generated city chunks (64x64 tiles)
- **Contract**: AI fixer missions with timers and rewards
- **Housing**: Player-owned properties for progress persistence
- **Augmentation/PlayerAugmentation**: Cybernetic enhancement system
- **InventoryItem**: Grid-based item storage (10x6 Tetris inventory)

### Game Systems
- **WorldSystem**: Procedural city generation with 5 districts (Corporate, Residential, Industrial, Underground, Wasteland)
- **CombatSystem**: Real-time top-down combat with line-of-sight mechanics
- **ContractSystem**: AI fixer missions (assassination, data extraction, territory control, etc.)
- **HackingSystem**: Neural programs that work like game cheats with heat mechanics
- **InventorySystem**: Tetris-style grid inventory with drag-and-drop
- **AugmentationSystem**: Installable cybernetic enhancements at medbots

### Client Game Engine (Custom 2D)
Located in `client/src/game/`:
- **engine/**: Core engine (GameEngine, Renderer, InputManager, AudioManager)
- **systems/**: Game logic systems
- **entities/**: Game objects (Player, Building, Item, Augmentation, etc.)
- **utils/**: Utilities (Vector2, collision detection, world generation)

### State Management
- **Client**: Zustand stores for game state, player data, world state, contracts
- **Server**: In-memory game state with PostgreSQL persistence

## Environment Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Environment Variables

**Server (.env):**
```env
DATABASE_URL="postgresql://username:password@localhost:5432/fixer_db"
JWT_SECRET="your-super-secret-jwt-key"
PORT=5000
NODE_ENV="development"
CLIENT_URL="http://localhost:3000"
```

**Client (.env.local):**
```env
VITE_API_URL=http://localhost:5000/api
VITE_SERVER_URL=http://localhost:5000
```

## Key Development Patterns

### Server Architecture
- **Services**: Business logic (AuthService, PlayerService, ContractService, WorldService)
- **Routes**: REST API endpoints (/api/auth, /api/players, /api/contracts, /api/world)
- **GameServer**: Real-time multiplayer game loop with Socket.io
- **Middleware**: Authentication, validation, rate limiting

### Socket.io Events
- **Player Events**: `player:move`, `player:action`, `player:disconnect`
- **Game Events**: `players:update`, `combat:shoot`, `hack:attempt`, `contract:accepted`

### Client Component Structure
- **components/Auth/**: Login/Register components
- **components/Game/**: Game UI (GameCanvas, GameUI, Inventory, ContractPanel, HackingInterface)
- **services/**: API communication (api.ts for REST, socket integration)

## Performance Considerations

### Client Optimization
- Viewport culling: Only render visible game objects
- Object pooling: Reuse bullets, effects, UI elements
- Lazy loading: Load world chunks as needed

### Server Optimization
- Spatial partitioning: Divide world into regions for efficient updates
- Update frequencies: Critical data at 30Hz, less critical at 10Hz
- Database optimization: Proper indexing, connection pooling

## Security & Anti-cheat
- Server-authoritative movement and combat validation
- Input validation and sanitization
- Rate limiting on actions and API endpoints
- JWT authentication with proper expiration
- Position sanity checks and action validation

## Key Game Features

### Neural Programs (Hacking System)
Programs work like game cheats but generate heat:
- `wallhack.exe`: See through walls
- `aimbot.exe`: Automated targeting
- `bullettime.exe`: Slow down time
- Heat system prevents overuse

### Augmentation System
Installable at medbots:
- **Combat**: Health, damage, accuracy boosts
- **Stealth**: Detection reduction, invisibility
- **Hacking**: Faster hacking, heat reduction
- **Utility**: Inventory expansion, credit bonuses

### World Generation
Procedural cyberpunk city:
- 64x64 tile chunks generated on-demand
- 5 distinct districts with different security levels
- Buildings contain hackable terminals and loot tables

## Deployment

Production deployment on Render.com:
1. **Database**: PostgreSQL service
2. **Backend**: Node.js web service (automatic TypeScript build)
3. **Frontend**: Static site from client/dist

Deploy command: Git push triggers automatic deployment via render.yaml configuration.