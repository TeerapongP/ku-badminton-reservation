#!/bin/bash

# Deployment Script for KU Badminton Reservation System
# Usage: ./deploy.sh [environment] [tag]

set -e

# Configuration
ENVIRONMENT=${1:-development}
TAG=${2:-latest}
IMAGE_NAME="ku-badminton-reservation"
CONTAINER_NAME="ku-badminton-app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Check if environment file exists
check_env() {
    if [ ! -f ".env" ]; then
        log_warning ".env file not found. Creating from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_info "Please edit .env file with your configuration"
        else
            log_error ".env.example not found. Please create .env file manually."
            exit 1
        fi
    fi
}

# Git operations
git_status() {
    log_info "Checking Git status..."
    
    # Check if there are uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        log_warning "You have uncommitted changes:"
        git status --porcelain
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled."
            exit 0
        fi
    fi
    
    # Show current branch and last commit
    CURRENT_BRANCH=$(git branch --show-current)
    LAST_COMMIT=$(git log -1 --pretty=format:"%h - %s (%an, %ar)")
    log_info "Current branch: $CURRENT_BRANCH"
    log_info "Last commit: $LAST_COMMIT"
}

# Build Docker image
build_image() {
    log_info "Building Docker image: $IMAGE_NAME:$TAG"
    
    # Build with build args for environment
    docker build \
        --build-arg NODE_ENV=$ENVIRONMENT \
        --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
        --build-arg VCS_REF=$(git rev-parse --short HEAD) \
        -t $IMAGE_NAME:$TAG \
        .
    
    log_success "Docker image built successfully!"
}

# Stop existing containers
stop_containers() {
    log_info "Stopping existing containers..."
    
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        docker stop $CONTAINER_NAME
        docker rm $CONTAINER_NAME
        log_success "Stopped and removed existing container"
    else
        log_info "No existing container found"
    fi
}

# Deploy based on environment
deploy() {
    case $ENVIRONMENT in
        "development"|"dev")
            deploy_development
            ;;
        "production"|"prod")
            deploy_production
            ;;
        "staging")
            deploy_staging
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            log_info "Available environments: development, staging, production"
            exit 1
            ;;
    esac
}

# Development deployment
deploy_development() {
    log_info "Deploying to development environment..."
    
    # Use docker-compose for development
    docker-compose down
    docker-compose up -d --build
    
    log_success "Development deployment completed!"
    log_info "Application available at: http://localhost:3000"
}

# Staging deployment
deploy_staging() {
    log_info "Deploying to staging environment..."
    
    # Use production compose with staging overrides
    docker-compose -f docker-compose.yml -f docker-compose.staging.yml down
    docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d --build
    
    log_success "Staging deployment completed!"
}

# Production deployment
deploy_production() {
    log_info "Deploying to production environment..."
    
    # Additional safety checks for production
    read -p "Are you sure you want to deploy to PRODUCTION? (yes/no): " -r
    if [[ ! $REPLY == "yes" ]]; then
        log_info "Production deployment cancelled."
        exit 0
    fi
    
    # Create backup
    log_info "Creating database backup..."
    docker-compose exec -T db mysqldump -u root -p$DB_ROOT_PASSWORD $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql
    
    # Deploy with production compose
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
    
    # Run migrations
    log_info "Running database migrations..."
    docker-compose exec app npx prisma migrate deploy
    
    log_success "Production deployment completed!"
    log_info "Application available at: https://your-domain.com"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    # Wait for application to start
    sleep 10
    
    # Check if application is responding
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        log_success "Health check passed!"
    else
        log_warning "Health check failed. Check application logs:"
        docker-compose logs app
    fi
}

# Rollback function
rollback() {
    log_warning "Rolling back deployment..."
    
    # Get previous image tag
    PREVIOUS_TAG=$(docker images $IMAGE_NAME --format "table {{.Tag}}" | sed -n '2p')
    
    if [ -n "$PREVIOUS_TAG" ] && [ "$PREVIOUS_TAG" != "$TAG" ]; then
        log_info "Rolling back to: $IMAGE_NAME:$PREVIOUS_TAG"
        
        # Update docker-compose to use previous tag
        sed -i "s/$IMAGE_NAME:$TAG/$IMAGE_NAME:$PREVIOUS_TAG/g" docker-compose.yml
        
        # Restart services
        docker-compose up -d
        
        log_success "Rollback completed!"
    else
        log_error "No previous version found for rollback"
        exit 1
    fi
}

# Cleanup old images
cleanup() {
    log_info "Cleaning up old Docker images..."
    
    # Keep last 3 versions
    docker images $IMAGE_NAME --format "table {{.ID}}\t{{.Tag}}" | tail -n +4 | awk '{print $1}' | xargs -r docker rmi
    
    # Clean up dangling images
    docker image prune -f
    
    log_success "Cleanup completed!"
}

# Main execution
main() {
    echo "🚀 KU Badminton Reservation Deployment Script"
    echo "=============================================="
    echo "Environment: $ENVIRONMENT"
    echo "Tag: $TAG"
    echo "=============================================="
    
    # Pre-deployment checks
    check_docker
    check_env
    git_status
    
    # Build and deploy
    build_image
    deploy
    health_check
    
    # Optional cleanup
    read -p "Do you want to clean up old Docker images? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cleanup
    fi
    
    log_success "Deployment completed successfully! 🎉"
    
    # Show useful commands
    echo ""
    echo "📋 Useful commands:"
    echo "  View logs: docker-compose logs -f app"
    echo "  Check status: docker-compose ps"
    echo "  Stop services: docker-compose down"
    echo "  Rollback: ./deploy.sh $ENVIRONMENT rollback"
}

# Handle special commands
case $1 in
    "rollback")
        rollback
        exit 0
        ;;
    "health")
        health_check
        exit 0
        ;;
    "cleanup")
        cleanup
        exit 0
        ;;
    *)
        main
        ;;
esac