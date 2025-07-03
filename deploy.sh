#!/bin/bash

# Othello Production Deployment Script
# This script helps deploy the Othello application to production

set -e

# Function to use the correct docker compose command
docker_compose() {
    if command -v docker-compose &> /dev/null; then
        docker-compose "$@"
    else
        docker compose "$@"
    fi
}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker and Docker Compose are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check for both docker-compose and docker compose
    if command -v docker-compose &> /dev/null; then
        log_info "Found docker-compose command"
    elif docker compose version &> /dev/null; then
        log_info "Found docker compose plugin"
    else
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        log_info "Either install docker-compose or ensure docker compose plugin is available"
        exit 1
    fi
    
    log_success "Dependencies check passed"
}

# Check if production environment file exists
check_env_file() {
    local env_file="${1:-.env.production}"
    local env_example="${env_file}.example"
    
    if [ ! -f "$env_file" ]; then
        log_warning "Environment file $env_file not found."
        log_info "Creating $env_file from example..."
        
        if [ -f "$env_example" ]; then
            cp "$env_example" "$env_file"
            log_warning "Please edit $env_file with your configuration"
            log_info "Opening $env_file for editing..."
            ${EDITOR:-nano} "$env_file"
        else
            log_error "$env_example not found. Cannot create environment file."
            exit 1
        fi
    fi
}

# Build and deploy the application (production with Traefik)
deploy() {
    log_info "Starting production deployment with Traefik..."
    
    # Set version from package.json if not already set
    if [ -z "$REACT_APP_VERSION" ]; then
        export REACT_APP_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
        export REACT_APP_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
        export REACT_APP_BUILD_HASH="local"
        export REACT_APP_BUILD_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    fi
    
    # Environment variables will be loaded via --env-file flag
    
    # Stop existing containers if running
    log_info "Stopping existing containers..."
    docker_compose -f docker-compose.prod.yml --env-file .env.production down --remove-orphans || true
    
    # Build and start containers
    log_info "Building and starting containers..."
    docker_compose -f docker-compose.prod.yml --env-file .env.production up -d --build
    
    # Wait for containers to be healthy
    log_info "Waiting for containers to be healthy..."
    sleep 15
    
    # Check container status
    if docker_compose -f docker-compose.prod.yml --env-file .env.production ps | grep -q "Up"; then
        log_success "Production deployment successful!"
        # Load domain for display
        DOMAIN=$(grep "^DOMAIN=" .env.production | cut -d= -f2 | sed 's/[[:space:]]*$//')
        log_info "Application should be available at: https://${DOMAIN}"
    else
        log_error "Deployment failed. Check container logs:"
        docker_compose -f docker-compose.prod.yml --env-file .env.production logs
        exit 1
    fi
}

# Build and deploy the application locally (no Traefik)
deploy_local() {
    log_info "Starting local deployment (no Traefik)..."
    
    # Environment variables will be loaded via --env-file flag
    if [ -f ".env.local" ]; then
        log_info "Using environment variables from .env.local..."
    fi
    
    # Stop existing containers if running
    log_info "Stopping existing local containers..."
    docker_compose -f docker-compose.local.yml --env-file .env.local down --remove-orphans || true
    
    # Build and start containers
    log_info "Building and starting local containers..."
    docker_compose -f docker-compose.local.yml --env-file .env.local up -d --build
    
    # Wait for containers to be healthy
    log_info "Waiting for containers to be healthy..."
    sleep 10
    
    # Check container status
    if docker_compose -f docker-compose.local.yml --env-file .env.local ps | grep -q "Up"; then
        log_success "Local deployment successful!"
        # Load environment variables for display
        if [ -f ".env.local" ]; then
            LOCAL_HOST=$(grep "^LOCAL_HOST=" .env.local | cut -d= -f2 | sed 's/[[:space:]]*$//')
            APP_PORT=$(grep "^APP_PORT=" .env.local | cut -d= -f2 | sed 's/[[:space:]]*$//')
        fi
        
        # Use defaults if not found
        LOCAL_HOST=${LOCAL_HOST:-localhost}
        APP_PORT=${APP_PORT:-3000}
        
        log_info "Application is available at:"
        log_info "  Othello Game: http://${LOCAL_HOST}:${APP_PORT}"
        log_info ""
        log_info "To test the application, open your browser to: http://${LOCAL_HOST}:${APP_PORT}"
    else
        log_error "Local deployment failed. Check container logs:"
        docker_compose -f docker-compose.local.yml --env-file .env.local logs
        exit 1
    fi
}

# Show logs (production)
show_logs() {
    log_info "Showing production application logs..."
    docker_compose -f docker-compose.prod.yml --env-file .env.production logs -f
}

# Show logs (local)
show_logs_local() {
    log_info "Showing local application logs..."
    docker_compose -f docker-compose.local.yml --env-file .env.local logs -f
}

# Stop the application (production)
stop() {
    log_info "Stopping production application..."
    docker_compose -f docker-compose.prod.yml --env-file .env.production down
    log_success "Production application stopped"
}

# Stop the application (local)
stop_local() {
    log_info "Stopping local application..."
    docker_compose -f docker-compose.local.yml --env-file .env.local down
    log_success "Local application stopped"
}

# Restart the application (production)
restart() {
    log_info "Restarting production application..."
    docker_compose -f docker-compose.prod.yml --env-file .env.production restart
    log_success "Production application restarted"
}

# Restart the application (local)
restart_local() {
    log_info "Restarting local application..."
    docker_compose -f docker-compose.local.yml --env-file .env.local restart
    log_success "Local application restarted"
}

# Show help
show_help() {
    echo "Othello Deployment Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Production Commands (with Traefik):"
    echo "  deploy         Build and deploy to production with Traefik (default)"
    echo "  logs           Show production application logs"
    echo "  stop           Stop production application"
    echo "  restart        Restart production application"
    echo
    echo "Local Commands (no Traefik):"
    echo "  local          Build and deploy locally without Traefik"
    echo "  logs-local     Show local application logs"
    echo "  stop-local     Stop local application"
    echo "  restart-local  Restart local application"
    echo
    echo "Other Commands:"
    echo "  help           Show this help message"
    echo
    echo "Examples:"
    echo "  $0 deploy         # Deploy to production with Traefik"
    echo "  $0 local          # Deploy locally for testing"
    echo "  $0 logs           # Show production logs"
    echo "  $0 logs-local     # Show local logs"
    echo "  $0 stop-local     # Stop local containers"
    echo
    echo "Local deployment configuration:"
    echo "  - Set LOCAL_HOST in .env.local to your Docker host IP"
    echo "  - Default port: 3000 (othello application)"
    echo "  - No SSL/Traefik required"
}

# Main script logic
main() {
    case "${1:-deploy}" in
        "deploy")
            check_dependencies
            check_env_file ".env.production"
            deploy
            ;;
        "local")
            check_dependencies
            check_env_file ".env.local"
            deploy_local
            ;;
        "logs")
            show_logs
            ;;
        "logs-local")
            show_logs_local
            ;;
        "stop")
            stop
            ;;
        "stop-local")
            stop_local
            ;;
        "restart")
            restart
            ;;
        "restart-local")
            restart_local
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"