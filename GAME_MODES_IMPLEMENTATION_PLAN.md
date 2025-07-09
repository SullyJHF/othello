# Modular Game Modes System - Detailed Implementation Plan

## 🚀 Implementation Status

### ✅ Phase 1 Progress - Database Foundation Complete (8/9 sections)

- **1.1 Data Models and Type System** ✅ COMPLETED
  - Created comprehensive TypeScript types for game modes
  - Implemented game state management types
  - Added extensive validation and helper functions
- **1.2 Database Infrastructure Setup** ✅ COMPLETED
  - PostgreSQL Docker configuration with multi-environment support
  - Database connection pooling and health monitoring
  - Migration system with rollback capabilities
  - Seeding system with test data
  - Complete environment setup scripts
- **1.3 Database Schema Extensions** ✅ COMPLETED
  - Game modes table with comprehensive configuration
  - Games table with game mode integration and timer support
  - Daily challenges table with user progress tracking
  - All 8 migrations working with proper rollbacks
  - Comprehensive indexing and constraint system

### 🚧 Next Steps - Server Services & API (1/9 sections remaining)

- **1.4 Server-Side Implementation** (In Progress)
  - Game Mode Registry Service
  - Game Mode Engine
- **1.5 API Endpoints and Socket Events** (Pending)
  - Socket event extensions
  - RESTful API endpoints

---

## Phase 1: Core Game Mode System (Week 1-2)

### 1.1 Data Models and Type System ✅ COMPLETED

#### 1.1.1 Create Core Game Mode Types ✅ COMPLETED

**File:** `src/shared/types/gameModeTypes.ts`

```typescript
// Base game mode interface
export interface GameMode {
  id: string; // Unique identifier (e.g., 'blitz-3-0', 'classic-8x8')
  name: string; // Display name (e.g., 'Blitz 3+0')
  description: string; // User-friendly description
  category: GameModeCategory; // Category for UI organization
  config: GameModeConfig; // Mode-specific configuration
  isActive: boolean; // Whether mode is available for selection
  isDefault: boolean; // Whether this is the default mode
  minimumPlayers: number; // Always 2 for Othello
  maximumPlayers: number; // Always 2 for Othello
  estimatedDuration: number; // Estimated game duration in minutes
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  tags: string[]; // For filtering and search
  createdAt: Date;
  updatedAt: Date;
}

export type GameModeCategory =
  | 'timer' // Chess-style time controls
  | 'board-variant' // Different board sizes
  | 'special' // Special rules or win conditions
  | 'daily-challenge' // Daily puzzles and challenges
  | 'tournament'; // Tournament-style play

// Comprehensive configuration object
export interface GameModeConfig {
  timer?: TimerConfig;
  board?: BoardConfig;
  rules?: RulesConfig;
  challenge?: ChallengeConfig;
  tournament?: TournamentConfig;
  ui?: UIConfig;
}

// Timer configuration for chess-style games
export interface TimerConfig {
  type: 'increment' | 'delay' | 'fixed' | 'correspondence' | 'unlimited';
  initialTime: number; // Initial time in seconds
  increment: number; // Increment per move in seconds
  delay: number; // Delay before timer starts (Fischer delay)
  maxTime: number; // Maximum time that can be accumulated
  lowTimeWarning: number; // Seconds at which to show warning
  criticalTimeWarning: number; // Seconds at which to show critical warning
  autoFlagOnTimeout: boolean; // Whether to auto-end game on timeout
  pauseOnDisconnect: boolean; // Whether to pause timer on disconnect
  maxPauseTime: number; // Maximum pause time allowed
}

// Board configuration for different variants
export interface BoardConfig {
  width: number; // Board width (6-12)
  height: number; // Board height (6-12)
  startingPosition: string; // Custom starting position (optional)
  validSizes: number[]; // Valid board sizes for this mode
  customRules: BoardRule[]; // Custom board rules
}

export interface BoardRule {
  id: string;
  name: string;
  description: string;
  affects: 'placement' | 'scoring' | 'movement' | 'victory';
  implementation: string; // Code or config for rule implementation
}

// Game rules configuration
export interface RulesConfig {
  allowPass: boolean; // Whether passing is allowed
  passConsumesTime: boolean; // Whether passing uses time
  maxPasses: number; // Maximum consecutive passes before game ends
  scoringMethod: 'standard' | 'territory' | 'captures' | 'custom';
  winCondition: 'most-pieces' | 'first-to-score' | 'control-center' | 'custom';
  customWinCondition?: {
    type: string;
    parameters: Record<string, any>;
  };
}

// Challenge configuration for daily puzzles
export interface ChallengeConfig {
  type: 'tactical' | 'endgame' | 'opening' | 'puzzle' | 'scenario';
  difficulty: 1 | 2 | 3 | 4 | 5;
  maxAttempts: number;
  timeLimit?: number; // Time limit in seconds (optional)
  hints: ChallengeHint[];
  solution: ChallengeSolution;
  tags: string[];
}

export interface ChallengeHint {
  order: number;
  text: string;
  cost: number; // Points deducted for using hint
}

export interface ChallengeSolution {
  moves: number[]; // Sequence of moves that solve the puzzle
  explanation: string; // Explanation of the solution
  alternativeSolutions?: number[][]; // Alternative correct solutions
}

// Tournament configuration
export interface TournamentConfig {
  format: 'single-elimination' | 'double-elimination' | 'round-robin' | 'swiss';
  rounds: number;
  timePerRound: number;
  bracketSize: number;
  advancementRules: string;
}

// UI configuration for mode-specific display
export interface UIConfig {
  theme: 'default' | 'blitz' | 'classical' | 'puzzle' | 'tournament';
  showTimer: boolean;
  showMoveHistory: boolean;
  showEvaluation: boolean;
  customStyles?: Record<string, string>;
}
```

#### 1.1.2 Create Game Mode State Management ✅ COMPLETED

**File:** `src/shared/types/gameStateTypes.ts`

```typescript
// Extended game state to include mode information
export interface GameState {
  // Existing game state properties
  id: string;
  currentPlayer: Piece;
  players: { [userId: string]: Player };
  gameStarted: boolean;
  gameFull: boolean;
  gameFinished: boolean;
  createdAt: Date;
  lastActivityAt: Date;
  board: Board;
  joinUrl: string;

  // New game mode properties
  gameMode: GameMode;
  gameModeState: GameModeState;
  timers?: PlayerTimers;
  challengeState?: ChallengeState;
  tournamentState?: TournamentState;
}

export interface GameModeState {
  phase: 'setup' | 'active' | 'paused' | 'finished';
  startTime: Date;
  endTime?: Date;
  pausedTime?: number;
  moveCount: number;
  lastMoveTime: Date;
  specialConditions: Record<string, any>;
}

export interface PlayerTimers {
  [userId: string]: {
    remainingTime: number; // Time remaining in seconds
    isActive: boolean; // Whether this player's timer is running
    lastMoveTime: Date; // When the last move was made
    totalMoveTime: number; // Total time spent on moves
    moveCount: number; // Number of moves made
    timeWarnings: ('low' | 'critical')[];
  };
}

export interface ChallengeState {
  attemptNumber: number;
  hintsUsed: number;
  score: number;
  startTime: Date;
  moves: number[];
  isCompleted: boolean;
  isFailed: boolean;
}

export interface TournamentState {
  bracketId: string;
  round: number;
  position: number;
  advancement: 'pending' | 'advanced' | 'eliminated';
}
```

### 1.2 Database Infrastructure Setup ✅ COMPLETED

#### 1.2.1 PostgreSQL Docker Configuration ✅ COMPLETED

**File:** `docker-compose.db.yml`

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    container_name: othello-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-othello}
      POSTGRES_USER: ${POSTGRES_USER:-othello_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-secure_password}
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - '${POSTGRES_PORT:-5432}:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/server/database/init:/docker-entrypoint-initdb.d
      - ./src/server/database/backups:/backups
    networks:
      - othello-network
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-othello_user} -d ${POSTGRES_DB:-othello}']
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  postgres-admin:
    image: dpage/pgadmin4:latest
    container_name: othello-pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL:-admin@othello.local}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD:-admin_password}
      PGADMIN_LISTEN_PORT: 80
    ports:
      - '${PGADMIN_PORT:-5050}:80'
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    networks:
      - othello-network
    depends_on:
      postgres:
        condition: service_healthy
    profiles:
      - admin

volumes:
  postgres_data:
    driver: local
  pgadmin_data:
    driver: local

networks:
  othello-network:
    driver: bridge
```

**File:** `docker-compose.override.yml` (for local development)

```yaml
version: '3.8'
services:
  postgres:
    environment:
      POSTGRES_DB: othello_dev
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - '5433:5432' # Use different port for dev to avoid conflicts
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
      - ./src/server/database/seeds:/docker-entrypoint-initdb.d/seeds

volumes:
  postgres_dev_data:
    driver: local
```

#### 1.2.2 Database Connection and Configuration ✅ COMPLETED

**File:** `src/server/database/Database.ts`

```typescript
import { Pool, Client, PoolConfig } from 'pg';
import { config } from 'dotenv';

config();

export class Database {
  private static instance: Database;
  private pool: Pool;
  private connected: boolean = false;

  private constructor() {
    const dbConfig: PoolConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'othello',
      user: process.env.POSTGRES_USER || 'othello_user',
      password: process.env.POSTGRES_PASSWORD || 'secure_password',

      // Connection pool settings
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),

      // SSL configuration for production
      ssl:
        process.env.NODE_ENV === 'production'
          ? {
              rejectUnauthorized: false,
            }
          : false,
    };

    this.pool = new Pool(dbConfig);

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle database client:', err);
    });

    // Handle pool connection events
    this.pool.on('connect', () => {
      console.log('🔗 Database client connected');
    });

    this.pool.on('remove', () => {
      console.log('🔌 Database client removed');
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();

      this.connected = true;
      console.log('✅ Database connected successfully at:', result.rows[0].now);
    } catch (error) {
      this.connected = false;
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  public async query(text: string, params?: any[]): Promise<any> {
    if (!this.connected) {
      await this.connect();
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Query executed:', { text, duration: `${duration}ms`, rows: result.rowCount });
      }

      return result;
    } catch (error) {
      console.error('❌ Database query failed:', { text, params, error });
      throw error;
    }
  }

  public async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const result = await this.query('SELECT version(), NOW() as current_time');
      return {
        status: 'healthy',
        details: {
          version: result.rows[0].version,
          currentTime: result.rows[0].current_time,
          poolTotalCount: this.pool.totalCount,
          poolIdleCount: this.pool.idleCount,
          poolWaitingCount: this.pool.waitingCount,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    this.connected = false;
    console.log('🔌 Database connection pool closed');
  }
}
```

#### 1.2.3 Database Initialization Scripts ✅ COMPLETED

**File:** `src/server/database/init/001-init-database.sql`

```sql
-- Create database user and set permissions
DO $$
BEGIN
    -- Create user if not exists
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'othello_user') THEN
        CREATE ROLE othello_user LOGIN PASSWORD 'secure_password';
    END IF;
END
$$;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE othello TO othello_user;
GRANT USAGE ON SCHEMA public TO othello_user;
GRANT CREATE ON SCHEMA public TO othello_user;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Create enum types
CREATE TYPE game_mode_category AS ENUM ('timer', 'board-variant', 'special', 'daily-challenge', 'tournament');
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE timer_type AS ENUM ('unlimited', 'fixed', 'increment', 'delay', 'correspondence');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);
CREATE INDEX IF NOT EXISTS idx_games_last_activity ON games(last_activity_at);
```

#### 1.2.4 Database Migration System ✅ COMPLETED

**File:** `src/server/database/migrations/MigrationRunner.ts`

```typescript
import { Database } from '../Database';
import fs from 'fs';
import path from 'path';

interface Migration {
  id: number;
  name: string;
  filename: string;
  executed: boolean;
  executedAt?: Date;
}

export class MigrationRunner {
  private db: Database;
  private migrationsPath: string;

  constructor() {
    this.db = Database.getInstance();
    this.migrationsPath = path.join(__dirname, './');
  }

  public async initialize(): Promise<void> {
    // Create migrations table if it doesn't exist
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  public async runMigrations(): Promise<void> {
    await this.initialize();

    const migrationFiles = this.getMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();

    console.log(`📋 Found ${migrationFiles.length} migration files`);
    console.log(`✅ ${executedMigrations.length} migrations already executed`);

    for (const file of migrationFiles) {
      if (!executedMigrations.includes(file.name)) {
        console.log(`🚀 Running migration: ${file.name}`);
        await this.executeMigration(file);
      }
    }

    console.log('✅ All migrations completed successfully');
  }

  private getMigrationFiles(): Array<{ name: string; filename: string }> {
    const files = fs
      .readdirSync(this.migrationsPath)
      .filter((file) => file.endsWith('.sql') && file.match(/^\d{3}_/))
      .sort()
      .map((filename) => ({
        name: filename.replace('.sql', ''),
        filename,
      }));

    return files;
  }

  private async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await this.db.query('SELECT name FROM schema_migrations ORDER BY id');
      return result.rows.map((row: any) => row.name);
    } catch (error) {
      console.warn('Migration table might not exist yet, will be created');
      return [];
    }
  }

  private async executeMigration(migration: { name: string; filename: string }): Promise<void> {
    const filePath = path.join(this.migrationsPath, migration.filename);
    const sql = fs.readFileSync(filePath, 'utf8');

    await this.db.transaction(async (client) => {
      // Execute the migration SQL
      await client.query(sql);

      // Record the migration as executed
      await client.query('INSERT INTO schema_migrations (name, filename) VALUES ($1, $2)', [
        migration.name,
        migration.filename,
      ]);
    });

    console.log(`✅ Migration completed: ${migration.name}`);
  }

  public async rollbackLastMigration(): Promise<void> {
    // Get the last executed migration
    const result = await this.db.query('SELECT name, filename FROM schema_migrations ORDER BY id DESC LIMIT 1');

    if (result.rows.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const lastMigration = result.rows[0];
    const rollbackFile = lastMigration.filename.replace('.sql', '.rollback.sql');
    const rollbackPath = path.join(this.migrationsPath, rollbackFile);

    if (!fs.existsSync(rollbackPath)) {
      throw new Error(`Rollback file not found: ${rollbackFile}`);
    }

    const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');

    await this.db.transaction(async (client) => {
      // Execute rollback SQL
      await client.query(rollbackSql);

      // Remove migration record
      await client.query('DELETE FROM schema_migrations WHERE name = $1', [lastMigration.name]);
    });

    console.log(`🔄 Rollback completed: ${lastMigration.name}`);
  }
}
```

#### 1.2.5 Database Scripts and Environment Setup ✅ COMPLETED

**File:** `scripts/db-setup.sh`

```bash
#!/bin/bash

# Database setup script for development

set -e

echo "🚀 Setting up Othello database infrastructure..."

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | xargs)
fi

# Function to wait for database to be ready
wait_for_db() {
    echo "⏳ Waiting for database to be ready..."
    until docker exec othello-postgres pg_isready -U ${POSTGRES_USER:-dev_user} -d ${POSTGRES_DB:-othello_dev}; do
        sleep 2
    done
    echo "✅ Database is ready!"
}

# Function to run database migrations
run_migrations() {
    echo "🔄 Running database migrations..."
    npm run db:migrate
    echo "✅ Migrations completed!"
}

# Function to seed database
seed_database() {
    echo "🌱 Seeding database with initial data..."
    npm run db:seed
    echo "✅ Database seeded!"
}

# Main setup process
case "$1" in
    "local")
        echo "🏠 Setting up local development database..."
        docker-compose -f docker-compose.db.yml -f docker-compose.override.yml up -d postgres
        wait_for_db
        run_migrations
        seed_database
        ;;
    "production")
        echo "🏭 Setting up production database..."
        docker-compose -f docker-compose.db.yml up -d postgres
        wait_for_db
        run_migrations
        ;;
    "test")
        echo "🧪 Setting up test database..."
        export POSTGRES_DB=othello_test
        export POSTGRES_PORT=5434
        docker-compose -f docker-compose.db.yml up -d postgres
        wait_for_db
        run_migrations
        ;;
    "admin")
        echo "🔧 Starting database with admin interface..."
        docker-compose -f docker-compose.db.yml --profile admin up -d
        wait_for_db
        echo "📊 PgAdmin available at http://localhost:${PGADMIN_PORT:-5050}"
        ;;
    "clean")
        echo "🧹 Cleaning up database containers and volumes..."
        docker-compose -f docker-compose.db.yml down -v
        docker volume prune -f
        ;;
    *)
        echo "Usage: $0 {local|production|test|admin|clean}"
        echo ""
        echo "Commands:"
        echo "  local      - Setup local development database"
        echo "  production - Setup production database"
        echo "  test       - Setup test database"
        echo "  admin      - Start database with PgAdmin interface"
        echo "  clean      - Remove all database containers and volumes"
        exit 1
        ;;
esac

echo "🎉 Database setup completed!"
```

**File:** `package.json` (script additions)

```json
{
  "scripts": {
    "db:setup": "./scripts/db-setup.sh",
    "db:setup:local": "./scripts/db-setup.sh local",
    "db:setup:prod": "./scripts/db-setup.sh production",
    "db:setup:test": "./scripts/db-setup.sh test",
    "db:admin": "./scripts/db-setup.sh admin",
    "db:clean": "./scripts/db-setup.sh clean",
    "db:migrate": "tsx src/server/database/scripts/migrate.ts",
    "db:rollback": "tsx src/server/database/scripts/rollback.ts",
    "db:seed": "tsx src/server/database/scripts/seed.ts",
    "db:reset": "npm run db:clean && npm run db:setup:local"
  },
  "dependencies": {
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "@types/pg": "^8.10.7"
  }
}
```

**File:** `.env.local.example` (updated)

```bash
# Application Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_DB=othello_dev
POSTGRES_USER=dev_user
POSTGRES_PASSWORD=dev_password

# Database Pool Configuration
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# PgAdmin Configuration (optional)
PGADMIN_EMAIL=admin@othello.local
PGADMIN_PASSWORD=admin_password
PGADMIN_PORT=5050

# Game Mode Configuration
GAME_MODE_CACHE_TTL=300000
TIMER_UPDATE_INTERVAL=1000
GAME_CLEANUP_INTERVAL=3600000
```

### 1.3 Database Schema Extensions

#### 1.3.1 Create Game Modes Table

**File:** `src/server/database/migrations/001_create_game_modes.sql`

```sql
CREATE TABLE game_modes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(20) NOT NULL,
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    minimum_players INTEGER DEFAULT 2,
    maximum_players INTEGER DEFAULT 2,
    estimated_duration INTEGER, -- in minutes
    difficulty_level VARCHAR(20),
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_game_modes_category ON game_modes(category);
CREATE INDEX idx_game_modes_active ON game_modes(is_active);
CREATE INDEX idx_game_modes_difficulty ON game_modes(difficulty_level);
CREATE INDEX idx_game_modes_tags ON game_modes USING GIN(tags);

-- Insert default game modes
INSERT INTO game_modes (id, name, description, category, config, is_default) VALUES
('classic-unlimited', 'Classic Unlimited', 'Traditional Othello with no time limit', 'timer',
 '{"timer": {"type": "unlimited"}, "board": {"width": 8, "height": 8}, "rules": {"allowPass": false, "scoringMethod": "standard"}}',
 true),
('blitz-3-0', 'Blitz 3+0', 'Fast-paced 3-minute games', 'timer',
 '{"timer": {"type": "fixed", "initialTime": 180, "increment": 0, "lowTimeWarning": 30, "criticalTimeWarning": 10}}',
 false),
('mini-6x6', 'Mini Board', 'Quick games on 6x6 board', 'board-variant',
 '{"board": {"width": 6, "height": 6}, "timer": {"type": "unlimited"}}',
 false);
```

#### 1.2.2 Extend Games Table

**File:** `src/server/database/migrations/002_extend_games_table.sql`

```sql
-- Add game mode columns to existing games table
ALTER TABLE games ADD COLUMN game_mode_id VARCHAR(50) REFERENCES game_modes(id);
ALTER TABLE games ADD COLUMN game_mode_state JSONB;
ALTER TABLE games ADD COLUMN timers JSONB;
ALTER TABLE games ADD COLUMN challenge_state JSONB;
ALTER TABLE games ADD COLUMN tournament_state JSONB;

-- Create indexes
CREATE INDEX idx_games_mode_id ON games(game_mode_id);
CREATE INDEX idx_games_mode_state ON games USING GIN(game_mode_state);

-- Update existing games to use default mode
UPDATE games SET game_mode_id = 'classic-unlimited' WHERE game_mode_id IS NULL;
```

#### 1.2.3 Create Daily Challenges Table

**File:** `src/server/database/migrations/003_create_daily_challenges.sql`

```sql
CREATE TABLE daily_challenges (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    game_mode_id VARCHAR(50) NOT NULL REFERENCES game_modes(id),
    puzzle_data JSONB NOT NULL,
    difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE user_challenge_attempts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    challenge_id INTEGER NOT NULL REFERENCES daily_challenges(id),
    attempt_number INTEGER NOT NULL,
    moves INTEGER[],
    is_successful BOOLEAN DEFAULT false,
    hints_used INTEGER DEFAULT 0,
    time_taken INTEGER, -- in seconds
    score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, challenge_id, attempt_number)
);

-- Create indexes
CREATE INDEX idx_daily_challenges_date ON daily_challenges(date);
CREATE INDEX idx_user_attempts_user_id ON user_challenge_attempts(user_id);
CREATE INDEX idx_user_attempts_challenge_id ON user_challenge_attempts(challenge_id);
```

### 1.3 Server-Side Implementation

#### 1.3.1 Create Game Mode Registry Service

**File:** `src/server/services/gameModeRegistry.ts`

```typescript
import { GameMode, GameModeCategory, GameModeConfig } from '../../shared/types/gameModeTypes';
import { Database } from '../database/Database';

export class GameModeRegistry {
  private static instance: GameModeRegistry;
  private gameModesCache: Map<string, GameMode> = new Map();
  private lastCacheUpdate: Date = new Date(0);
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): GameModeRegistry {
    if (!GameModeRegistry.instance) {
      GameModeRegistry.instance = new GameModeRegistry();
    }
    return GameModeRegistry.instance;
  }

  /**
   * Get all active game modes, optionally filtered by category
   */
  public async getGameModes(category?: GameModeCategory): Promise<GameMode[]> {
    await this.refreshCacheIfNeeded();

    const modes = Array.from(this.gameModesCache.values()).filter((mode) => mode.isActive);

    if (category) {
      return modes.filter((mode) => mode.category === category);
    }

    return modes.sort((a, b) => {
      // Sort by: default first, then by category, then by name
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get a specific game mode by ID
   */
  public async getGameMode(id: string): Promise<GameMode | null> {
    await this.refreshCacheIfNeeded();
    return this.gameModesCache.get(id) || null;
  }

  /**
   * Get the default game mode
   */
  public async getDefaultGameMode(): Promise<GameMode> {
    await this.refreshCacheIfNeeded();
    const defaultMode = Array.from(this.gameModesCache.values()).find((mode) => mode.isDefault && mode.isActive);

    if (!defaultMode) {
      throw new Error('No default game mode found');
    }

    return defaultMode;
  }

  /**
   * Validate a game mode configuration
   */
  public validateGameModeConfig(config: GameModeConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate timer configuration
    if (config.timer) {
      if (config.timer.type === 'fixed' || config.timer.type === 'increment') {
        if (config.timer.initialTime <= 0) {
          errors.push('Initial time must be positive');
        }
        if (config.timer.type === 'increment' && config.timer.increment < 0) {
          errors.push('Increment cannot be negative');
        }
      }
      if (config.timer.lowTimeWarning && config.timer.lowTimeWarning <= 0) {
        errors.push('Low time warning must be positive');
      }
      if (config.timer.criticalTimeWarning && config.timer.criticalTimeWarning <= 0) {
        errors.push('Critical time warning must be positive');
      }
    }

    // Validate board configuration
    if (config.board) {
      if (config.board.width < 4 || config.board.width > 12) {
        errors.push('Board width must be between 4 and 12');
      }
      if (config.board.height < 4 || config.board.height > 12) {
        errors.push('Board height must be between 4 and 12');
      }
      if (config.board.width % 2 !== 0 || config.board.height % 2 !== 0) {
        errors.push('Board dimensions must be even numbers');
      }
    }

    // Validate challenge configuration
    if (config.challenge) {
      if (config.challenge.maxAttempts <= 0) {
        errors.push('Max attempts must be positive');
      }
      if (config.challenge.difficulty < 1 || config.challenge.difficulty > 5) {
        errors.push('Difficulty must be between 1 and 5');
      }
      if (!config.challenge.solution.moves || config.challenge.solution.moves.length === 0) {
        errors.push('Challenge must have a solution');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Create a new game mode (admin function)
   */
  public async createGameMode(gameMode: Omit<GameMode, 'createdAt' | 'updatedAt'>): Promise<GameMode> {
    const validation = this.validateGameModeConfig(gameMode.config);
    if (!validation.valid) {
      throw new Error(`Invalid game mode configuration: ${validation.errors.join(', ')}`);
    }

    const now = new Date();
    const fullGameMode: GameMode = {
      ...gameMode,
      createdAt: now,
      updatedAt: now,
    };

    // Insert into database
    const db = Database.getInstance();
    await db.query(
      `INSERT INTO game_modes (id, name, description, category, config, is_active, is_default, 
       minimum_players, maximum_players, estimated_duration, difficulty_level, tags, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        fullGameMode.id,
        fullGameMode.name,
        fullGameMode.description,
        fullGameMode.category,
        JSON.stringify(fullGameMode.config),
        fullGameMode.isActive,
        fullGameMode.isDefault,
        fullGameMode.minimumPlayers,
        fullGameMode.maximumPlayers,
        fullGameMode.estimatedDuration,
        fullGameMode.difficultyLevel,
        fullGameMode.tags,
        fullGameMode.createdAt,
        fullGameMode.updatedAt,
      ],
    );

    // Update cache
    this.gameModesCache.set(fullGameMode.id, fullGameMode);

    return fullGameMode;
  }

  /**
   * Update an existing game mode (admin function)
   */
  public async updateGameMode(id: string, updates: Partial<GameMode>): Promise<GameMode> {
    const existing = await this.getGameMode(id);
    if (!existing) {
      throw new Error(`Game mode ${id} not found`);
    }

    const updated = { ...existing, ...updates, updatedAt: new Date() };

    if (updates.config) {
      const validation = this.validateGameModeConfig(updated.config);
      if (!validation.valid) {
        throw new Error(`Invalid game mode configuration: ${validation.errors.join(', ')}`);
      }
    }

    // Update in database
    const db = Database.getInstance();
    await db.query(
      `UPDATE game_modes SET 
       name = $2, description = $3, category = $4, config = $5, is_active = $6, is_default = $7,
       minimum_players = $8, maximum_players = $9, estimated_duration = $10, difficulty_level = $11,
       tags = $12, updated_at = $13
       WHERE id = $1`,
      [
        id,
        updated.name,
        updated.description,
        updated.category,
        JSON.stringify(updated.config),
        updated.isActive,
        updated.isDefault,
        updated.minimumPlayers,
        updated.maximumPlayers,
        updated.estimatedDuration,
        updated.difficultyLevel,
        updated.tags,
        updated.updatedAt,
      ],
    );

    // Update cache
    this.gameModesCache.set(id, updated);

    return updated;
  }

  /**
   * Delete a game mode (admin function)
   */
  public async deleteGameMode(id: string): Promise<void> {
    const db = Database.getInstance();

    // Check if any active games use this mode
    const activeGames = await db.query(
      'SELECT COUNT(*) as count FROM games WHERE game_mode_id = $1 AND game_finished = false',
      [id],
    );

    if (activeGames.rows[0].count > 0) {
      throw new Error('Cannot delete game mode with active games');
    }

    // Soft delete by setting inactive
    await db.query('UPDATE game_modes SET is_active = false, updated_at = $2 WHERE id = $1', [id, new Date()]);

    // Remove from cache
    this.gameModesCache.delete(id);
  }

  /**
   * Refresh the cache if needed
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = new Date();
    if (now.getTime() - this.lastCacheUpdate.getTime() > this.CACHE_TTL) {
      await this.refreshCache();
    }
  }

  /**
   * Refresh the cache from database
   */
  private async refreshCache(): Promise<void> {
    const db = Database.getInstance();
    const result = await db.query('SELECT * FROM game_modes ORDER BY name');

    this.gameModesCache.clear();

    for (const row of result.rows) {
      const gameMode: GameMode = {
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        config: row.config,
        isActive: row.is_active,
        isDefault: row.is_default,
        minimumPlayers: row.minimum_players,
        maximumPlayers: row.maximum_players,
        estimatedDuration: row.estimated_duration,
        difficultyLevel: row.difficulty_level,
        tags: row.tags || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      this.gameModesCache.set(gameMode.id, gameMode);
    }

    this.lastCacheUpdate = new Date();
  }

  /**
   * Get game mode statistics
   */
  public async getGameModeStats(): Promise<
    Record<string, { totalGames: number; activeGames: number; avgDuration: number }>
  > {
    const db = Database.getInstance();
    const result = await db.query(`
      SELECT 
        gm.id,
        gm.name,
        COUNT(g.id) as total_games,
        COUNT(CASE WHEN g.game_finished = false THEN 1 END) as active_games,
        AVG(EXTRACT(EPOCH FROM (g.last_activity_at - g.created_at)) / 60) as avg_duration_minutes
      FROM game_modes gm
      LEFT JOIN games g ON g.game_mode_id = gm.id
      GROUP BY gm.id, gm.name
      ORDER BY total_games DESC
    `);

    const stats: Record<string, { totalGames: number; activeGames: number; avgDuration: number }> = {};

    for (const row of result.rows) {
      stats[row.id] = {
        totalGames: parseInt(row.total_games),
        activeGames: parseInt(row.active_games),
        avgDuration: parseFloat(row.avg_duration_minutes) || 0,
      };
    }

    return stats;
  }
}
```

#### 1.3.2 Create Game Mode Engine

**File:** `src/server/services/gameModeEngine.ts`

```typescript
import { GameMode, GameModeConfig, GameModeState, PlayerTimers } from '../../shared/types/gameModeTypes';
import { Game } from '../models/Game';
import { ConnectedUser } from '../models/UserManager';

export class GameModeEngine {
  private static instance: GameModeEngine;
  private timers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  public static getInstance(): GameModeEngine {
    if (!GameModeEngine.instance) {
      GameModeEngine.instance = new GameModeEngine();
    }
    return GameModeEngine.instance;
  }

  /**
   * Initialize game mode for a new game
   */
  public initializeGameMode(game: Game, gameMode: GameMode): void {
    // Initialize game mode state
    const gameModeState: GameModeState = {
      phase: 'setup',
      startTime: new Date(),
      endTime: undefined,
      pausedTime: 0,
      moveCount: 0,
      lastMoveTime: new Date(),
      specialConditions: {},
    };

    // Initialize timers if needed
    let timers: PlayerTimers | undefined;
    if (gameMode.config.timer && gameMode.config.timer.type !== 'unlimited') {
      timers = this.initializeTimers(game, gameMode.config.timer);
    }

    // Extend game object with mode-specific properties
    (game as any).gameMode = gameMode;
    (game as any).gameModeState = gameModeState;
    (game as any).timers = timers;
  }

  /**
   * Handle game start with mode-specific logic
   */
  public handleGameStart(game: Game): void {
    const gameMode = (game as any).gameMode as GameMode;
    const gameModeState = (game as any).gameModeState as GameModeState;

    if (!gameMode || !gameModeState) {
      throw new Error('Game mode not initialized');
    }

    // Update game mode state
    gameModeState.phase = 'active';
    gameModeState.startTime = new Date();
    gameModeState.lastMoveTime = new Date();

    // Start timers if applicable
    if (gameMode.config.timer && gameMode.config.timer.type !== 'unlimited') {
      this.startPlayerTimer(game, game.currentPlayer);
    }

    // Apply board configuration
    if (gameMode.config.board) {
      this.applyBoardConfig(game, gameMode.config.board);
    }

    // Apply rule modifications
    if (gameMode.config.rules) {
      this.applyRuleConfig(game, gameMode.config.rules);
    }

    console.log(`Game ${game.id} started with mode: ${gameMode.name}`);
  }

  /**
   * Handle player move with mode-specific logic
   */
  public handlePlayerMove(
    game: Game,
    user: ConnectedUser,
    position: number,
  ): { success: boolean; error?: string; timeExpired?: boolean } {
    const gameMode = (game as any).gameMode as GameMode;
    const gameModeState = (game as any).gameModeState as GameModeState;
    const timers = (game as any).timers as PlayerTimers;

    if (!gameMode || !gameModeState) {
      return { success: false, error: 'Game mode not initialized' };
    }

    // Check if it's the player's turn
    const player = game.players[user.userId];
    if (!player || player.piece !== game.currentPlayer) {
      return { success: false, error: 'Not your turn' };
    }

    // Check timer if applicable
    if (timers && timers[user.userId]) {
      const playerTimer = timers[user.userId];
      if (playerTimer.remainingTime <= 0) {
        this.handleTimeExpiry(game, user.userId);
        return { success: false, error: 'Time expired', timeExpired: true };
      }
    }

    // Execute the move
    const moveResult = game.placePiece(user, position);
    if (!moveResult.success) {
      return moveResult;
    }

    // Update game mode state
    gameModeState.moveCount++;
    gameModeState.lastMoveTime = new Date();

    // Handle timer logic
    if (timers && timers[user.userId]) {
      this.handleMoveTimer(game, user.userId, gameMode.config.timer!);
    }

    // Check for special win conditions
    if (gameMode.config.rules?.winCondition !== 'most-pieces') {
      const specialWin = this.checkSpecialWinCondition(game, gameMode.config.rules!);
      if (specialWin) {
        this.endGame(game, specialWin);
      }
    }

    return { success: true };
  }

  /**
   * Handle game pause (for timer games)
   */
  public pauseGame(game: Game, reason: string): void {
    const gameMode = (game as any).gameMode as GameMode;
    const gameModeState = (game as any).gameModeState as GameModeState;
    const timers = (game as any).timers as PlayerTimers;

    if (!gameMode || !gameModeState) {
      return;
    }

    if (gameModeState.phase === 'active') {
      gameModeState.phase = 'paused';

      // Stop all timers
      if (timers) {
        Object.keys(timers).forEach((userId) => {
          if (timers[userId].isActive) {
            this.stopPlayerTimer(game, userId);
          }
        });
      }

      console.log(`Game ${game.id} paused: ${reason}`);
    }
  }

  /**
   * Handle game resume (for timer games)
   */
  public resumeGame(game: Game): void {
    const gameMode = (game as any).gameMode as GameMode;
    const gameModeState = (game as any).gameModeState as GameModeState;
    const timers = (game as any).timers as PlayerTimers;

    if (!gameMode || !gameModeState) {
      return;
    }

    if (gameModeState.phase === 'paused') {
      gameModeState.phase = 'active';

      // Resume current player's timer
      if (timers && gameMode.config.timer?.type !== 'unlimited') {
        this.startPlayerTimer(game, game.currentPlayer);
      }

      console.log(`Game ${game.id} resumed`);
    }
  }

  /**
   * Handle time expiry for a player
   */
  private handleTimeExpiry(game: Game, userId: string): void {
    const gameMode = (game as any).gameMode as GameMode;

    if (gameMode.config.timer?.autoFlagOnTimeout) {
      // End game due to timeout
      this.endGame(game, { winner: this.getOpponentUserId(game, userId), reason: 'timeout' });
    }
  }

  /**
   * Initialize timers for players
   */
  private initializeTimers(game: Game, timerConfig: any): PlayerTimers {
    const timers: PlayerTimers = {};

    Object.keys(game.players).forEach((userId) => {
      timers[userId] = {
        remainingTime: timerConfig.initialTime,
        isActive: false,
        lastMoveTime: new Date(),
        totalMoveTime: 0,
        moveCount: 0,
        timeWarnings: [],
      };
    });

    return timers;
  }

  /**
   * Start a player's timer
   */
  private startPlayerTimer(game: Game, piece: string): void {
    const timers = (game as any).timers as PlayerTimers;
    if (!timers) return;

    // Find the player with the given piece
    const userId = Object.keys(game.players).find((id) => game.players[id].piece === piece);
    if (!userId || !timers[userId]) return;

    const playerTimer = timers[userId];
    playerTimer.isActive = true;
    playerTimer.lastMoveTime = new Date();

    // Set up timer countdown
    const timerInterval = setInterval(() => {
      if (playerTimer.remainingTime <= 0) {
        clearInterval(timerInterval);
        this.handleTimeExpiry(game, userId);
        return;
      }

      playerTimer.remainingTime--;

      // Check for time warnings
      const gameMode = (game as any).gameMode as GameMode;
      if (gameMode.config.timer) {
        if (playerTimer.remainingTime === gameMode.config.timer.lowTimeWarning) {
          playerTimer.timeWarnings.push('low');
          this.emitTimerWarning(game, userId, 'low');
        } else if (playerTimer.remainingTime === gameMode.config.timer.criticalTimeWarning) {
          playerTimer.timeWarnings.push('critical');
          this.emitTimerWarning(game, userId, 'critical');
        }
      }
    }, 1000);

    this.timers.set(`${game.id}-${userId}`, timerInterval);
  }

  /**
   * Stop a player's timer
   */
  private stopPlayerTimer(game: Game, userId: string): void {
    const timers = (game as any).timers as PlayerTimers;
    if (!timers || !timers[userId]) return;

    const playerTimer = timers[userId];
    playerTimer.isActive = false;

    // Clear the timer interval
    const timerKey = `${game.id}-${userId}`;
    const timerInterval = this.timers.get(timerKey);
    if (timerInterval) {
      clearInterval(timerInterval);
      this.timers.delete(timerKey);
    }
  }

  /**
   * Handle move timer logic (increment, delay, etc.)
   */
  private handleMoveTimer(game: Game, userId: string, timerConfig: any): void {
    const timers = (game as any).timers as PlayerTimers;
    if (!timers || !timers[userId]) return;

    const playerTimer = timers[userId];

    // Stop current player's timer
    this.stopPlayerTimer(game, userId);

    // Apply increment/delay
    if (timerConfig.type === 'increment') {
      playerTimer.remainingTime = Math.min(
        playerTimer.remainingTime + timerConfig.increment,
        timerConfig.maxTime || Infinity,
      );
    }

    playerTimer.moveCount++;
    playerTimer.totalMoveTime += new Date().getTime() - playerTimer.lastMoveTime.getTime();

    // Start next player's timer
    this.startPlayerTimer(game, game.currentPlayer);
  }

  /**
   * Apply board configuration to game
   */
  private applyBoardConfig(game: Game, boardConfig: any): void {
    // This will be implemented when we extend the Board class
    // For now, we'll store the config for later use
    (game as any).boardConfig = boardConfig;
  }

  /**
   * Apply rule configuration to game
   */
  private applyRuleConfig(game: Game, rulesConfig: any): void {
    // This will be implemented when we extend the game rules
    // For now, we'll store the config for later use
    (game as any).rulesConfig = rulesConfig;
  }

  /**
   * Check for special win conditions
   */
  private checkSpecialWinCondition(game: Game, rulesConfig: any): { winner: string; reason: string } | null {
    // This will be implemented based on the specific rule configurations
    // For now, return null (no special win condition met)
    return null;
  }

  /**
   * End the game with a specific result
   */
  private endGame(game: Game, result: { winner: string; reason: string }): void {
    game.gameFinished = true;
    const gameModeState = (game as any).gameModeState as GameModeState;

    if (gameModeState) {
      gameModeState.phase = 'finished';
      gameModeState.endTime = new Date();
    }

    // Stop all timers
    Object.keys(game.players).forEach((userId) => {
      this.stopPlayerTimer(game, userId);
    });

    console.log(`Game ${game.id} ended: ${result.winner} wins by ${result.reason}`);
  }

  /**
   * Get opponent user ID
   */
  private getOpponentUserId(game: Game, userId: string): string {
    const userIds = Object.keys(game.players);
    return userIds.find((id) => id !== userId) || '';
  }

  /**
   * Emit timer warning to client
   */
  private emitTimerWarning(game: Game, userId: string, type: 'low' | 'critical'): void {
    // This will be implemented when we add WebSocket events
    console.log(`Timer warning for ${userId} in game ${game.id}: ${type}`);
  }

  /**
   * Clean up timers when game ends
   */
  public cleanup(gameId: string): void {
    const timersToRemove = Array.from(this.timers.keys()).filter((key) => key.startsWith(`${gameId}-`));

    timersToRemove.forEach((timerKey) => {
      const timer = this.timers.get(timerKey);
      if (timer) {
        clearInterval(timer);
        this.timers.delete(timerKey);
      }
    });
  }
}
```

### 1.4 API Endpoints and Socket Events

#### 1.4.1 Extend Socket Events

**File:** `src/shared/SocketEvents.ts`

```typescript
export const SocketEvents = {
  // Existing events
  ClientConnected: 'ClientConnected',
  UserJoined: 'UserJoined',
  UserLeft: 'UserLeft',
  Disconnected: 'disconnect',
  Connected: 'connection',
  PlacePiece: 'PlacePiece',
  HostNewGame: 'HostNewGame',
  JoinGame: 'JoinGame',
  JoinedGame: 'JoinedGame',
  StartGame: 'StartGame',
  CreateDummyGame: 'CreateDummyGame',
  GetMyActiveGames: 'GetMyActiveGames',
  MyActiveGamesUpdated: 'MyActiveGamesUpdated',
  GameUpdated: (gameId: string) => `Game_${gameId}_Updated`,

  // New game mode events
  GetGameModes: 'GetGameModes',
  GameModesUpdated: 'GameModesUpdated',
  HostNewGameWithMode: 'HostNewGameWithMode',
  JoinGameWithMode: 'JoinGameWithMode',

  // Timer events
  TimerUpdated: (gameId: string) => `Timer_${gameId}_Updated`,
  TimerWarning: (gameId: string) => `Timer_${gameId}_Warning`,
  TimeExpired: (gameId: string) => `Timer_${gameId}_Expired`,

  // Game mode state events
  GameModeStateUpdated: (gameId: string) => `GameModeState_${gameId}_Updated`,
  GamePaused: (gameId: string) => `Game_${gameId}_Paused`,
  GameResumed: (gameId: string) => `Game_${gameId}_Resumed`,

  // Challenge events
  GetDailyChallenge: 'GetDailyChallenge',
  SubmitChallengeAttempt: 'SubmitChallengeAttempt',
  ChallengeUpdated: 'ChallengeUpdated',

  // Admin events
  CreateGameMode: 'CreateGameMode',
  UpdateGameMode: 'UpdateGameMode',
  DeleteGameMode: 'DeleteGameMode',
  GetGameModeStats: 'GetGameModeStats',
};
```

#### 1.4.2 Create Game Mode API Endpoints

**File:** `src/server/api/gameModeRoutes.ts`

```typescript
import { Router } from 'express';
import { GameModeRegistry } from '../services/gameModeRegistry';
import { GameModeEngine } from '../services/gameModeEngine';
import { GameManager } from '../models/GameManager';
import { GameModeCategory } from '../../shared/types/gameModeTypes';

const router = Router();
const registry = GameModeRegistry.getInstance();
const engine = GameModeEngine.getInstance();
const gameManager = GameManager.getInstance();

/**
 * GET /api/game-modes
 * Get all available game modes, optionally filtered by category
 */
router.get('/game-modes', async (req, res) => {
  try {
    const category = req.query.category as GameModeCategory;
    const gameModes = await registry.getGameModes(category);

    res.json({
      success: true,
      data: gameModes,
      total: gameModes.length,
    });
  } catch (error) {
    console.error('Error fetching game modes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game modes',
    });
  }
});

/**
 * GET /api/game-modes/:id
 * Get a specific game mode by ID
 */
router.get('/game-modes/:id', async (req, res) => {
  try {
    const gameMode = await registry.getGameMode(req.params.id);

    if (!gameMode) {
      return res.status(404).json({
        success: false,
        error: 'Game mode not found',
      });
    }

    res.json({
      success: true,
      data: gameMode,
    });
  } catch (error) {
    console.error('Error fetching game mode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game mode',
    });
  }
});

/**
 * GET /api/game-modes/default
 * Get the default game mode
 */
router.get('/game-modes/default', async (req, res) => {
  try {
    const defaultMode = await registry.getDefaultGameMode();

    res.json({
      success: true,
      data: defaultMode,
    });
  } catch (error) {
    console.error('Error fetching default game mode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch default game mode',
    });
  }
});

/**
 * POST /api/game-modes
 * Create a new game mode (admin only)
 */
router.post('/game-modes', async (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    const gameMode = await registry.createGameMode(req.body);

    res.status(201).json({
      success: true,
      data: gameMode,
    });
  } catch (error) {
    console.error('Error creating game mode:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create game mode',
    });
  }
});

/**
 * PUT /api/game-modes/:id
 * Update an existing game mode (admin only)
 */
router.put('/game-modes/:id', async (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    const gameMode = await registry.updateGameMode(req.params.id, req.body);

    res.json({
      success: true,
      data: gameMode,
    });
  } catch (error) {
    console.error('Error updating game mode:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update game mode',
    });
  }
});

/**
 * DELETE /api/game-modes/:id
 * Delete a game mode (admin only)
 */
router.delete('/game-modes/:id', async (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    await registry.deleteGameMode(req.params.id);

    res.json({
      success: true,
      message: 'Game mode deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting game mode:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete game mode',
    });
  }
});

/**
 * GET /api/game-modes/stats
 * Get game mode statistics (admin only)
 */
router.get('/game-modes/stats', async (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    const stats = await registry.getGameModeStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching game mode stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game mode statistics',
    });
  }
});

/**
 * POST /api/games/:id/pause
 * Pause a game (for timer-based games)
 */
router.post('/games/:id/pause', async (req, res) => {
  try {
    const game = gameManager.getGame(req.params.id);
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
      });
    }

    engine.pauseGame(game, req.body.reason || 'Manual pause');

    res.json({
      success: true,
      message: 'Game paused successfully',
    });
  } catch (error) {
    console.error('Error pausing game:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to pause game',
    });
  }
});

/**
 * POST /api/games/:id/resume
 * Resume a paused game
 */
router.post('/games/:id/resume', async (req, res) => {
  try {
    const game = gameManager.getGame(req.params.id);
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
      });
    }

    engine.resumeGame(game);

    res.json({
      success: true,
      message: 'Game resumed successfully',
    });
  } catch (error) {
    console.error('Error resuming game:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resume game',
    });
  }
});

export default router;
```

#### 1.4.3 Update Socket Handlers

**File:** `src/server/sockets/gameSocketHandlers.ts`

```typescript
import { Server, Socket } from 'socket.io';
import { GameManager } from '../models/GameManager';
import { UserManager } from '../models/UserManager';
import { GameModeRegistry } from '../services/gameModeRegistry';
import { GameModeEngine } from '../services/gameModeEngine';
import { SocketEvents } from '../../shared/SocketEvents';
import { GameMode } from '../../shared/types/gameModeTypes';

const gameManager = GameManager.getInstance();
const userManager = UserManager.getInstance();
const registry = GameModeRegistry.getInstance();
const engine = GameModeEngine.getInstance();

export const handleGameSockets = (io: Server, socket: Socket) => {
  // Existing handlers...

  /**
   * Handle getting available game modes
   */
  socket.on(SocketEvents.GetGameModes, async (category, callback) => {
    try {
      const gameModes = await registry.getGameModes(category);
      callback({ success: true, data: gameModes });
    } catch (error) {
      console.error('Error fetching game modes:', error);
      callback({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch game modes',
      });
    }
  });

  /**
   * Handle hosting a new game with a specific mode
   */
  socket.on(SocketEvents.HostNewGameWithMode, async (userId, userName, gameModeId, callback) => {
    try {
      const user = { userId, name: userName, socketId: socket.id };
      const connectedUser = userManager.addUser(user);

      // Get the game mode
      const gameMode = await registry.getGameMode(gameModeId);
      if (!gameMode) {
        callback({ success: false, error: 'Invalid game mode' });
        return;
      }

      // Create the game
      const game = gameManager.createGame();
      const result = game.addOrUpdatePlayer(connectedUser);

      if (result.success) {
        // Initialize game mode
        engine.initializeGameMode(game, gameMode);

        // Join socket room
        socket.join(game.id);

        // Emit game state
        io.to(game.id).emit(SocketEvents.GameUpdated(game.id), {
          ...game.getGameData(),
          gameMode,
          gameModeState: (game as any).gameModeState,
          timers: (game as any).timers,
        });

        callback({ success: true, gameId: game.id });
        console.log(`Game ${game.id} created with mode ${gameMode.name} by ${userName}`);
      } else {
        callback({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error hosting game with mode:', error);
      callback({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create game',
      });
    }
  });

  /**
   * Handle joining a game with mode awareness
   */
  socket.on(SocketEvents.JoinGameWithMode, async (userId, userName, gameId, callback) => {
    try {
      const user = { userId, name: userName, socketId: socket.id };
      const connectedUser = userManager.addUser(user);

      const game = gameManager.getGame(gameId);
      if (!game) {
        callback({ success: false, error: 'Game not found' });
        return;
      }

      const result = game.addOrUpdatePlayer(connectedUser);

      if (result.success) {
        socket.join(gameId);

        // Emit updated game state with mode info
        io.to(gameId).emit(SocketEvents.GameUpdated(gameId), {
          ...game.getGameData(),
          gameMode: (game as any).gameMode,
          gameModeState: (game as any).gameModeState,
          timers: (game as any).timers,
        });

        callback({ success: true });
        console.log(`${userName} joined game ${gameId}`);
      } else {
        callback({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error joining game:', error);
      callback({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join game',
      });
    }
  });

  /**
   * Handle starting a game with mode-specific logic
   */
  socket.on(SocketEvents.StartGame, async (gameId, callback) => {
    try {
      const game = gameManager.getGame(gameId);
      if (!game) {
        callback({ success: false, error: 'Game not found' });
        return;
      }

      // Start the game
      game.startGame();

      // Handle mode-specific start logic
      engine.handleGameStart(game);

      // Emit updated game state
      io.to(gameId).emit(SocketEvents.GameUpdated(gameId), {
        ...game.getGameData(),
        gameMode: (game as any).gameMode,
        gameModeState: (game as any).gameModeState,
        timers: (game as any).timers,
      });

      callback({ success: true });
      console.log(`Game ${gameId} started`);
    } catch (error) {
      console.error('Error starting game:', error);
      callback({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start game',
      });
    }
  });

  /**
   * Handle placing a piece with mode-specific logic
   */
  socket.on(SocketEvents.PlacePiece, async (gameId, userId, placeId, callback) => {
    try {
      const game = gameManager.getGame(gameId);
      if (!game) {
        callback({ success: false, error: 'Game not found' });
        return;
      }

      const user = userManager.getUser(userId);
      if (!user) {
        callback({ success: false, error: 'User not found' });
        return;
      }

      // Use game mode engine to handle the move
      const result = engine.handlePlayerMove(game, user, placeId);

      if (result.success) {
        // Emit updated game state
        io.to(gameId).emit(SocketEvents.GameUpdated(gameId), {
          ...game.getGameData(),
          gameMode: (game as any).gameMode,
          gameModeState: (game as any).gameModeState,
          timers: (game as any).timers,
        });

        // Emit timer updates if applicable
        const timers = (game as any).timers;
        if (timers) {
          io.to(gameId).emit(SocketEvents.TimerUpdated(gameId), timers);
        }

        callback({ success: true });
      } else {
        callback({ success: false, error: result.error });

        // Handle time expiry
        if (result.timeExpired) {
          io.to(gameId).emit(SocketEvents.TimeExpired(gameId), { userId });
        }
      }
    } catch (error) {
      console.error('Error placing piece:', error);
      callback({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to place piece',
      });
    }
  });

  /**
   * Handle user disconnection with timer pause
   */
  socket.on(SocketEvents.Disconnected, () => {
    const user = userManager.getUserBySocketId(socket.id);
    if (user) {
      const activeGames = gameManager.getActiveGamesForUser(user.userId);

      // Pause games if they have timers and allow pause on disconnect
      activeGames.forEach((game) => {
        const gameMode = (game as any).gameMode as GameMode;
        if (gameMode?.config.timer?.pauseOnDisconnect) {
          engine.pauseGame(game, 'Player disconnected');

          // Emit game state update
          io.to(game.id).emit(SocketEvents.GameUpdated(game.id), {
            ...game.getGameData(),
            gameMode,
            gameModeState: (game as any).gameModeState,
            timers: (game as any).timers,
          });
        }
      });

      userManager.removeUser(user.userId);
    }
  });

  /**
   * Handle user reconnection with timer resume
   */
  socket.on(SocketEvents.UserJoined, async (userId, userName) => {
    const user = { userId, name: userName, socketId: socket.id };
    userManager.addUser(user);

    const activeGames = gameManager.getActiveGamesForUser(userId);

    // Resume paused games
    activeGames.forEach((game) => {
      const gameMode = (game as any).gameMode as GameMode;
      const gameModeState = (game as any).gameModeState;

      if (gameMode?.config.timer?.pauseOnDisconnect && gameModeState?.phase === 'paused') {
        engine.resumeGame(game);

        // Join socket room
        socket.join(game.id);

        // Emit game state update
        io.to(game.id).emit(SocketEvents.GameUpdated(game.id), {
          ...game.getGameData(),
          gameMode,
          gameModeState: (game as any).gameModeState,
          timers: (game as any).timers,
        });
      }
    });
  });
};

/**
 * Timer update broadcaster
 * Broadcasts timer updates to all active games with timers
 */
export const startTimerBroadcaster = (io: Server) => {
  setInterval(() => {
    const activeGames = gameManager.getAllActiveGames();

    activeGames.forEach((game) => {
      const timers = (game as any).timers;
      if (timers) {
        io.to(game.id).emit(SocketEvents.TimerUpdated(game.id), timers);
      }
    });
  }, 1000); // Update every second
};
```

#### 1.4.4 Update Game Manager

**File:** `src/server/models/GameManager.ts` (modifications)

```typescript
// Add these methods to the existing GameManager class

/**
 * Get all active games
 */
public getAllActiveGames(): Game[] {
  return Array.from(this.games.values()).filter(game => !game.gameFinished);
}

/**
 * Get active games for a specific user
 */
public getActiveGamesForUser(userId: string): Game[] {
  return this.getAllActiveGames().filter(game =>
    game.players[userId] && !game.gameFinished
  );
}

/**
 * Clean up finished games and their timers
 */
public cleanupFinishedGames(): void {
  const gamesToRemove: string[] = [];

  this.games.forEach((game, gameId) => {
    if (game.gameFinished) {
      const timeSinceFinish = Date.now() - game.lastActivityAt.getTime();
      const oneHour = 60 * 60 * 1000;

      if (timeSinceFinish > oneHour) {
        // Clean up timers
        const engine = GameModeEngine.getInstance();
        engine.cleanup(gameId);

        gamesToRemove.push(gameId);
      }
    }
  });

  gamesToRemove.forEach(gameId => {
    this.games.delete(gameId);
  });

  console.log(`Cleaned up ${gamesToRemove.length} finished games`);
}
```

### 1.5 Client-Side Implementation

#### 1.5.1 Create Game Mode Context

**File:** `src/client/contexts/GameModeContext.tsx`

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GameMode, GameModeCategory } from '../../shared/types/gameModeTypes';
import { useSocket } from '../utils/socketHooks';
import { SocketEvents } from '../../shared/SocketEvents';

interface GameModeContextType {
  gameModes: GameMode[];
  selectedGameMode: GameMode | null;
  loading: boolean;
  error: string | null;
  setSelectedGameMode: (mode: GameMode | null) => void;
  refreshGameModes: () => void;
  getGameModesByCategory: (category: GameModeCategory) => GameMode[];
  getDefaultGameMode: () => GameMode | null;
}

const GameModeContext = createContext<GameModeContextType | undefined>(undefined);

export const GameModeProvider = ({ children }: { children: ReactNode }) => {
  const [gameModes, setGameModes] = useState<GameMode[]>([]);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocket();

  // Load game modes on mount
  useEffect(() => {
    refreshGameModes();
  }, [socket]);

  // Set default game mode when modes are loaded
  useEffect(() => {
    if (gameModes.length > 0 && !selectedGameMode) {
      const defaultMode = gameModes.find(mode => mode.isDefault);
      if (defaultMode) {
        setSelectedGameMode(defaultMode);
      }
    }
  }, [gameModes, selectedGameMode]);

  const refreshGameModes = () => {
    if (!socket) return;

    setLoading(true);
    setError(null);

    socket.emit(SocketEvents.GetGameModes, undefined, (response: any) => {
      if (response.success) {
        setGameModes(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to load game modes');
      }
      setLoading(false);
    });
  };

  const getGameModesByCategory = (category: GameModeCategory): GameMode[] => {
    return gameModes.filter(mode => mode.category === category);
  };

  const getDefaultGameMode = (): GameMode | null => {
    return gameModes.find(mode => mode.isDefault) || null;
  };

  const value: GameModeContextType = {
    gameModes,
    selectedGameMode,
    loading,
    error,
    setSelectedGameMode,
    refreshGameModes,
    getGameModesByCategory,
    getDefaultGameMode,
  };

  return (
    <GameModeContext.Provider value={value}>
      {children}
    </GameModeContext.Provider>
  );
};

export const useGameModes = (): GameModeContextType => {
  const context = useContext(GameModeContext);
  if (!context) {
    throw new Error('useGameModes must be used within a GameModeProvider');
  }
  return context;
};
```

#### 1.5.2 Create Game Mode Selection Component

**File:** `src/client/components/GameModeSelector/GameModeSelector.tsx`

```typescript
import { useState, useEffect } from 'react';
import { GameMode, GameModeCategory } from '../../../shared/types/gameModeTypes';
import { useGameModes } from '../../contexts/GameModeContext';
import './game-mode-selector.scss';

interface GameModeSelectorProps {
  onModeSelect: (mode: GameMode) => void;
  selectedModeId?: string;
  showDescription?: boolean;
  compact?: boolean;
}

export const GameModeSelector = ({
  onModeSelect,
  selectedModeId,
  showDescription = true,
  compact = false
}: GameModeSelectorProps) => {
  const { gameModes, loading, error } = useGameModes();
  const [selectedCategory, setSelectedCategory] = useState<GameModeCategory | 'all'>('all');
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);

  // Set initial selected mode
  useEffect(() => {
    if (selectedModeId && gameModes.length > 0) {
      const mode = gameModes.find(m => m.id === selectedModeId);
      if (mode) {
        setSelectedMode(mode);
      }
    } else if (gameModes.length > 0 && !selectedMode) {
      const defaultMode = gameModes.find(m => m.isDefault);
      if (defaultMode) {
        setSelectedMode(defaultMode);
        onModeSelect(defaultMode);
      }
    }
  }, [selectedModeId, gameModes, selectedMode, onModeSelect]);

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
    onModeSelect(mode);
  };

  const filteredModes = selectedCategory === 'all'
    ? gameModes
    : gameModes.filter(mode => mode.category === selectedCategory);

  const categories: Array<{ id: GameModeCategory | 'all'; name: string; icon: string }> = [
    { id: 'all', name: 'All Modes', icon: '🎮' },
    { id: 'timer', name: 'Timer Games', icon: '⏰' },
    { id: 'board-variant', name: 'Board Variants', icon: '🎲' },
    { id: 'special', name: 'Special Rules', icon: '⭐' },
    { id: 'daily-challenge', name: 'Daily Challenge', icon: '🏆' },
  ];

  const getEstimatedDurationText = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'beginner': return '#4CAF50';
      case 'intermediate': return '#FF9800';
      case 'advanced': return '#F44336';
      case 'expert': return '#9C27B0';
      default: return '#757575';
    }
  };

  if (loading) {
    return (
      <div className="game-mode-selector loading">
        <div className="loading-spinner">Loading game modes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-mode-selector error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>Error loading game modes: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`game-mode-selector ${compact ? 'compact' : ''}`}>
      {/* Category Filter */}
      <div className="category-filter">
        <h3>Game Mode Categories</h3>
        <div className="category-buttons">
          {categories.map(category => (
            <button
              key={category.id}
              className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Game Mode Grid */}
      <div className="game-modes-grid">
        {filteredModes.map(mode => (
          <div
            key={mode.id}
            className={`game-mode-card ${selectedMode?.id === mode.id ? 'selected' : ''}`}
            onClick={() => handleModeSelect(mode)}
          >
            <div className="mode-header">
              <h4 className="mode-name">{mode.name}</h4>
              <div className="mode-badges">
                {mode.isDefault && <span className="badge default">Default</span>}
                <span
                  className="badge difficulty"
                  style={{ backgroundColor: getDifficultyColor(mode.difficultyLevel) }}
                >
                  {mode.difficultyLevel}
                </span>
              </div>
            </div>

            {showDescription && (
              <p className="mode-description">{mode.description}</p>
            )}

            <div className="mode-info">
              <div className="info-row">
                <span className="info-label">Duration:</span>
                <span className="info-value">
                  {mode.estimatedDuration ? getEstimatedDurationText(mode.estimatedDuration) : 'Variable'}
                </span>
              </div>

              {mode.config.timer && (
                <div className="info-row">
                  <span className="info-label">Timer:</span>
                  <span className="info-value">
                    {mode.config.timer.type === 'unlimited' ? 'No time limit' :
                     mode.config.timer.type === 'fixed' ? `${mode.config.timer.initialTime}s` :
                     `${mode.config.timer.initialTime}s + ${mode.config.timer.increment}s`}
                  </span>
                </div>
              )}

              {mode.config.board && (
                <div className="info-row">
                  <span className="info-label">Board:</span>
                  <span className="info-value">
                    {mode.config.board.width}x{mode.config.board.height}
                  </span>
                </div>
              )}

              {mode.tags.length > 0 && (
                <div className="mode-tags">
                  {mode.tags.map(tag => (
                    <span key={tag} className="tag">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredModes.length === 0 && (
        <div className="no-modes">
          <span className="no-modes-icon">🎮</span>
          <p>No game modes available in this category.</p>
        </div>
      )}
    </div>
  );
};
```

#### 1.5.3 Create Game Mode Selector Styles

**File:** `src/client/components/GameModeSelector/game-mode-selector.scss`

```scss
.game-mode-selector {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  &.compact {
    padding: 16px;
    gap: 16px;
  }

  &.loading,
  &.error {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }

  .loading-spinner {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #d4af37;
    font-size: 16px;
    font-weight: 500;

    &::before {
      content: '';
      width: 20px;
      height: 20px;
      border: 2px solid #d4af37;
      border-top: 2px solid transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #ff6b6b;
    font-size: 16px;
    font-weight: 500;
    text-align: center;
    background: rgba(255, 107, 107, 0.1);
    padding: 16px 24px;
    border-radius: 8px;
    border: 1px solid rgba(255, 107, 107, 0.3);
  }

  .category-filter {
    h3 {
      color: #d4af37;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      text-align: center;
    }

    .category-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
    }

    .category-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(212, 175, 55, 0.3);
      }

      &.active {
        background: rgba(212, 175, 55, 0.2);
        border-color: #d4af37;
        color: #d4af37;
      }

      .category-icon {
        font-size: 16px;
      }
    }
  }

  .game-modes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;

    .compact & {
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 12px;
    }
  }

  .game-mode-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(212, 175, 55, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    &.selected {
      background: rgba(212, 175, 55, 0.15);
      border-color: #d4af37;
      box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.3);
    }

    .mode-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;

      .mode-name {
        color: #ffffff;
        font-size: 18px;
        font-weight: 600;
        margin: 0;
      }

      .mode-badges {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;

        &.default {
          background: rgba(76, 175, 80, 0.2);
          color: #4caf50;
          border: 1px solid rgba(76, 175, 80, 0.3);
        }

        &.difficulty {
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
      }
    }

    .mode-description {
      color: #cccccc;
      font-size: 14px;
      line-height: 1.4;
      margin-bottom: 16px;
      opacity: 0.9;
    }

    .mode-info {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .info-label {
          color: #888888;
          font-size: 13px;
          font-weight: 500;
        }

        .info-value {
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
        }
      }

      .mode-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 8px;

        .tag {
          background: rgba(255, 255, 255, 0.1);
          color: #d4af37;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }
      }
    }
  }

  .no-modes {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    text-align: center;
    color: #888888;

    .no-modes-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    p {
      font-size: 16px;
      margin: 0;
    }
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

// Responsive design
@media (max-width: 768px) {
  .game-mode-selector {
    padding: 16px;
    gap: 16px;

    .category-filter {
      .category-buttons {
        justify-content: flex-start;
        overflow-x: auto;
        padding-bottom: 8px;
      }

      .category-btn {
        flex-shrink: 0;
        padding: 10px 14px;
        font-size: 13px;
      }
    }

    .game-modes-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .game-mode-card {
      padding: 16px;

      .mode-header {
        flex-direction: column;
        gap: 8px;
        align-items: flex-start;

        .mode-name {
          font-size: 16px;
        }
      }

      .mode-description {
        font-size: 13px;
      }
    }
  }
}
```

#### 1.5.4 Update Host Game Menu

**File:** `src/client/components/MainMenu/HostGameMenu.tsx` (modifications)

```typescript
import { FormEventHandler, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketEvents } from '../../../shared/SocketEvents';
import { GameMode } from '../../../shared/types/gameModeTypes';
import { useGameView } from '../../contexts/GameViewContext';
import { useGameModes } from '../../contexts/GameModeContext';
import { useLocalStorage } from '../../utils/hooks';
import { useSocket } from '../../utils/socketHooks';
import { GameModeSelector } from '../GameModeSelector/GameModeSelector';
import './game-forms.scss';

export const HostGameMenu = () => {
  const { socket, localUserId } = useSocket();
  const navigate = useNavigate();
  const [userName, setUsername] = useLocalStorage('username', '');
  const [localUserName, setLocalUserName] = useState(userName);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const { setCurrentView } = useGameView();
  const { getDefaultGameMode } = useGameModes();

  useEffect(() => {
    setCurrentView('form');

    // Set default game mode
    const defaultMode = getDefaultGameMode();
    if (defaultMode) {
      setSelectedGameMode(defaultMode);
    }
  }, [setCurrentView, getDefaultGameMode]);

  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!socket || !localUserName.trim() || !selectedGameMode) {
      return;
    }

    setIsCreating(true);
    setUsername(localUserName);

    socket.emit(SocketEvents.HostNewGameWithMode,
      localUserId,
      localUserName.trim(),
      selectedGameMode.id,
      (response: any) => {
        setIsCreating(false);

        if (response.success) {
          console.log(`Game created with mode ${selectedGameMode.name}:`, response.gameId);
          navigate(`/game/${response.gameId}`);
        } else {
          console.error('Failed to create game:', response.error);
          // TODO: Show error message to user
        }
      }
    );
  };

  const handleModeSelect = (mode: GameMode) => {
    setSelectedGameMode(mode);
    setShowModeSelector(false);
  };

  return (
    <div id="host-game-menu" className="game-form-container">
      <div className="form-header">
        <h1 className="form-title">Host New Game</h1>
        <p className="form-subtitle">Create a game and invite a friend to play</p>
      </div>

      <form className="game-form" onSubmit={onSubmit}>
        <input
          id="username"
          type="text"
          placeholder="Enter your username"
          value={localUserName}
          onChange={(e) => setLocalUserName(e.target.value)}
          disabled={isCreating}
          required
          minLength={1}
          maxLength={20}
        />

        {/* Game Mode Selection */}
        <div className="game-mode-selection">
          <label htmlFor="game-mode">Game Mode:</label>
          <div className="selected-mode-display">
            {selectedGameMode ? (
              <div className="mode-info">
                <div className="mode-name">{selectedGameMode.name}</div>
                <div className="mode-description">{selectedGameMode.description}</div>
                <div className="mode-details">
                  {selectedGameMode.config.timer && (
                    <span className="detail">
                      Timer: {selectedGameMode.config.timer.type === 'unlimited' ? 'None' :
                             selectedGameMode.config.timer.type === 'fixed' ? `${selectedGameMode.config.timer.initialTime}s` :
                             `${selectedGameMode.config.timer.initialTime}s + ${selectedGameMode.config.timer.increment}s`}
                    </span>
                  )}
                  {selectedGameMode.config.board && (
                    <span className="detail">
                      Board: {selectedGameMode.config.board.width}x{selectedGameMode.config.board.height}
                    </span>
                  )}
                  <span className="detail">
                    Duration: ~{selectedGameMode.estimatedDuration || 'Variable'} min
                  </span>
                </div>
              </div>
            ) : (
              <div className="no-mode-selected">No game mode selected</div>
            )}
            <button
              type="button"
              className="change-mode-btn"
              onClick={() => setShowModeSelector(true)}
              disabled={isCreating}
            >
              {selectedGameMode ? 'Change Mode' : 'Select Mode'}
            </button>
          </div>
        </div>

        <button
          className="submit-button"
          type="submit"
          disabled={isCreating || !localUserName.trim() || !selectedGameMode}
        >
          {isCreating ? 'Creating Game...' : 'Create & Host Game'}
        </button>
      </form>

      {/* Game Mode Selector Modal */}
      {showModeSelector && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Select Game Mode</h2>
              <button
                className="close-btn"
                onClick={() => setShowModeSelector(false)}
              >
                ×
              </button>
            </div>
            <GameModeSelector
              onModeSelect={handleModeSelect}
              selectedModeId={selectedGameMode?.id}
              showDescription={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
```

#### 1.5.5 Create Timer Display Component

**File:** `src/client/components/TimerDisplay/TimerDisplay.tsx`

```typescript
import { useEffect, useState } from 'react';
import { PlayerTimers } from '../../../shared/types/gameModeTypes';
import './timer-display.scss';

interface TimerDisplayProps {
  timers: PlayerTimers;
  currentPlayerId: string;
  localUserId: string;
}

export const TimerDisplay = ({ timers, currentPlayerId, localUserId }: TimerDisplayProps) => {
  const [, setTick] = useState(0);

  // Force re-render every second for smooth countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerClass = (userId: string, timer: PlayerTimers[string]): string => {
    const classes = ['timer'];

    if (timer.isActive) {
      classes.push('active');
    }

    if (timer.remainingTime <= 30) {
      classes.push('warning');
    }

    if (timer.remainingTime <= 10) {
      classes.push('critical');
    }

    if (userId === localUserId) {
      classes.push('local');
    }

    return classes.join(' ');
  };

  const getTimerIcon = (timer: PlayerTimers[string]): string => {
    if (timer.isActive) {
      return '⏳';
    } else if (timer.remainingTime <= 0) {
      return '⏰';
    } else {
      return '⏱️';
    }
  };

  return (
    <div className="timer-display">
      {Object.entries(timers).map(([userId, timer]) => (
        <div key={userId} className={getTimerClass(userId, timer)}>
          <div className="timer-icon">
            {getTimerIcon(timer)}
          </div>
          <div className="timer-info">
            <div className="timer-time">
              {formatTime(timer.remainingTime)}
            </div>
            <div className="timer-moves">
              {timer.moveCount} moves
            </div>
          </div>
          <div className="timer-progress">
            <div
              className="progress-bar"
              style={{
                width: `${Math.max(0, (timer.remainingTime / 300) * 100)}%` // Assuming 5 min initial
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
```

#### 1.5.6 Create Timer Display Styles

**File:** `src/client/components/TimerDisplay/timer-display.scss`

```scss
.timer-display {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);

  .timer {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
    min-width: 120px;

    &.active {
      background: rgba(212, 175, 55, 0.1);
      border-color: rgba(212, 175, 55, 0.3);
      box-shadow: 0 0 10px rgba(212, 175, 55, 0.2);
    }

    &.local {
      border-color: rgba(33, 150, 243, 0.3);
      background: rgba(33, 150, 243, 0.1);
    }

    &.warning {
      background: rgba(255, 152, 0, 0.1);
      border-color: rgba(255, 152, 0, 0.3);
    }

    &.critical {
      background: rgba(244, 67, 54, 0.1);
      border-color: rgba(244, 67, 54, 0.3);
      animation: pulse 1s infinite;
    }

    .timer-icon {
      font-size: 20px;
      opacity: 0.8;
    }

    .timer-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;

      .timer-time {
        font-size: 18px;
        font-weight: 600;
        color: #ffffff;
        font-family: 'Courier New', monospace;
      }

      .timer-moves {
        font-size: 12px;
        color: #888888;
        font-weight: 500;
      }
    }

    .timer-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 0 0 8px 8px;
      overflow: hidden;

      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #4caf50, #d4af37);
        transition: width 0.5s ease;
      }
    }
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}

// Responsive design
@media (max-width: 768px) {
  .timer-display {
    flex-direction: column;
    gap: 12px;

    .timer {
      min-width: auto;
      padding: 10px 12px;

      .timer-info {
        .timer-time {
          font-size: 16px;
        }
      }
    }
  }
}
```

### 1.6 Testing Strategy for Phase 1

#### 1.6.1 Unit Tests

**File:** `src/shared/types/gameModeTypes.spec.ts`

- Test game mode configuration validation
- Test timer configuration edge cases
- Test board configuration validation
- Test challenge configuration validation

**File:** `src/server/services/gameModeRegistry.spec.ts`

- Test game mode CRUD operations
- Test caching behavior
- Test database connection handling
- Test error scenarios

**File:** `src/server/services/gameModeEngine.spec.ts`

- Test timer initialization and management
- Test move handling with different game modes
- Test pause/resume functionality
- Test time expiry handling
- Test game state transitions

**File:** `src/client/contexts/GameModeContext.spec.tsx`

- Test context provider behavior
- Test game mode loading and error states
- Test mode selection and state management

**File:** `src/client/components/GameModeSelector/GameModeSelector.spec.tsx`

- Test mode selection UI
- Test category filtering
- Test loading and error states
- Test responsive behavior

**File:** `src/client/components/TimerDisplay/TimerDisplay.spec.tsx`

- Test timer formatting
- Test timer state visualization
- Test warning and critical states
- Test responsive behavior

#### 1.6.2 Integration Tests

**File:** `src/server/integration/gameMode.integration.spec.ts`

```typescript
describe('Game Mode Integration', () => {
  test('should create game with timer mode and handle moves', async () => {
    // Test complete flow: create mode -> create game -> make moves -> timer countdown
  });

  test('should pause and resume timer games correctly', async () => {
    // Test pause/resume functionality with real timers
  });

  test('should handle time expiry correctly', async () => {
    // Test automatic game ending on time expiry
  });

  test('should handle disconnection and reconnection', async () => {
    // Test timer pause on disconnect and resume on reconnect
  });
});
```

**File:** `src/client/integration/gameModeFlow.integration.spec.tsx`

```typescript
describe('Game Mode Flow Integration', () => {
  test('should complete full game creation flow with mode selection', async () => {
    // Test: select mode -> create game -> join game -> start game
  });

  test('should display timers correctly during gameplay', async () => {
    // Test timer display updates during actual gameplay
  });

  test('should handle mode switching in UI', async () => {
    // Test game mode selector modal and mode changes
  });
});
```

#### 1.6.3 Performance Tests

**File:** `src/server/performance/gameMode.performance.spec.ts`

- Test game mode registry caching performance
- Test timer update broadcast performance
- Test database query optimization
- Test memory usage with many concurrent games

#### 1.6.4 E2E Tests

**File:** `e2e/gameMode.e2e.spec.ts`

- Test complete game creation flow with different modes
- Test timer countdown visibility and accuracy
- Test game mode selection across different devices
- Test error handling in production-like environment

### 1.7 Integration and Deployment Notes

#### 1.7.1 Database Migration Strategy

**Execution Order:**

1. Run `001_create_game_modes.sql` to create game modes table
2. Run `002_extend_games_table.sql` to add game mode columns
3. Run `003_create_daily_challenges.sql` to create challenge tables
4. Seed initial game modes through API or direct insert

**Rollback Strategy:**

- Each migration should have corresponding rollback scripts
- Test rollback procedures in staging environment
- Maintain data integrity during rollback

#### 1.7.2 Server Configuration Changes

**File:** `src/server/index.ts` (modifications)

```typescript
// Add game mode routes
import gameModeRoutes from './api/gameModeRoutes';
app.use('/api', gameModeRoutes);

// Initialize timer broadcaster
import { startTimerBroadcaster } from './sockets/gameSocketHandlers';
startTimerBroadcaster(io);

// Add cleanup job
import { GameManager } from './models/GameManager';
setInterval(
  () => {
    GameManager.getInstance().cleanupFinishedGames();
  },
  60 * 60 * 1000,
); // Run every hour
```

#### 1.7.3 Client Configuration Changes

**File:** `src/client/index.tsx` (modifications)

```typescript
import { GameModeProvider } from './contexts/GameModeContext';

// Wrap app with GameModeProvider
const App = () => (
  <GameViewProvider>
    <GameModeProvider>
      <ProvideSocket>
        <Router>
          <Routes>
            {/* existing routes */}
          </Routes>
        </Router>
      </ProvideSocket>
    </GameModeProvider>
  </GameViewProvider>
);
```

#### 1.7.4 Environment Variables

**File:** `.env.local.example` (additions)

```bash
# Game Mode Configuration
GAME_MODE_CACHE_TTL=300000
TIMER_UPDATE_INTERVAL=1000
GAME_CLEANUP_INTERVAL=3600000

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/othello
```

### 1.8 Phase 1 Success Criteria

#### 1.8.1 Functional Requirements

- ✅ Game mode registry with CRUD operations
- ✅ Timer-based game modes with real-time countdown
- ✅ Game mode selection UI with category filtering
- ✅ Timer display with visual warnings
- ✅ Pause/resume functionality for disconnections
- ✅ Database persistence of game modes and states

#### 1.8.2 Technical Requirements

- ✅ Type-safe implementation with comprehensive interfaces
- ✅ Modular architecture for easy extension
- ✅ Efficient caching and performance optimization
- ✅ Real-time WebSocket communication
- ✅ Responsive UI design
- ✅ Error handling and validation

#### 1.8.3 Quality Assurance

- ✅ Unit test coverage > 80%
- ✅ Integration tests for critical paths
- ✅ Performance tests for concurrent users
- ✅ Accessibility compliance
- ✅ Cross-browser compatibility
- ✅ Mobile responsiveness

#### 1.8.4 User Experience

- ✅ Intuitive game mode selection
- ✅ Clear timer visualization
- ✅ Smooth transitions and animations
- ✅ Helpful error messages
- ✅ Consistent luxury design theme

### 1.9 Phase 1 Deliverables

#### 1.9.1 Core Files Created

- `src/shared/types/gameModeTypes.ts` - Type definitions
- `src/server/services/gameModeRegistry.ts` - Game mode management
- `src/server/services/gameModeEngine.ts` - Game mode execution
- `src/server/api/gameModeRoutes.ts` - REST API endpoints
- `src/client/contexts/GameModeContext.tsx` - Client state management
- `src/client/components/GameModeSelector/` - Mode selection UI
- `src/client/components/TimerDisplay/` - Timer visualization

#### 1.9.2 Database Schema

- `game_modes` table with JSON configuration
- `daily_challenges` table for future challenges
- `user_challenge_attempts` table for progress tracking
- Extended `games` table with mode references

#### 1.9.3 API Endpoints

- `GET /api/game-modes` - List available modes
- `GET /api/game-modes/:id` - Get specific mode
- `POST /api/game-modes` - Create new mode (admin)
- `PUT /api/game-modes/:id` - Update mode (admin)
- `DELETE /api/game-modes/:id` - Delete mode (admin)

#### 1.9.4 Socket Events

- `GetGameModes` - Fetch available modes
- `HostNewGameWithMode` - Create game with mode
- `TimerUpdated` - Real-time timer updates
- `TimeExpired` - Time limit notifications

### 1.10 Next Phase Preparation

#### 1.10.1 Phase 2 Dependencies

- Phase 1 game mode system must be fully functional
- Database migrations completed and tested
- Timer system proven stable under load
- UI components thoroughly tested

#### 1.10.2 Phase 2 Prerequisites

- Game mode registry populated with initial modes
- User feedback collected on Phase 1 implementation
- Performance benchmarks established
- Documentation updated for new systems

---

## Phase 2: Timer-Based Game Modes (Week 3-4)

_[This section will be detailed in the next tool use]_

### 2.1 Enhanced Timer System

- Advanced time control algorithms
- Client-side prediction with server validation
- Network latency compensation
- Battery optimization for mobile devices

### 2.2 Chess-Style Time Controls

- Increment timers (X+Y format)
- Delay timers (Fischer delay)
- Correspondence timers (days per move)
- Custom time control creation

### 2.3 Timer UI Enhancements

- Analog clock visualization
- Time pressure indicators
- Move time statistics
- Time usage analytics

### 2.4 Game Mode Presets

- Bullet (1+0, 2+1)
- Blitz (3+0, 5+0, 3+2)
- Rapid (10+0, 15+10)
- Classical (30+0, 45+45)
- Correspondence (1+ days)

---

_This concludes the detailed Phase 1 implementation plan. Each subsequent phase will be similarly detailed with specific implementation steps, code examples, and testing strategies._
