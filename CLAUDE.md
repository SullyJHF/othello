# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Start development server (Vite client + tsx server)
- `npm run build` - Production build using Vite for both client and server (outputs to `dist/` directory)
- `npm run build:client` - Build client only using Vite
- `npm run build:server` - Build server only using Vite
- `npm run serve` - Serve production build
- `npm test` - Run Jest tests
- `npm test:watch` - Run Jest tests in watch mode
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint linting with auto-fix options

## Database Commands

### Setup Commands

- `npm run db:setup:local` - Set up local development database (port 5433)
- `npm run db:setup:test` - Set up test database (port 5434)
- `npm run db:setup:prod` - Set up production database (port 5432)

### Management Commands (Environment-Specific)

- `npm run db:stop:local` - Stop only local database
- `npm run db:stop:test` - Stop only test database
- `npm run db:stop:prod` - Stop only production database
- `npm run db:stop` - Stop all databases

### Logs and Health

- `npm run db:logs:local` - Show local database logs
- `npm run db:logs:test` - Show test database logs
- `npm run db:health:local` - Check local database health
- `npm run db:health:test` - Check test database health

### Reset Commands (WARNING: Deletes all data!)

- `npm run db:reset:local` - Reset local database
- `npm run db:reset:test` - Reset test database
- `npm run db:reset:prod` - Reset production database

### Database Migrations and Seeds

- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data
- `npm run db:backup` - Create database backup

### Testing Database Setup

- `npm run db:test-setup` - Test database setup for CI/CD compatibility

### Multiple Database Support

The system now supports running multiple database environments simultaneously:

- **Local Development**: `localhost:5433` (othello_dev)
- **Test Environment**: `localhost:5434` (othello_test)
- **Production**: `localhost:5432` (othello)

This allows you to run tests while developing without interference.

## Docker Commands

- `docker-compose up` - Run production build in Docker container
- `docker-compose --profile dev up` - Run development server in Docker container with hot reload
- `docker-compose down` - Stop and remove containers

## Production Deployment

- `./deploy.sh deploy` - Deploy to production with Traefik and SSL
- `./deploy.sh local` - Deploy locally for testing without Traefik
- `./deploy.sh logs` - View production logs
- `./deploy.sh stop` - Stop production containers
- `./deploy.sh restart` - Restart production containers

The application includes automated GitHub Actions deployment on push to main branch, with comprehensive health monitoring and version tracking. Additional GitHub Actions workflow runs tests, linting, and type checking on all pull requests to ensure code quality.

## Architecture Overview

This is a multiplayer Othello game built with React/TypeScript frontend and Node.js/Express/Socket.IO backend featuring a comprehensive game modes system with advanced timer controls.

### Project Structure

```
src/
├── client/          # React frontend
│   ├── components/  # React components
│   │   ├── GameModeSelector/    # Game mode selection wizard
│   │   ├── Timer/               # Timer display and controls
│   │   ├── TimerDisplay/        # Compact timer widget
│   │   ├── TimerNotification/   # Timer alert toasts
│   │   ├── Settings/            # Global settings modal
│   │   ├── FloatingSettingsButton/  # Floating settings access
│   │   └── ui/                  # Reusable UI components (StyledButton, etc.)
│   ├── contexts/    # React contexts (GameMode, GameView)
│   ├── utils/       # Client utilities (TimerSoundManager, etc.)
│   └── integration/ # End-to-end integration tests
├── server/          # Node.js/Socket.IO backend
│   ├── models/      # Game models (Game, Board, Timer)
│   ├── services/    # Business logic (GameModeRegistry, GameModeEngine)
│   ├── sockets/     # Real-time event handlers (timer, game mode)
│   ├── api/         # REST API endpoints
│   └── database/    # Database setup and migrations
└── shared/          # Shared types and utilities
    ├── types/       # TypeScript definitions (gameModeTypes, etc.)
    └── SocketEvents.ts  # Socket event definitions
```

### Key Architecture Components

**Client Architecture:**

- React 18 with TypeScript and SCSS styling
- Socket.IO client for real-time communication
- React Router for navigation between game states
- Framer Motion for smooth screen transitions
- GameViewContext for global view state management
- GameModeContext for game mode state and selection
- Main components: `Othello` (game container), `GameBoard`, `Lobby`, `MainMenu`
- Luxury design system with golden accents and gradient backgrounds
- Global floating settings button accessible from all screens
- Comprehensive timer system with sound alerts and warnings

**Server Architecture:**

- Express server with Socket.IO for WebSocket communication
- Singleton pattern managers: `GameManager` (handles game instances), `UserManager` (tracks connected users)
- Game models: `Game`, `Board`, `Timer` (game logic, state, and timer controls)
- AI services: `AIResponseGeneratorService`, `PerformanceOptimizer`, `AIResponseCache`
- GameModeRegistry service for CRUD operations on game modes
- GameModeEngine for game mode execution and validation
- AI strategies: `MinimaxStrategy`, `AlphaBetaStrategy` with extensible strategy interface
- Socket handlers in `sockets/` directory manage real-time events
- Database integration for persistent game mode storage and AI response caching
- REST API endpoints for game mode management

**Game Modes System:**

- **Modular Architecture**: Template-based game mode creation and management
- **Timer-Based Modes**: Bullet (1+0, 1+1), Blitz (3+0, 3+2), Rapid (10+0, 15+10), Classical (30+0, 45+45)
- **Board Variants**: Mini 6x6, Standard 8x8, Large 10x10
- **Special Rules**: Extensible framework for custom game mechanics
- **Daily Challenges**: Timed puzzles and scenarios (framework ready)
- **UI/UX**: Multi-step game mode selection with preview and confirmation
- **Persistence**: Database-driven configuration with JSON storage

**Timer System:**

- **Chess-Style Controls**: Full support for increment, delay, fixed, and unlimited time modes
- **Real-Time Sync**: Timer synchronization via Socket.IO events with latency compensation
- **Client Display**: Smooth countdown animations with visual warning states
- **Audio System**: Configurable sound alerts (warning, critical, expired, tick, move sounds)
- **State Management**: Timer state persistence and recovery on page refresh
- **Network Resilience**: Graceful handling of disconnections and reconnections

**Settings System:**

- **Global Access**: Floating settings button accessible from all screens
- **Modal Interface**: Luxury-styled modal with full settings configuration
- **Persistent Storage**: Settings saved to localStorage with auto-restore
- **Timer Configuration**: Volume controls, sound enable/disable, test functionality
- **Reusable Components**: StyledButton, StyledCheckbox, StyledSlider with consistent theming

**AI Engine & Challenge System:**

- **Advanced AI Engine**: Minimax and Alpha-Beta pruning strategies with configurable difficulty
- **AI Response Generation**: Comprehensive AI move calculation with alternatives and explanations
- **Multi-Stage Challenges**: Complex challenge scenarios with sequential AI responses
- **Performance Optimization**: Caching, memory management, and concurrent processing
- **Database Integration**: AI response storage with board state hashing and analytics
- **Challenge Analytics**: Comprehensive tracking of AI performance and challenge metrics

**Debug System Integration:**

- **Full Game Mode Support**: Debug games support all timer modes and board variants
- **Visual Indicators**: Debug-specific styling and UI elements
- **Conditional Rendering**: Debug features only appear when debug flags are enabled
- **Host Integration**: Debug game creation integrated into host game flow

**Real-time Communication:**

- Socket events defined in `shared/SocketEvents.ts`
- Game state updates broadcast to specific game rooms via `GameUpdated` events
- Timer-specific events: `TimerUpdated`, `TimerTick`, `TimerWarning`, `TimerExpired`
- Game mode events: `GetGameModes`, `HostNewGameWithMode`
- User management for joins/leaves across multiple concurrent games
- Debug game creation and management via socket events

### Build System

- **Vite-based build system** for both client and server (modern, fast)
- **Development**: Vite dev server (client) + tsx/nodemon (server) with HMR
- **Production**: Vite builds optimized bundles for both client and server
- **Client**: React bundle with code splitting, minification, and tree-shaking
- **Server**: Node.js bundle with source maps and minification
- **TypeScript**: Native TypeScript support without separate compilation step
- **SCSS**: Built-in SCSS preprocessing

### Testing & Quality Assurance

- Jest with React Testing Library for component tests
- Test files use `.spec.ts/.tsx` extension
- Coverage collection configured for `src/` directory
- GitHub Actions CI/CD pipeline with automated testing
- TypeScript type checking and ESLint linting
- All tests must pass before merging PRs (882/882 tests currently passing)

## Docker Deployment

### Environment Configuration

The application supports both local and production Docker deployments with environment variable management:

**Local Deployment:**

- Use `./deploy.sh local` for local Docker testing
- Configuration via `.env.local` file (copied from `.env.local.example`)
- Set `LOCAL_HOST` to your Docker host IP (localhost for standard setups, machine IP for corporate networks)
- Supports VPN/proxy environments with HTTP_PROXY configuration

**Production Deployment:**

- Use `./deploy.sh deploy` for production deployment with Traefik
- Configuration via `.env.production` file (copied from `.env.production.example`)
- Requires domain configuration and Traefik integration
- SSL/TLS certificate management via Let's Encrypt

**Key Environment Variables:**

- `LOCAL_HOST`: Docker host IP for local deployment (e.g., localhost)
- `DOMAIN`: Production domain for Traefik routing
- `APP_PORT`: Port for local deployment (default: 3000)
- `HTTP_PROXY/HTTPS_PROXY/NO_PROXY`: Corporate network proxy support

### Docker Architecture

- **Single Container**: Full-stack application with integrated client and server
- **Multi-stage Build**: Production-optimized build with webpack bundling
- **Networking**: Bridge networking for local, Traefik integration for production
- **Security**: Non-root user, health checks, security headers via Traefik

### Deployment Commands

- `./deploy.sh deploy` - Production deployment with Traefik
- `./deploy.sh local` - Local deployment for testing
- `./deploy.sh logs` - Show production logs
- `./deploy.sh logs-local` - Show local logs
- `./deploy.sh stop` - Stop production containers
- `./deploy.sh stop-local` - Stop local containers
- `./deploy.sh restart` - Restart production containers
- `./deploy.sh restart-local` - Restart local containers

## Development Best Practices

- Ensure we test at every step of the plan, I want to make sure new features don't cause regression problems

## Commit Guidelines

- Don't commit anything without asking first

## Server Running Notes

- I will always have the server running, so feel free to take screenshots when you want and NEVER start the development server, there's no point

## Build Guidelines

- Don't run any builds unless I specifically ask you to

## UI/UX Design System

### Completed Features

- **Luxury Design System**: Golden accent colors (#d4af37), gradient backgrounds, elegant typography
- **Responsive Design**: Mobile-first approach with optimized breakpoints
- **Enhanced Components**: All main screens (MainMenu, Lobby, Host/Join) feature consistent luxury styling
- **Fixed Layout Issues**: Copy button width fixed, debug panel repositioned, version info globally positioned
- **Smooth Transitions**: Framer Motion integration for seamless screen transitions

### Component Architecture

- **GameViewContext**: Global view state management for screen transitions
- **GameModeContext**: Game mode state management and selection
- **Debug System**: Comprehensive debug utilities with feature flags (top-left positioned)
- **Version Info**: Global positioning system with click-outside functionality
- **Form Components**: Enhanced host/join forms with validation and loading states
- **Settings System**: Global floating settings with timer sound configuration
- **Timer Components**: Real-time timer display with warnings and sound alerts

## Current Game Features (Production-Ready)

### Game Modes Available

**Timer-Based Modes (Chess-Style):**

- **Bullet**: 1+0 (1 minute), 1+1 (1 minute + 1 second increment)
- **Blitz**: 3+0 (3 minutes), 3+2 (3 minutes + 2 second increment), 5+0, 5+3
- **Rapid**: 10+0 (10 minutes), 15+10 (15 minutes + 10 second increment)
- **Classical**: 30+0 (30 minutes), 45+45 (45 minutes + 45 second increment)
- **Unlimited**: Traditional Othello with no time constraints

**Board Variants:**

- **Mini Board**: 6x6 for quick games
- **Standard Board**: 8x8 traditional Othello
- **Large Board**: 10x10 for extended gameplay

**Special Features:**

- **Daily Challenges**: Framework ready for timed puzzles
- **Debug Games**: Full game mode support for testing

### Timer System Features

- **Real-Time Synchronization**: Accurate timer updates via Socket.IO
- **Visual Warnings**: Color-coded time pressure indicators
- **Audio Alerts**: Configurable sounds for warnings, critical time, expiration
- **Network Resilience**: Timer continues accurately after disconnections
- **State Persistence**: Timer survives page refreshes
- **Sound Configuration**: Volume controls, enable/disable, test buttons

### Settings & Configuration

- **Global Access**: Floating settings button on all screens
- **Timer Sounds**: Configure warning sounds, critical alerts, move confirmation
- **Volume Controls**: Individual volume sliders for different sound types
- **Test Functionality**: Test buttons for all sound types
- **Persistent Storage**: Settings saved across browser sessions
- **Luxury UI**: Modal interface matching app design system

### Debug System

- **Game Mode Support**: Debug games work with all timer modes and board sizes
- **Visual Indicators**: Orange debug button with distinctive styling
- **Conditional Display**: Debug features only appear when debug flags enabled
- **Full Integration**: Debug games use same flow as normal games

## GitHub Actions Workflows

### Test Workflow (`.github/workflows/test.yml`)

- Runs on all pull requests and pushes to main
- **Database Setup**: Automatically sets up test database (port 5434) before running tests
- Comprehensive pipeline: type checking, linting, testing, building
- **Database Cleanup**: Stops test database after tests complete
- Prevents broken code from being merged
- 32/32 tests currently passing

### Deploy Workflow (`.github/workflows/deploy.yml`)

- Automated production deployment on main branch pushes
- **Pre-deployment Testing**: Sets up test database and runs tests before deployment
- **Production Database Setup**: Automatically sets up production database on VPS
- Docker build and deployment to VPS
- Health checks and deployment verification
- Version tracking and build information injection

## File Guidelines

- All files should have a newline at the end
