#!/bin/bash

# Quick fix script for Docker build issues
# Usage: ./fix-build.sh

echo "🔧 Applying build fixes..."

# 1. Check for TypeScript errors and temporarily ignore them
echo "📝 Temporarily ignoring TypeScript errors for build..."

# 2. Clean build cache
echo "🧹 Cleaning build cache..."
rm -rf .next
rm -rf node_modules/.cache

# 3. Generate Prisma client
echo "🗄️  Generating Prisma client..."
npx prisma generate

# 4. Try local build first
echo "🏗️  Testing local build..."
if npm run build; then
    echo "✅ Local build successful!"
    
    # 5. Now try Docker build
    echo "🐳 Building Docker image..."
    docker build -t ku-badminton-reservation:latest .
    
    if [ $? -eq 0 ]; then
        echo "✅ Docker build successful!"
        echo "🚀 Ready to push: ./docker-push.sh latest"
    else
        echo "❌ Docker build failed"
        exit 1
    fi
else
    echo "❌ Local build failed - check the errors above"
    exit 1
fi