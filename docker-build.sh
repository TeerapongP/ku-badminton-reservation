#!/bin/bash

# Docker Build Script for KU Badminton Reservation System
# Usage: ./docker-build.sh [tag]

set -e

# Default tag
TAG=${1:-latest}
IMAGE_NAME="ku-badminton-reservation"

echo "🐳 Building Docker image: $IMAGE_NAME:$TAG"

# Build the Docker image
docker build -t $IMAGE_NAME:$TAG .

echo "✅ Docker image built successfully!"
echo "📦 Image: $IMAGE_NAME:$TAG"

# Show image size
echo "📊 Image size:"
docker images $IMAGE_NAME:$TAG --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

echo ""
echo "🚀 To run the container:"
echo "docker run -p 3000:3000 --env-file .env $IMAGE_NAME:$TAG"
echo ""
echo "🔧 To run with Docker Compose:"
echo "docker-compose up -d"
echo ""
echo "🏷️  To tag for registry:"
echo "docker tag $IMAGE_NAME:$TAG your-registry.com/$IMAGE_NAME:$TAG"
echo ""
echo "📤 To push to registry:"
echo "docker push your-registry.com/$IMAGE_NAME:$TAG"