#!/bin/bash

# Deployment script for Next.js application with Docker

set -e

echo "🚀 Starting deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    log_error ".env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database (if running)
backup_database() {
    log_info "Creating database backup..."
    
    if docker-compose ps db | grep -q "Up"; then
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
        
        docker-compose exec -T db mysqldump \
            -u root \
            -p"${DB_ROOT_PASSWORD}" \
            "${DB_NAME}" > "$BACKUP_FILE"
        
        log_info "Database backup created: $BACKUP_FILE"
    else
        log_warn "Database container not running, skipping backup"
    fi
}

# Build and deploy
deploy() {
    log_info "Building Docker images..."
    docker-compose build --no-cache

    log_info "Starting services..."
    docker-compose up -d

    log_info "Waiting for services to be ready..."
    sleep 30

    # Health check
    log_info "Performing health check..."
    if curl -f http://localhost/api/health > /dev/null 2>&1; then
        log_info "✅ Application is healthy!"
    else
        log_error "❌ Health check failed!"
        docker-compose logs app
        exit 1
    fi
}

# Rollback function
rollback() {
    log_warn "Rolling back to previous version..."
    docker-compose down
    
    # Restore from backup if needed
    if [ -n "$1" ]; then
        log_info "Restoring database from backup: $1"
        docker-compose up -d db
        sleep 10
        docker-compose exec -T db mysql \
            -u root \
            -p"${DB_ROOT_PASSWORD}" \
            "${DB_NAME}" < "$1"
    fi
    
    # Start previous version (you might want to tag your images)
    docker-compose up -d
}

# Cleanup old images and containers
cleanup() {
    log_info "Cleaning up old Docker images..."
    docker image prune -f
    docker container prune -f
    
    # Keep only last 5 backups
    log_info "Cleaning up old backups..."
    ls -t "$BACKUP_DIR"/db_backup_*.sql | tail -n +6 | xargs -r rm
}

# Main deployment process
main() {
    case "${1:-deploy}" in
        "deploy")
            backup_database
            deploy
            cleanup
            log_info "🎉 Deployment completed successfully!"
            ;;
        "rollback")
            if [ -z "$2" ]; then
                log_error "Please specify backup file for rollback"
                exit 1
            fi
            rollback "$2"
            log_info "🔄 Rollback completed!"
            ;;
        "backup")
            backup_database
            log_info "💾 Backup completed!"
            ;;
        "cleanup")
            cleanup
            log_info "🧹 Cleanup completed!"
            ;;
        "logs")
            docker-compose logs -f "${2:-app}"
            ;;
        "status")
            docker-compose ps
            ;;
        "restart")
            log_info "Restarting services..."
            docker-compose restart "${2:-}"
            log_info "🔄 Services restarted!"
            ;;
        *)
            echo "Usage: $0 {deploy|rollback <backup_file>|backup|cleanup|logs [service]|status|restart [service]}"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"