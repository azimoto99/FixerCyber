# Fixer Development Guide

This guide covers the development environment setup and workflow for the Fixer cyberpunk roguelike game.

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **PostgreSQL 14+** - [Download here](https://www.postgresql.org/download/)
- **Git** - [Download here](https://git-scm.com/)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fixer-cyberpunk-roguelike
   ```

2. **Run the setup script**
   ```bash
   # On Windows (PowerShell)
   .\scripts\setup-dev.ps1
   
   # On macOS/Linux
   ./scripts/setup-dev.sh
   ```

3. **Configure environment variables**
   - Update `server/.env` with your PostgreSQL database URL
   - Optionally update `client/.env.local` for client configuration

4. **Initialize the database**
   ```bash
   npm run db:setup
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

The game will be available at:
- **Client**: http://localhost:5173
- **Server API**: http://localhost:3001

## 📁 Project Structure

```
fixer-cyberpunk-roguelike/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── game/          # Game engine code
│   │   ├── stores/        # Zustand state management
│   │   ├── services/      # API services
│   │   ├── types/         # TypeScript types
│   │   └── assets/        # Static assets
│   ├── public/            # Public assets
│   └── dist/              # Build output
├── server/                # Node.js backend
│   ├── src/
│   │   ├── routes/        # Express routes
│   │   ├── services/      # Business logic
│   │   ├── game/          # Game server logic
│   │   ├── database/      # Database utilities
│   │   ├── middleware/    # Express middleware
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   ├── prisma/            # Database schema & migrations
│   └── dist/              # Build output
└── scripts/               # Development scripts
```

## 🛠️ Development Workflow

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both client and server in development mode |
| `npm run dev:client` | Start only the client development server |
| `npm run dev:server` | Start only the server development server |
| `npm run build` | Build both client and server for production |
| `npm run test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint all code |
| `npm run lint:fix` | Fix linting issues automatically |
| `npm run format` | Format all code with Prettier |
| `npm run db:setup` | Initialize database (generate, push, seed) |

### Code Quality

The project uses several tools to maintain code quality:

- **ESLint** - Code linting with TypeScript support
- **Prettier** - Code formatting
- **TypeScript** - Type checking
- **Vitest** (client) / **Jest** (server) - Testing frameworks

### Pre-commit Checklist

Before committing code, ensure:

1. ✅ Code passes linting: `npm run lint`
2. ✅ Code is properly formatted: `npm run format`
3. ✅ All tests pass: `npm run test`
4. ✅ TypeScript compiles: `npm run type-check`

## 🧪 Testing

### Client Testing (Vitest + React Testing Library)

```bash
cd client
npm run test          # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:ui       # Open Vitest UI
npm run test:coverage # Generate coverage report
```

### Server Testing (Jest + Supertest)

```bash
cd server
npm run test          # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### Writing Tests

**Client Example:**
```typescript
// src/game/__tests__/IsometricRenderer.test.ts
import { describe, it, expect } from 'vitest';
import { IsometricRenderer } from '../IsometricRenderer';

describe('IsometricRenderer', () => {
  it('should convert world coordinates to screen coordinates', () => {
    const renderer = new IsometricRenderer();
    const screenPos = renderer.worldToScreen({ x: 100, y: 100 });
    expect(screenPos.x).toBeDefined();
    expect(screenPos.y).toBeDefined();
  });
});
```

**Server Example:**
```typescript
// src/services/__tests__/PlayerService.test.ts
import { PlayerService } from '../PlayerService';

describe('PlayerService', () => {
  it('should create a new player', async () => {
    const playerService = new PlayerService();
    const player = await playerService.createPlayer({
      userId: 'test-user',
      username: 'testplayer'
    });
    expect(player.id).toBeDefined();
    expect(player.username).toBe('testplayer');
  });
});
```

## 🗄️ Database Management

### Prisma Commands

```bash
cd server

# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Create and run migrations
npm run db:migrate

# Seed the database
npm run db:seed

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Schema Changes

1. Edit `server/prisma/schema.prisma`
2. Generate migration: `npm run db:migrate`
3. Update Prisma client: `npm run db:generate`

## 🎮 Game Development

### Key Systems

1. **Isometric Rendering** - Canvas-based 2D isometric graphics
2. **Real-time Multiplayer** - WebSocket communication
3. **World Generation** - Procedural chunk-based city generation
4. **Neural Programs** - Chat-activated cheat-like abilities
5. **Vision System** - Fog of war and line-of-sight mechanics

### Adding New Features

1. **Define Requirements** - Update requirements.md
2. **Design System** - Update design.md
3. **Create Tasks** - Add to tasks.md
4. **Implement** - Write code with tests
5. **Test** - Verify functionality
6. **Document** - Update relevant docs

## 🐛 Debugging

### Client Debugging

- Use browser DevTools
- React DevTools extension
- Zustand DevTools for state management
- Canvas debugging with `VITE_DEBUG_MODE=true`

### Server Debugging

- Use VS Code debugger with Node.js
- Add breakpoints in TypeScript files
- Use `console.log` for quick debugging
- Check server logs for errors

### Common Issues

**Database Connection Issues:**
- Verify PostgreSQL is running
- Check DATABASE_URL in server/.env
- Ensure database exists

**Port Conflicts:**
- Client default: 5173
- Server default: 3001
- Change ports in package.json scripts if needed

**Module Resolution:**
- Ensure path aliases are configured in tsconfig.json
- Check import statements use correct paths

## 🚀 Deployment

### Production Build

```bash
npm run build
```

### Environment Variables

Ensure production environment variables are set:
- `DATABASE_URL` - Production database
- `JWT_SECRET` - Secure random string
- `NODE_ENV=production`
- `CORS_ORIGIN` - Production client URL

## 📚 Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Socket.io Documentation](https://socket.io/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes with tests
3. Ensure all checks pass
4. Submit a pull request
5. Wait for code review

## 📞 Support

If you encounter issues:
1. Check this documentation
2. Search existing issues
3. Create a new issue with details
4. Ask in the development chat