#!/bin/bash

# Quick Docker Hub Push Script
# Usage: ./quick-push.sh [tag]

TAG=${1:-latest}
IMAGE_NAME="ku-badminton-reservation"
DOCKER_HUB_REPO="thirapongp/ku-badminton-reservation"

echo "🚀 Quick push to Docker Hub: $DOCKER_HUB_REPO:$TAG"

# Build, tag, and push in one go
docker build -t $IMAGE_NAME:$TAG . && \
docker tag $IMAGE_NAME:$TAG $DOCKER_HUB_REPO:$TAG && \
docker push $DOCKER_HUB_REPO:$TAG

echo "✅ Push completed: $DOCKER_HUB_REPO:$TAG"
echo "📥 Pull command: docker pull $DOCKER_HUB_REPO:$TAG"