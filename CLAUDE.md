# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Start development server with webpack watch mode (builds both client and server)
- `npm run build` - Production build (outputs to `dist/` directory)
- `npm run serve` - Serve production build
- `npm test` - Run Jest tests
- `npm test:watch` - Run Jest tests in watch mode

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

The application includes automated GitHub Actions deployment on push to main branch, with comprehensive health monitoring and version tracking.

## Architecture Overview

This is a multiplayer Othello game built with React/TypeScript frontend and Node.js/Express/Socket.IO backend.

### Project Structure
```
src/
├── client/          # React frontend
├── server/          # Node.js/Socket.IO backend  
└── shared/          # Shared types and utilities
```

### Key Architecture Components

**Client Architecture:**
- React 18 with TypeScript and SCSS styling
- Socket.IO client for real-time communication
- React Router for navigation between game states
- Main components: `Othello` (game container), `GameBoard`, `Lobby`, `MainMenu`

**Server Architecture:**
- Express server with Socket.IO for WebSocket communication
- Singleton pattern managers: `GameManager` (handles game instances), `UserManager` (tracks connected users)
- Game models: `Game`, `Board` (game logic and state)
- Socket handlers in `sockets/` directory manage real-time events

**Real-time Communication:**
- Socket events defined in `shared/SocketEvents.ts`
- Game state updates broadcast to specific game rooms via `GameUpdated` events
- User management for joins/leaves across multiple concurrent games

### Build System
- Webpack configuration builds separate client and server bundles
- Development mode includes hot module replacement and live reloading via nodemon
- TypeScript compilation with Babel for both client and server
- SCSS compilation for styling

### Testing
- Jest with React Testing Library for component tests
- Test files use `.spec.ts/.tsx` extension
- Coverage collection configured for `src/` directory

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