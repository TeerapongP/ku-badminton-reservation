#!/bin/bash

echo "🧹 Cleaning up unnecessary files for deployment..."

# Remove unnecessary Docker Compose files
echo "Removing Docker Compose files..."
rm -f docker-compose.yml
rm -f docker-compose.simple.yml
rm -f docker-compose.override.yml

# Remove environment examples
echo "Removing environment examples..."
rm -f .env.docker
rm -f .env.prod.example

# Remove manual deployment files
echo "Removing manual deployment files..."
rm -f deploy-manual.md
rm -f copy-files.bat

# Remove connection scripts
echo "Removing connection scripts..."
rm -f connect-server.sh
rm -f server-commands.sh

# Remove setup scripts
echo "Removing setup scripts..."
rm -f check-database.sh
rm -f setup-server.sh
rm -f deploy-with-env.sh
rm -f deploy-to-server.sh
rm -f deploy-to-server.bat

# Remove build scripts (keep only essential ones)
echo "Removing old build scripts..."
rm -f build-docker.sh
rm -f push-to-hub.sh

echo "✅ Cleanup complete!"
echo ""
echo "📁 Remaining essential files:"
echo "- Dockerfile"
echo "- docker-compose.prod.yml"
echo "- .env.prod"
echo "- quick-deploy.sh"
echo "- DEPLOYMENT_GUIDE.md"
echo "- All src/ and public/ files"