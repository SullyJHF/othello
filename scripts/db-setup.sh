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
    local container_name=$1
    local user=$2
    local db=$3
    echo "⏳ Waiting for database to be ready..."
    until docker exec ${container_name} pg_isready -U ${user} -d ${db}; do
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
        docker-compose -p othello-local -f docker-compose.db.yml -f docker-compose.override.yml up -d postgres
        wait_for_db "othello-local-postgres-1" "dev_user" "othello_dev"
        run_migrations
        seed_database
        ;;
    "production")
        echo "🏭 Setting up production database..."
        docker-compose -p othello-prod -f docker-compose.db.yml up -d postgres
        wait_for_db "othello-prod-postgres-1" "${POSTGRES_USER:-othello_user}" "${POSTGRES_DB:-othello}"
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
        
        # Stop and remove existing test containers and volumes (only for test project)
        echo "🧹 Cleaning up existing test database..."
        docker-compose -p othello-test -f docker-compose.test.yml down -v || true
        
        # Start fresh test database
        docker-compose -p othello-test -f docker-compose.test.yml up -d postgres
        
        # Wait for test database to be ready
        wait_for_db "othello-test-postgres-1" "${POSTGRES_USER}" "${POSTGRES_DB}"
        
        run_migrations
        seed_database
        ;;
    "stop")
        ENV=${2:-all}
        case "$ENV" in
            "local")
                echo "🛑 Stopping local database container..."
                docker-compose -p othello-local -f docker-compose.db.yml -f docker-compose.override.yml down
                ;;
            "test")
                echo "🛑 Stopping test database container..."
                docker-compose -p othello-test -f docker-compose.test.yml down
                ;;
            "production")
                echo "🛑 Stopping production database container..."
                docker-compose -p othello-prod -f docker-compose.db.yml down
                ;;
            "all"|*)
                echo "🛑 Stopping all database containers..."
                docker-compose -p othello-local -f docker-compose.db.yml -f docker-compose.override.yml down 2>/dev/null || true
                docker-compose -p othello-test -f docker-compose.test.yml down 2>/dev/null || true
                docker-compose -p othello-prod -f docker-compose.db.yml down 2>/dev/null || true
                ;;
        esac
        ;;
    "logs")
        ENV=${2:-local}
        case "$ENV" in
            "local")
                echo "📋 Showing local database logs..."
                docker-compose -p othello-local -f docker-compose.db.yml -f docker-compose.override.yml logs -f postgres
                ;;
            "test")
                echo "📋 Showing test database logs..."
                docker-compose -p othello-test -f docker-compose.test.yml logs -f postgres
                ;;
            "production")
                echo "📋 Showing production database logs..."
                docker-compose -p othello-prod -f docker-compose.db.yml logs -f postgres
                ;;
            *)
                echo "❌ Invalid environment: $ENV"
                echo "Usage: $0 logs {local|test|production}"
                exit 1
                ;;
        esac
        ;;
    "reset")
        ENV=${2:-local}
        case "$ENV" in
            "local")
                echo "💥 Resetting local database (WARNING: This will delete all data!)..."
                read -p "Are you sure you want to reset the local database? [y/N] " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    docker-compose -p othello-local -f docker-compose.db.yml -f docker-compose.override.yml down -v
                    docker-compose -p othello-local -f docker-compose.db.yml -f docker-compose.override.yml up -d postgres
                    wait_for_db "othello-local-postgres-1" "dev_user" "othello_dev"
                    run_migrations
                    seed_database
                else
                    echo "Local database reset cancelled."
                fi
                ;;
            "test")
                echo "💥 Resetting test database (WARNING: This will delete all data!)..."
                read -p "Are you sure you want to reset the test database? [y/N] " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    # Load test environment variables
                    if [ -f .env.test ]; then
                        set -o allexport
                        source .env.test
                        set +o allexport
                    else
                        export POSTGRES_DB=othello_test
                        export POSTGRES_USER=test_user
                        export POSTGRES_PASSWORD=test_password
                        export POSTGRES_PORT=5434
                    fi
                    docker-compose -p othello-test -f docker-compose.test.yml down -v
                    docker-compose -p othello-test -f docker-compose.test.yml up -d postgres
                    wait_for_db "othello-test-postgres-1" "${POSTGRES_USER}" "${POSTGRES_DB}"
                    run_migrations
                    seed_database
                else
                    echo "Test database reset cancelled."
                fi
                ;;
            "production")
                echo "💥 Resetting production database (WARNING: This will delete all data!)..."
                read -p "Are you sure you want to reset the production database? [y/N] " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    docker-compose -p othello-prod -f docker-compose.db.yml down -v
                    docker-compose -p othello-prod -f docker-compose.db.yml up -d postgres
                    wait_for_db "othello-prod-postgres-1" "${POSTGRES_USER:-othello_user}" "${POSTGRES_DB:-othello}"
                    run_migrations
                    seed_database
                else
                    echo "Production database reset cancelled."
                fi
                ;;
            *)
                echo "❌ Invalid environment: $ENV"
                echo "Usage: $0 reset {local|test|production}"
                exit 1
                ;;
        esac
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
        ENV=${2:-local}
        case "$ENV" in
            "local")
                echo "🏥 Checking local database health..."
                docker exec othello-local-postgres-1 pg_isready -U dev_user -d othello_dev
                if [ $? -eq 0 ]; then
                    echo "✅ Local database is healthy"
                else
                    echo "❌ Local database is not responding"
                    exit 1
                fi
                ;;
            "test")
                echo "🏥 Checking test database health..."
                docker exec othello-test-postgres-1 pg_isready -U test_user -d othello_test
                if [ $? -eq 0 ]; then
                    echo "✅ Test database is healthy"
                else
                    echo "❌ Test database is not responding"
                    exit 1
                fi
                ;;
            "production")
                echo "🏥 Checking production database health..."
                docker exec othello-prod-postgres-1 pg_isready -U ${POSTGRES_USER:-othello_user} -d ${POSTGRES_DB:-othello}
                if [ $? -eq 0 ]; then
                    echo "✅ Production database is healthy"
                else
                    echo "❌ Production database is not responding"
                    exit 1
                fi
                ;;
            *)
                echo "❌ Invalid environment: $ENV"
                echo "Usage: $0 health {local|test|production}"
                exit 1
                ;;
        esac
        ;;
    *)
        echo "Usage: $0 {local|production|test|stop|logs|reset|backup|restore|health} [environment]"
        echo ""
        echo "Setup Commands:"
        echo "  local       - Set up local development database (port 5433)"
        echo "  production  - Set up production database (port 5432)"
        echo "  test        - Set up test database (port 5434)"
        echo ""
        echo "Management Commands:"
        echo "  stop [env]  - Stop database containers"
        echo "              - stop local    - Stop only local database"
        echo "              - stop test     - Stop only test database"
        echo "              - stop production - Stop only production database"
        echo "              - stop (or stop all) - Stop all databases"
        echo ""
        echo "  logs [env]  - Show database logs"
        echo "              - logs local    - Show local database logs"
        echo "              - logs test     - Show test database logs"
        echo "              - logs production - Show production database logs"
        echo ""
        echo "  reset [env] - Reset database (deletes all data)"
        echo "              - reset local   - Reset local database"
        echo "              - reset test    - Reset test database"
        echo "              - reset production - Reset production database"
        echo ""
        echo "  health [env] - Check database health"
        echo "              - health local  - Check local database"
        echo "              - health test   - Check test database"
        echo "              - health production - Check production database"
        echo ""
        echo "  backup      - Create database backup"
        echo "  restore     - Restore database from backup"
        echo ""
        echo "Examples:"
        echo "  $0 local                    # Set up local development database"
        echo "  $0 test                     # Set up test database"
        echo "  $0 stop local               # Stop only local database"
        echo "  $0 logs test                # Show test database logs"
        echo "  $0 health local             # Check local database health"
        exit 1
        ;;
esac