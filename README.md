# Fixer - Cyberpunk Roguelike Game

A multiplayer cyberpunk roguelike where players spawn as mercenary "fixers" in a persistent, procedurally generated cyberpunk city. Complete contracts from AI fixers, engage in PvP through assassination contracts, install powerful augmentations, and use neural programs that work like cheats (wallhack.exe, aimbot.exe, bullettime.exe).

## 🚀 Features

- **Persistent Cyberpunk World**: Procedurally generated city with different districts
- **Multiplayer Gameplay**: Real-time multiplayer with PvP assassination contracts
- **Augmentation System**: Install cybernetic augmentations at medbots for powerful abilities
- **Neural Programs**: Hacking programs that work like cheats (wallhack, aimbot, bullettime)
- **Contract System**: Receive jobs from AI fixers via cyber-augments
- **Housing System**: Purchase housing to save progress between deaths
- **Grid Inventory**: Tetris-style inventory management
- **Real-time Combat**: Top-down shooter with line of sight mechanics

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Socket.io-client** for real-time communication
- **Zustand** for state management
- **Howler.js** for audio

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Socket.io** for real-time multiplayer
- **PostgreSQL** with Prisma ORM
- **JWT** for authentication
- **bcryptjs** for password hashing

## 📁 Project Structure

```
fixer-game/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── game/             # Game engine and systems
│   │   ├── stores/           # State management
│   │   ├── services/         # API and socket services
│   │   ├── types/            # TypeScript definitions
│   │   └── assets/           # Game assets
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── server/                    # Node.js backend
│   ├── src/
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── game/             # Server game logic
│   │   ├── database/         # Database layer
│   │   ├── middleware/       # Express middleware
│   │   ├── types/            # Type definitions
│   │   └── utils/            # Utilities
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fixer-game
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Set up environment variables**
   ```bash
   cd ../server
   cp env.example .env
   ```
   
   Edit `.env` with your database credentials:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/fixer_db"
   JWT_SECRET="your-super-secret-jwt-key"
   PORT=5000
   CLIENT_URL="http://localhost:3000"
   ```

5. **Set up the database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Push schema to database
   npx prisma db push
   
   # Seed the database
   npm run db:seed
   ```

6. **Start the development servers**
   
   Terminal 1 (Server):
   ```bash
   cd server
   npm run dev
   ```
   
   Terminal 2 (Client):
   ```bash
   cd client
   npm run dev
   ```

7. **Open the game**
   
   Navigate to `http://localhost:3000` in your browser

## 🎮 Game Mechanics

### Core Gameplay Loop

1. **Spawn** as a fixer in the cyberpunk city
2. **Receive contracts** from AI fixers via neural augments
3. **Complete missions** for credits and gear
4. **Install augmentations** at medbots for powerful abilities
5. **Use neural programs** like wallhack.exe and aimbot.exe
6. **Engage in PvP** through assassination contracts
7. **Purchase housing** to save progress or restart on death

### Augmentation System

Players can find and purchase augmentations which provide significant abilities:

- **Combat Augs**: Increased health, damage, accuracy
- **Stealth Augs**: Reduced detection, speed boost, invisibility
- **Hacking Augs**: Faster hacking, bypass security, heat reduction
- **Utility Augs**: Expanded inventory, credit bonuses, experience boosts

### Neural Programs (Hacking)

Neural programs work like cheat codes but generate heat:

- **wallhack.exe**: See through walls and obstacles
- **aimbot.exe**: Automated targeting system  
- **bullettime.exe**: Slow down time perception
- **stealth.exe**: Reduce detection chance
- **datamine.exe**: Extract data faster
- **firewall.exe**: Protect against counter-hacks

### Districts

- **Corporate**: High-security, valuable loot, corporate NPCs
- **Residential**: Medium security, civilian NPCs, housing
- **Industrial**: Factories, warehouses, worker NPCs
- **Underground**: Low security, criminal NPCs, black market
- **Wasteland**: Dangerous, rare loot, raider NPCs

## 🔧 Development

### Available Scripts

**Server:**
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:seed` - Seed database with initial data

**Client:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Database Management

```bash
# View database in browser
npx prisma studio

# Reset database
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name migration_name
```

## 🚀 Deployment

The game is designed to deploy on Render.com:

1. **Database**: PostgreSQL on Render
2. **Backend**: Node.js service on Render
3. **Frontend**: Static site deployment

See `render.yaml` for deployment configuration.

## 🎯 Roadmap

### Phase 1: Core Foundation ✅
- [x] Project setup with Vite + React + TypeScript
- [x] Basic authentication system
- [x] Simple 2D canvas rendering
- [x] Player movement and controls
- [x] WebSocket connection for multiplayer
- [x] Basic world generation

### Phase 2: Core Gameplay
- [ ] Grid inventory system
- [ ] Basic contract system
- [ ] Combat mechanics (shooting, health)
- [ ] Item drops and pickup
- [ ] Death/respawn system

### Phase 3: Advanced Features  
- [ ] Housing system with save/load
- [ ] Assassination contracts with timers
- [ ] Stealth mechanics
- [ ] Hacking mini-games with neural programs
- [ ] Augmentation system with medbots

### Phase 4: Polish & Launch
- [ ] Audio system and effects
- [ ] Performance optimization
- [ ] Deployment to Render
- [ ] Monetization (cosmetics, premium housing)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎮 Play Now

Visit [fixer.gg](https://fixer.gg) to play the game!

---

*Built with ❤️ for cyberpunk and roguelike enthusiasts*


