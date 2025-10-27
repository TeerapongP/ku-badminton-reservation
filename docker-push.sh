#!/bin/bash

# Docker Push Script for KU Badminton Reservation System
# Usage: ./docker-push.sh [tag] [registry]

set -e

# Configuration
TAG=${1:-latest}
REGISTRY=${2:-thirapongp}
IMAGE_NAME="ku-badminton-reservation"
FULL_IMAGE_NAME="$REGISTRY/$IMAGE_NAME"

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

# Check if user is logged in to Docker Hub
check_docker_login() {
    log_info "Checking Docker Hub authentication..."
    
    if ! docker info | grep -q "Username:"; then
        log_warning "Not logged in to Docker Hub. Please login first."
        echo "Run: docker login"
        read -p "Do you want to login now? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker login
        else
            log_error "Docker login required to push images."
            exit 1
        fi
    else
        log_success "Already logged in to Docker Hub"
    fi
}

# Check if local image exists
check_local_image() {
    log_info "Checking if local image exists: $IMAGE_NAME:$TAG"
    
    if ! docker images | grep -q "$IMAGE_NAME.*$TAG"; then
        log_warning "Local image $IMAGE_NAME:$TAG not found."
        read -p "Do you want to build it now? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            build_image
        else
            log_error "Local image required for pushing."
            exit 1
        fi
    else
        log_success "Local image found: $IMAGE_NAME:$TAG"
    fi
}

# Build image if needed
build_image() {
    log_info "Building Docker image: $IMAGE_NAME:$TAG"
    
    docker build \
        --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
        --build-arg VCS_REF=$(git rev-parse --short HEAD) \
        --build-arg VERSION=$TAG \
        -t $IMAGE_NAME:$TAG \
        .
    
    log_success "Docker image built successfully!"
}

# Tag image for registry
tag_image() {
    log_info "Tagging image for registry: $FULL_IMAGE_NAME:$TAG"
    
    docker tag $IMAGE_NAME:$TAG $FULL_IMAGE_NAME:$TAG
    
    # Also tag as latest if not already latest
    if [ "$TAG" != "latest" ]; then
        log_info "Also tagging as latest: $FULL_IMAGE_NAME:latest"
        docker tag $IMAGE_NAME:$TAG $FULL_IMAGE_NAME:latest
    fi
    
    log_success "Image tagged successfully!"
}

# Push image to registry
push_image() {
    log_info "Pushing image to Docker Hub: $FULL_IMAGE_NAME:$TAG"
    
    # Push the specific tag
    docker push $FULL_IMAGE_NAME:$TAG
    
    # Push latest if we tagged it
    if [ "$TAG" != "latest" ]; then
        log_info "Pushing latest tag: $FULL_IMAGE_NAME:latest"
        docker push $FULL_IMAGE_NAME:latest
    fi
    
    log_success "Image pushed successfully!"
}

# Show image information
show_image_info() {
    log_info "Image Information:"
    echo "  Registry: $REGISTRY"
    echo "  Repository: $IMAGE_NAME"
    echo "  Tag: $TAG"
    echo "  Full name: $FULL_IMAGE_NAME:$TAG"
    echo "  Size: $(docker images $FULL_IMAGE_NAME:$TAG --format "{{.Size}}")"
    echo ""
    echo "🐳 Docker Hub URL: https://hub.docker.com/r/$REGISTRY/$IMAGE_NAME"
    echo ""
    echo "📥 Pull command:"
    echo "  docker pull $FULL_IMAGE_NAME:$TAG"
    echo ""
    echo "🚀 Run command:"
    echo "  docker run -p 3000:3000 --env-file .env $FULL_IMAGE_NAME:$TAG"
}

# Multi-architecture build and push
multi_arch_push() {
    log_info "Building and pushing multi-architecture image..."
    
    # Create and use buildx builder
    docker buildx create --name multiarch-builder --use 2>/dev/null || docker buildx use multiarch-builder
    
    # Build and push for multiple architectures
    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
        --build-arg VCS_REF=$(git rev-parse --short HEAD) \
        --build-arg VERSION=$TAG \
        -t $FULL_IMAGE_NAME:$TAG \
        --push \
        .
    
    # Also push as latest if not already latest
    if [ "$TAG" != "latest" ]; then
        docker buildx build \
            --platform linux/amd64,linux/arm64 \
            --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
            --build-arg VCS_REF=$(git rev-parse --short HEAD) \
            --build-arg VERSION=$TAG \
            -t $FULL_IMAGE_NAME:latest \
            --push \
            .
    fi
    
    log_success "Multi-architecture image pushed successfully!"
}

# Cleanup local tagged images
cleanup_local_tags() {
    log_info "Cleaning up local registry tags..."
    
    # Remove the registry-tagged images locally (keep original)
    docker rmi $FULL_IMAGE_NAME:$TAG 2>/dev/null || true
    if [ "$TAG" != "latest" ]; then
        docker rmi $FULL_IMAGE_NAME:latest 2>/dev/null || true
    fi
    
    log_success "Local registry tags cleaned up"
}

# Main execution
main() {
    echo "🚀 Docker Push Script for KU Badminton Reservation"
    echo "=================================================="
    echo "Target: $FULL_IMAGE_NAME:$TAG"
    echo "=================================================="
    
    # Pre-push checks
    check_docker
    check_docker_login
    check_local_image
    
    # Ask for multi-arch build
    read -p "Do you want to build for multiple architectures (amd64, arm64)? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        multi_arch_push
    else
        # Standard single-arch push
        tag_image
        push_image
        
        # Optional cleanup
        read -p "Do you want to clean up local registry tags? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cleanup_local_tags
        fi
    fi
    
    show_image_info
    log_success "Push completed successfully! 🎉"
}

# Handle special commands
case $1 in
    "multi-arch")
        TAG=${2:-latest}
        multi_arch_push
        show_image_info
        exit 0
        ;;
    "cleanup")
        cleanup_local_tags
        exit 0
        ;;
    "info")
        show_image_info
        exit 0
        ;;
    *)
        main
        ;;
esac