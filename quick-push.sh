#!/bin/bash

# Quick Docker Hub Push Script for Mac/Linux
# Usage: ./quick-push.sh [tag]

TAG=${1:-latest}
IMAGE_NAME="ku-badminton-reservation"
DOCKER_HUB_REPO="thirapongp/ku-badminton-reservation"

echo "🚀 Quick Push Script - Mac/Linux"
echo "================================"
echo "Pushing: $DOCKER_HUB_REPO:$TAG"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if image exists locally
if ! docker images | grep -q "$IMAGE_NAME.*$TAG"; then
    echo "⚠️ Image $IMAGE_NAME:$TAG not found locally."
    echo "🔨 Building image first..."
    ./quick-build.sh $TAG
    if [ $? -ne 0 ]; then
        echo "❌ Build failed!"
        exit 1
    fi
fi

# Tag and push
echo "🏷️ Tagging image..."
docker tag $IMAGE_NAME:$TAG $DOCKER_HUB_REPO:$TAG

echo "⬆️ Pushing to Docker Hub..."
docker push $DOCKER_HUB_REPO:$TAG

if [ $? -eq 0 ]; then
    echo "✅ Push completed: $DOCKER_HUB_REPO:$TAG"
    echo "📥 Pull command: docker pull $DOCKER_HUB_REPO:$TAG"
    echo ""
    echo "📋 Next step:"
    echo "  Deploy: ./quick-deploy.sh"
else
    echo "❌ Push failed!"
    exit 1
fi