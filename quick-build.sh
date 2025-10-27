#!/bin/bash

# Quick Build Script for Mac/Linux
# Usage: ./quick-build.sh [tag]

TAG=${1:-latest}
IMAGE_NAME="ku-badminton-reservation"
DOCKER_HUB_REPO="thirapongp/ku-badminton-reservation"

echo "🔨 Quick Build Script - Mac/Linux"
echo "================================="
echo "Building: $DOCKER_HUB_REPO:$TAG"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Clean up old images (optional)
echo "🧹 Cleaning up old images..."
docker image prune -f

# Build the image
echo "📦 Building Docker image..."
docker build -t $IMAGE_NAME:$TAG .

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "🏷️ Image: $IMAGE_NAME:$TAG"
    echo ""
    echo "📋 Next steps:"
    echo "  Push: ./quick-push.sh $TAG"
    echo "  Deploy: ./quick-deploy.sh"
    echo ""
    echo "🔍 Image info:"
    docker images | grep $IMAGE_NAME
else
    echo "❌ Build failed!"
    exit 1
fi