# Fixer Client

React + TypeScript + Vite frontend for the Fixer cyberpunk roguelike game.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── Auth/            # Authentication components
│   ├── Game/            # Game UI components
│   └── Common/          # Shared components
├── game/                # Game engine
│   ├── engine/          # Core engine (GameEngine, Renderer, etc.)
│   ├── systems/         # Game systems (World, Combat, etc.)
│   ├── entities/        # Game objects (Player, Building, etc.)
│   └── utils/           # Game utilities (Vector2, etc.)
├── stores/              # Zustand state stores
├── services/            # API and Socket services
├── types/               # TypeScript definitions
└── assets/              # Game assets
```

## 🎮 Game Engine

The client includes a custom 2D game engine built with:

- **Canvas Rendering**: Hardware-accelerated 2D graphics
- **Real-time Multiplayer**: Socket.io integration
- **Component Systems**: Modular game systems
- **Input Management**: Keyboard/mouse/touch support
- **Audio System**: Howler.js integration

### Core Systems

- **WorldSystem**: Manages world chunks, NPCs, buildings
- **CombatSystem**: Handles shooting, projectiles, damage
- **ContractSystem**: Manages AI fixer contracts
- **HackingSystem**: Neural programs and cyber warfare
- **InventorySystem**: Grid-based Tetris inventory

### Game Entities

- **Player**: Main character with augmentations
- **Building**: Hackable structures with loot
- **Item**: Weapons, augmentations, consumables
- **Augmentation**: Cybernetic enhancements
- **NeuralProgram**: Hacking programs (wallhack, aimbot, etc.)
- **Housing**: Player-owned safe houses

## 🎨 Styling

Uses Tailwind CSS with cyberpunk theme:

- **Colors**: Neon greens, pinks, cyans
- **Fonts**: Orbitron (headers), JetBrains Mono (code)
- **Animations**: Glow effects, pulse animations
- **Grid**: Cyberpunk grid background

## 🔧 Development

### Available Scripts

- `npm run dev` - Development server with hot reload
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm run lint` - ESLint linting

### Environment Variables

Create `.env.local`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SERVER_URL=http://localhost:5000
```

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: React + TypeScript rules
- **Prettier**: Code formatting
- **Path Mapping**: `@/` for src imports

## 🎯 Performance

- **Viewport Culling**: Only render visible objects
- **Object Pooling**: Reuse bullets, effects, UI elements
- **Lazy Loading**: Load world chunks as needed
- **Asset Optimization**: Compressed sprites, efficient audio

## 🔒 Security

- **Input Validation**: All client data validated server-side
- **Anti-cheat**: Server-authoritative movement and combat
- **Rate Limiting**: Prevent spam and DoS attacks
- **Secure Auth**: JWT tokens with proper expiration

## 📱 Mobile Support

- Touch controls for movement and actions
- Responsive UI that works on mobile devices
- Optimized performance for mobile browsers


