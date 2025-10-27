#!/bin/bash

echo "🚀 Quick Deployment Script"
echo "=========================="

# Configuration
DOCKER_USERNAME="thirapongp"
IMAGE_NAME="ku-badminton-reservation"
SERVER_USER="remotepang1"
SERVER_IP="10.36.16.16"
DEPLOY_PATH="/home/remotepang1/ku-badminton-app"

# Step 1: Clean up unnecessary files
echo "🧹 Cleaning up unnecessary files..."
rm -f docker-compose.yml docker-compose.simple.yml docker-compose.override.yml
rm -f .env.docker .env.prod.example deploy-manual.md
rm -f copy-files.bat connect-server.sh server-commands.sh
rm -f check-database.sh setup-server.sh deploy-with-env.sh
rm -f deploy-to-server.sh deploy-to-server.bat

# Step 2: Build and push Docker image
echo "📦 Building Docker image..."
docker build -t ${IMAGE_NAME}:latest .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo "🏷️ Tagging image..."
docker tag ${IMAGE_NAME}:latest ${DOCKER_USERNAME}/${IMAGE_NAME}:latest

echo "⬆️ Pushing to Docker Hub..."
docker push ${DOCKER_USERNAME}/${IMAGE_NAME}:latest

if [ $? -ne 0 ]; then
    echo "❌ Docker push failed!"
    exit 1
fi

# Step 3: Deploy on server
echo "🚀 Deploying on server..."
ssh ${SERVER_USER}@${SERVER_IP} "cd ${DEPLOY_PATH} && docker pull ${DOCKER_USERNAME}/${IMAGE_NAME}:latest && docker-compose -f docker-compose.prod.yml down && docker-compose -f docker-compose.prod.yml up -d"

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Application: http://${SERVER_IP}:3000"
    echo "🗄️ Database: ${SERVER_IP}:3306"
    
    echo ""
    echo "📊 Checking deployment status..."
    ssh ${SERVER_USER}@${SERVER_IP} "cd ${DEPLOY_PATH} && docker-compose -f docker-compose.prod.yml ps"
else
    echo "❌ Deployment failed!"
    exit 1
fi