# 🐳 Docker Commands for KU Badminton Reservation

## Build Commands

### 1. Build Docker Image
```bash
# Build with latest tag
docker build -t ku-badminton-reservation:latest .

# Build with specific tag
docker build -t ku-badminton-reservation:v1.0.0 .

# Build with no cache (clean build)
docker build --no-cache -t ku-badminton-reservation:latest .

# Build using the script
./docker-build.sh
./docker-build.sh v1.0.0
```

### 2. Multi-platform Build (for different architectures)
```bash
# Build for multiple platforms
docker buildx build --platform linux/amd64,linux/arm64 -t ku-badminton-reservation:latest .

# Build and push to registry
docker buildx build --platform linux/amd64,linux/arm64 -t your-registry.com/ku-badminton-reservation:latest --push .
```

## Run Commands

### 3. Run Single Container
```bash
# Run with environment file
docker run -p 3000:3000 --env-file .env ku-badminton-reservation:latest

# Run in background
docker run -d -p 3000:3000 --env-file .env --name ku-badminton ku-badminton-reservation:latest

# Run with volume mounts
docker run -d -p 3000:3000 --env-file .env -v $(pwd)/public/uploads:/app/public/uploads ku-badminton-reservation:latest
```

### 4. Docker Compose Commands
```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d app db redis

# Start with build
docker-compose up -d --build

# Start with specific profile
docker-compose --profile monitoring up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Management Commands

### 5. Container Management
```bash
# List running containers
docker ps

# List all containers
docker ps -a

# Stop container
docker stop ku-badminton

# Remove container
docker rm ku-badminton

# Execute command in running container
docker exec -it ku-badminton /bin/sh

# View container logs
docker logs -f ku-badminton
```

### 6. Image Management
```bash
# List images
docker images

# Remove image
docker rmi ku-badminton-reservation:latest

# Remove unused images
docker image prune

# Remove all unused images
docker image prune -a

# Tag image for registry
docker tag ku-badminton-reservation:latest your-registry.com/ku-badminton-reservation:latest

# Push to registry
docker push your-registry.com/ku-badminton-reservation:latest
```

### 7. System Cleanup
```bash
# Remove unused containers, networks, images
docker system prune

# Remove everything including volumes
docker system prune -a --volumes

# Remove specific volumes
docker volume rm mysql_data redis_data
```

## Development Commands

### 8. Development with Docker
```bash
# Run in development mode with volume mount
docker run -p 3000:3000 -v $(pwd):/app -v /app/node_modules --env-file .env ku-badminton-reservation:latest

# Use docker-compose for development
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### 9. Database Operations
```bash
# Run Prisma migrations in container
docker exec ku-badminton npx prisma migrate deploy

# Generate Prisma client
docker exec ku-badminton npx prisma generate

# Seed database
docker exec ku-badminton npx prisma db seed

# Access MySQL directly
docker exec -it mysql-db mysql -u root -p
```

## Production Deployment

### 10. Production Build & Deploy
```bash
# Build production image
docker build -t ku-badminton-reservation:prod --target runner .

# Run production stack
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Health check
curl http://localhost:3000/api/health

# View production logs
docker-compose logs -f app
```

### 11. Docker Hub Operations
```bash
# Login to Docker Hub
docker login

# Tag for Docker Hub (your username: thirapongp)
docker tag ku-badminton-reservation:latest thirapongp/ku-badminton-reservation:latest
docker tag ku-badminton-reservation:latest thirapongp/ku-badminton-reservation:v1.0.0

# Push to Docker Hub
docker push thirapongp/ku-badminton-reservation:latest
docker push thirapongp/ku-badminton-reservation:v1.0.0

# Pull from Docker Hub
docker pull thirapongp/ku-badminton-reservation:latest
docker pull thirapongp/ku-badminton-reservation:v1.0.0

# Using the push script
./docker-push.sh latest
./docker-push.sh v1.0.0
./docker-push.sh multi-arch latest
```

### 12. Registry Operations (Generic)
```bash
# Login to any registry
docker login your-registry.com

# Tag for production
docker tag ku-badminton-reservation:latest your-registry.com/ku-badminton-reservation:prod

# Push to production registry
docker push your-registry.com/ku-badminton-reservation:prod

# Pull from registry
docker pull your-registry.com/ku-badminton-reservation:prod
```

## Monitoring & Debugging

### 13. Container Inspection
```bash
# Inspect container
docker inspect ku-badminton

# Check container stats
docker stats ku-badminton

# Check container processes
docker top ku-badminton

# Export container filesystem
docker export ku-badminton > ku-badminton-backup.tar
```

### 14. Network & Volume Inspection
```bash
# List networks
docker network ls

# Inspect network
docker network inspect ku-badminton-reservation_app-network

# List volumes
docker volume ls

# Inspect volume
docker volume inspect mysql_data
```

## Docker Hub Workflow (thirapongp)

### Quick Push Commands
```bash
# Build and push latest
docker build -t ku-badminton-reservation:latest .
docker tag ku-badminton-reservation:latest thirapongp/ku-badminton-reservation:latest
docker push thirapongp/ku-badminton-reservation:latest

# Build and push with version tag
docker build -t ku-badminton-reservation:v1.0.0 .
docker tag ku-badminton-reservation:v1.0.0 thirapongp/ku-badminton-reservation:v1.0.0
docker push thirapongp/ku-badminton-reservation:v1.0.0

# Using the automated script
./docker-push.sh latest
./docker-push.sh v1.0.0
./docker-push.sh multi-arch latest  # For multi-architecture
```

### Pull and Run from Docker Hub
```bash
# Pull latest version
docker pull thirapongp/ku-badminton-reservation:latest

# Pull specific version
docker pull thirapongp/ku-badminton-reservation:v1.0.0

# Run from Docker Hub
docker run -p 3000:3000 --env-file .env thirapongp/ku-badminton-reservation:latest

# Run with docker-compose using Docker Hub image
# Update docker-compose.yml to use: image: thirapongp/ku-badminton-reservation:latest
docker-compose up -d
```

## Quick Start Commands

```bash
# Complete setup from scratch
git clone <repository>
cd ku-badminton-reservation
cp .env.example .env
# Edit .env file with your values
docker-compose up -d --build
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma db seed
```

### Quick Start with Docker Hub Image
```bash
# Using pre-built image from Docker Hub
git clone <repository>
cd ku-badminton-reservation
cp .env.example .env
# Edit docker-compose.yml to use: image: thirapongp/ku-badminton-reservation:latest
docker-compose up -d
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma db seed
```

## Troubleshooting

### Common Issues
```bash
# Container won't start - check logs
docker logs ku-badminton

# Port already in use
docker ps | grep 3000
sudo lsof -i :3000

# Permission issues
docker exec -it ku-badminton ls -la /app

# Database connection issues
docker-compose exec app npx prisma db push
```