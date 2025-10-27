#!/bin/bash

# Quick Deployment Script for Mac/Linux
# Usage: ./quick-deploy.sh [tag]

TAG=${1:-latest}

echo "🚀 Quick Deployment Script - Mac/Linux"
echo "======================================"
echo "Deploying: thirapongp/ku-badminton-reservation:$TAG"
echo ""

# Configuration
DOCKER_USERNAME="thirapongp"
IMAGE_NAME="ku-badminton-reservation"
SERVER_USER="remotepang1"
SERVER_IP="10.36.16.16"
DEPLOY_PATH="/home/remotepang1/ku-badminton-app"

# Check if SSH key is available
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 ${SERVER_USER}@${SERVER_IP} echo "SSH connection test" 2>/dev/null; then
    echo "❌ Cannot connect to server. Please check:"
    echo "  - SSH key is set up"
    echo "  - Server is accessible"
    echo "  - VPN connection (if required)"
    echo ""
    echo "🔧 Run diagnostics:"
    echo "  ./check-ssh.sh"
    echo ""
    echo "🔐 Setup SSH (if needed):"
    echo "  ./setup-ssh.sh"
    exit 1
fi

# Step 1: Clean up unnecessary files
echo "🧹 Cleaning up unnecessary files..."
rm -f docker-compose.yml docker-compose.simple.yml docker-compose.override.yml
rm -f .env.docker .env.prod.example deploy-manual.md
rm -f copy-files.bat connect-server.sh server-commands.sh
rm -f check-database.sh setup-server.sh deploy-with-env.sh
rm -f deploy-to-server.sh deploy-to-server.bat

# Step 2: Build and push if needed
echo "📦 Checking if image needs to be built/pushed..."
if ! docker images | grep -q "${DOCKER_USERNAME}/${IMAGE_NAME}.*${TAG}"; then
    echo "🔨 Building and pushing image..."
    ./quick-push.sh $TAG
    if [ $? -ne 0 ]; then
        echo "❌ Build/push failed!"
        exit 1
    fi
else
    echo "✅ Image already exists locally"
    echo "⬆️ Pushing latest version..."
    docker push ${DOCKER_USERNAME}/${IMAGE_NAME}:${TAG}
fi

# Step 3: Deploy on server
echo "🚀 Deploying on server..."
echo "  Server: ${SERVER_USER}@${SERVER_IP}"
echo "  Path: ${DEPLOY_PATH}"
echo ""

ssh ${SERVER_USER}@${SERVER_IP} << EOF
    cd ${DEPLOY_PATH}
    echo "📥 Pulling latest image..."
    docker pull ${DOCKER_USERNAME}/${IMAGE_NAME}:${TAG}
    
    echo "🛑 Stopping current containers..."
    docker-compose -f docker-compose.prod.yml down
    
    echo "🚀 Starting new containers..."
    docker-compose -f docker-compose.prod.yml up -d
    
    echo "⏳ Waiting for containers to start..."
    sleep 10
    
    echo "📊 Container status:"
    docker-compose -f docker-compose.prod.yml ps
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo "🌐 Application: http://${SERVER_IP}:3000"
    echo "🗄️ Database: ${SERVER_IP}:3306"
    echo "📝 Note: Application is now accessible directly on port 3000 (no proxy)"
    echo ""
    echo "📋 Useful commands:"
    echo "  Check logs: ssh ${SERVER_USER}@${SERVER_IP} 'cd ${DEPLOY_PATH} && docker-compose -f docker-compose.prod.yml logs -f'"
    echo "  Restart: ssh ${SERVER_USER}@${SERVER_IP} 'cd ${DEPLOY_PATH} && docker-compose -f docker-compose.prod.yml restart'"
else
    echo "❌ Deployment failed!"
    exit 1
fi