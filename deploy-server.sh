#!/bin/bash

echo "🚀 Deploying to Production Server..."

# Configuration
DOCKER_USERNAME="thirapongp"
IMAGE_NAME="ku-badminton-reservation"
TAG="latest"
FULL_IMAGE="${DOCKER_USERNAME}/${IMAGE_NAME}:${TAG}"

echo "📥 Pulling latest image from Docker Hub..."
docker pull ${FULL_IMAGE}

if [ $? -ne 0 ]; then
    echo "❌ Failed to pull image from Docker Hub!"
    exit 1
fi

echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

echo "🧹 Removing old containers and images..."
docker container prune -f
docker image prune -f

echo "🚀 Starting new containers..."
docker-compose -f docker-compose.prod.yml up -d

echo "📋 Checking container status..."
docker-compose -f docker-compose.prod.yml ps

echo "📊 Checking logs..."
docker-compose -f docker-compose.prod.yml logs --tail=20

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Application should be available at: http://your-server-ip:3000"
else
    echo "❌ Deployment failed!"
    exit 1
fi