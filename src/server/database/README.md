# Database Integration Testing

This document explains how to use the database infrastructure for testing in different environments.

## Test Environment Setup

### Unit Tests (Default)

- **Environment**: `NODE_ENV=test` (without `DATABASE_TEST_MODE`)
- **Database**: No actual database connection
- **Behavior**: Database class returns appropriate error messages without attempting connections
- **Use Case**: Fast unit tests that don't require database connectivity

### Integration Tests

- **Environment**: `NODE_ENV=test` + `DATABASE_TEST_MODE=true`
- **Database**: Connects to real test database
- **Behavior**: Full database functionality for integration testing
- **Use Case**: Testing database operations, migrations, and data persistence

### Local Development

- **Environment**: `NODE_ENV=development`
- **Database**: Connects to local PostgreSQL instance
- **Port**: 5433 (to avoid conflicts with production)
- **Setup**: `npm run db:setup`

### Production

- **Environment**: `NODE_ENV=production`
- **Database**: Connects to production PostgreSQL instance
- **Port**: 5432
- **Setup**: `npm run db:setup:prod`

## CI/CD Configuration

### GitHub Actions Example

For GitHub Actions workflows, you have two options:

#### Option 1: Unit Tests Only (Recommended)

```yaml
- name: Run Tests
  run: npm test
  env:
    NODE_ENV: test
    # No DATABASE_TEST_MODE - runs without database
```

#### Option 2: With Database Integration Tests

```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_DB: othello_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

- name: Run Tests with Database
  run: npm test
  env:
    NODE_ENV: test
    DATABASE_TEST_MODE: true
    POSTGRES_HOST: localhost
    POSTGRES_PORT: 5432
    POSTGRES_DB: othello_test
    POSTGRES_USER: test_user
    POSTGRES_PASSWORD: test_password
```

## Database Commands

```bash
# Local development database
npm run db:setup          # Setup local dev database
npm run db:stop           # Stop database containers
npm run db:logs           # View database logs
npm run db:health         # Check database health

# Test database
npm run db:setup:test     # Setup test database (fresh)
npm run db:reset          # Reset database with confirmation

# Production database
npm run db:setup:prod     # Setup production database
npm run db:backup         # Create backup
npm run db:restore <file> # Restore from backup

# Migrations
npm run db:migrate        # Run pending migrations
npm run db:seed          # Seed database with initial data
```

## Test Data

The test database includes:

- 8 predefined game modes (Bullet, Blitz, Rapid, Classical, Mini Board, Large Board, Daily Challenge, Unlimited)
- All necessary enum types (game_mode_category, difficulty_level, timer_type)
- Complete table structure with indexes and constraints

## Environment Variables

Create `.env.test` for integration testing:

```env
NODE_ENV=test
DATABASE_TEST_MODE=true
POSTGRES_HOST=localhost
POSTGRES_PORT=5434
POSTGRES_DB=othello_test
POSTGRES_USER=test_user
POSTGRES_PASSWORD=test_password
```

## Error Handling

The database layer gracefully handles:

- **Connection failures**: Returns appropriate error messages
- **Missing configuration**: Uses sensible defaults
- **Pool exhaustion**: Automatic connection management
- **Transaction rollbacks**: Automatic cleanup on errors
- **Test environments**: Skips initialization when not needed

This design ensures that:

- ✅ Unit tests run fast without database dependencies
- ✅ Integration tests work with real database when needed
- ✅ CI/CD pipelines can choose their testing strategy
- ✅ No flaky tests due to database connection issues
