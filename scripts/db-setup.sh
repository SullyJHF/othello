#!/bin/bash

# Database setup script for development

set -e

echo "🚀 Setting up Othello database infrastructure..."

# Load environment variables safely
if [ -f .env.local ]; then
    set -o allexport
    source .env.local
    set +o allexport
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
        
        # Load test environment variables
        if [ -f .env.test ]; then
            set -o allexport
            source .env.test
            set +o allexport
        else
            # Set default test values
            export POSTGRES_DB=othello_test
            export POSTGRES_USER=test_user
            export POSTGRES_PASSWORD=test_password
            export POSTGRES_PORT=5434
        fi
        
        # Stop and remove existing test containers and volumes
        echo "🧹 Cleaning up existing test database..."
        docker-compose -f docker-compose.test.yml down -v || true
        
        # Start fresh test database
        docker-compose -f docker-compose.test.yml up -d postgres
        
        # Wait for test database to be ready
        echo "⏳ Waiting for test database to be ready..."
        until docker exec othello-postgres-test pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}; do
            sleep 2
        done
        echo "✅ Test database is ready!"
        
        run_migrations
        seed_database
        ;;
    "stop")
        echo "🛑 Stopping database containers..."
        docker-compose -f docker-compose.db.yml down
        ;;
    "logs")
        echo "📋 Showing database logs..."
        docker-compose -f docker-compose.db.yml logs -f postgres
        ;;
    "reset")
        echo "💥 Resetting database (WARNING: This will delete all data!)..."
        read -p "Are you sure you want to reset the database? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose -f docker-compose.db.yml down -v
            docker-compose -f docker-compose.db.yml up -d postgres
            wait_for_db
            run_migrations
            seed_database
        else
            echo "Database reset cancelled."
        fi
        ;;
    "backup")
        echo "💾 Creating database backup..."
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        docker exec othello-postgres pg_dump -U ${POSTGRES_USER:-othello_user} -d ${POSTGRES_DB:-othello} > ./src/server/database/backups/$BACKUP_FILE
        echo "✅ Backup created: $BACKUP_FILE"
        ;;
    "restore")
        if [ -z "$2" ]; then
            echo "❌ Please provide backup file name"
            echo "Usage: $0 restore <backup_file>"
            exit 1
        fi
        echo "🔄 Restoring database from backup: $2"
        docker exec -i othello-postgres psql -U ${POSTGRES_USER:-othello_user} -d ${POSTGRES_DB:-othello} < ./src/server/database/backups/$2
        echo "✅ Database restored successfully"
        ;;
    "health")
        echo "🏥 Checking database health..."
        docker exec othello-postgres pg_isready -U ${POSTGRES_USER:-othello_user} -d ${POSTGRES_DB:-othello}
        if [ $? -eq 0 ]; then
            echo "✅ Database is healthy"
        else
            echo "❌ Database is not responding"
            exit 1
        fi
        ;;
    *)
        echo "Usage: $0 {local|production|test|stop|logs|reset|backup|restore|health}"
        echo ""
        echo "Commands:"
        echo "  local       - Set up local development database"
        echo "  production  - Set up production database"
        echo "  test        - Set up test database"
        echo "  stop        - Stop database containers"
        echo "  logs        - Show database logs"
        echo "  reset       - Reset database (deletes all data)"
        echo "  backup      - Create database backup"
        echo "  restore     - Restore database from backup"
        echo "  health      - Check database health"
        exit 1
        ;;
esac