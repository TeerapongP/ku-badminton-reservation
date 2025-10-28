#!/bin/bash

# Deploy script for UAT environment
set -e

echo "🚀 Starting UAT deployment..."

# Build and push Docker image
echo "📦 Building Docker image..."
docker buildx build --no-cache --platform linux/amd64 -t thirapongp/ku-badminton-reservation:latest --push .

# Copy .env-uat to server
echo "📋 Copying environment file..."
scp .env-uat remotepang1@10.36.16.16:/home/remotepang1/ku-badminton-app/

# Deploy on server
echo "🚢 Deploying on server..."
ssh remotepang1@10.36.16.16 << 'EOF'
cd /home/remotepang1/ku-badminton-app/

# Stop and remove old container
echo "🛑 Stopping old container..."
docker stop ku-badminton-uat 2>/dev/null || true
docker rm ku-badminton-uat 2>/dev/null || true

# Pull new image
echo "⬇️ Pulling new image..."
docker pull thirapongp/ku-badminton-reservation:latest

# Run new container
echo "▶️ Starting new container..."
docker run -d --name ku-badminton-uat --env-file .env-uat -p 3001:3000 thirapongp/ku-badminton-reservation:latest

# Wait a moment for container to start
sleep 5

# Check container status
echo "📊 Container status:"
docker ps | grep ku-badminton-uat || echo "Container not running!"

# Show logs
echo "📝 Container logs:"
docker logs ku-badminton-uat --tail 20
EOF

echo "✅ UAT deployment completed!"
echo "🌐 App should be available at: http://10.36.16.16:3001"