# Othello Multiplayer Game

A real-time multiplayer Othello (Reversi) game built with React, Node.js, Express, and Socket.IO. Play against friends in real-time with seamless WebSocket communication.

## 🎮 Features

- **Real-time Multiplayer**: Play with friends using WebSocket communication
- **Responsive Design**: Works on desktop and mobile devices
- **Game Lobby**: Host or join games with shareable URLs
- **Live Game State**: See moves and board updates in real-time
- **Modern Tech Stack**: React 18, TypeScript, Socket.IO, Express
- **Dockerized**: Easy deployment with Docker and Docker Compose

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd othello
   ```

2. **Run with Docker Compose**
   ```bash
   docker compose up
   ```

3. **Open your browser**
   - Visit `http://localhost:3000`
   - Host a new game or join an existing one
   - Share the game URL with friends to play!

### Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm start
   ```

3. **Open browser**
   - Visit `http://localhost:3000`

## 🛠️ Available Scripts

- `npm start` - Start development server with hot reload
- `npm run build` - Production build
- `npm run serve` - Serve production build
- `npm test` - Run tests
- `npm test:watch` - Run tests in watch mode

## 🐳 Docker Commands

- `docker compose up` - Run production build
- `docker compose --profile dev up` - Run development server with hot reload
- `docker compose down` - Stop containers

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, SCSS
- **Backend**: Node.js, Express, Socket.IO
- **Build Tools**: Webpack 5, Babel, TypeScript
- **Containerization**: Docker, Docker Compose

### Project Structure
```
src/
├── client/          # React frontend
│   ├── components/  # React components
│   ├── utils/       # Client utilities and hooks
│   └── index.tsx    # App entry point
├── server/          # Node.js backend
│   ├── models/      # Game logic and managers
│   ├── sockets/     # Socket.IO handlers
│   └── server.ts    # Express server
└── shared/          # Shared types and utilities
```

### Key Components

**Frontend**:
- `Othello` - Main game container
- `GameBoard` - Interactive game board
- `Lobby` - Game lobby and waiting room
- `MainMenu` - Host/join game interface

**Backend**:
- `GameManager` - Manages multiple game instances
- `UserManager` - Tracks connected users
- `Game` & `Board` - Core game logic
- Socket handlers for real-time communication

## 🎯 How to Play

1. **Host a Game**: Click "Host New Game" to create a game room
2. **Join a Game**: Enter a game ID or use a shared URL to join
3. **Game Rules**: 
   - Players take turns placing pieces
   - Capture opponent pieces by flanking them
   - Game ends when no valid moves remain
   - Player with most pieces wins!

## 🚢 Deployment

### Production Docker Build
```bash
# Build and run production container
docker compose up --build

# Run in background
docker compose up -d
```

### Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)
- `ROOT_DIR` - Application root directory

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run specific test
npm test Board.spec.ts
```

## 🔧 Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker (for containerized development)

### Development Workflow
1. Make changes to source code
2. Hot reload automatically updates the app
3. Run tests to ensure functionality
4. Build and test with Docker before deployment

## 📦 Build Process

The application uses a modern build pipeline:
- **Webpack 5** for bundling and optimization
- **Babel** for JavaScript transpilation
- **TypeScript** for type safety
- **SCSS** for styling
- **Multi-stage Docker builds** for production optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🎉 Acknowledgments

Built with modern web technologies for a smooth multiplayer gaming experience. Perfect for learning real-time web applications, React development, and Socket.IO implementation.