# 🚀 Complete Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Required Files (Keep These):
- `Dockerfile`
- `docker-compose.prod.yml`
- `.env.prod`
- `package.json`
- `next.config.js`
- `prisma/schema.prisma`
- All `src/` files
- `public/` directory

### ❌ Files to Delete (Not Needed):
```bash
# Delete these files before deployment
rm -f docker-compose.yml
rm -f docker-compose.simple.yml
rm -f docker-compose.override.yml
rm -f .env.docker
rm -f .env.prod.example
rm -f deploy-manual.md
rm -f copy-files.bat
rm -f connect-server.sh
rm -f server-commands.sh
rm -f check-database.sh
rm -f setup-server.sh
rm -f deploy-with-env.sh
rm -f deploy-to-server.sh
rm -f deploy-to-server.bat
```

## 🔧 Step-by-Step Deployment

### Step 1: Clean Up Local Environment
```bash
# Remove unnecessary files
rm -f docker-compose.yml docker-compose.simple.yml docker-compose.override.yml
rm -f .env.docker .env.prod.example deploy-manual.md
rm -f copy-files.bat connect-server.sh server-commands.sh
rm -f check-database.sh setup-server.sh deploy-with-env.sh
rm -f deploy-to-server.sh deploy-to-server.bat

# Clean Docker
docker system prune -f
```

### Step 2: Build and Push Docker Image
```bash
# Build image
docker build -t ku-badminton-reservation:latest .

# Tag for Docker Hub
docker tag ku-badminton-reservation:latest thirapongp/ku-badminton-reservation:latest

# Login to Docker Hub
docker login

# Push to Docker Hub
docker push thirapongp/ku-badminton-reservation:latest
```

### Step 3: Prepare Server Files
```bash
# Copy essential files to server
scp docker-compose.prod.yml remotepang1@10.36.16.16:/home/remotepang1/ku-badminton-app/
scp .env.prod remotepang1@10.36.16.16:/home/remotepang1/ku-badminton-app/
scp prisma/migrations/add_system_settings.sql remotepang1@10.36.16.16:/home/remotepang1/ku-badminton-app/
```

### Step 4: Deploy on Server
```bash
# SSH to server
ssh remotepang1@10.36.16.16

# Go to app directory
cd /home/remotepang1/ku-badminton-app

# Pull latest image
docker pull thirapongp/ku-badminton-reservation:latest

# Stop existing containers
docker-compose -f docker-compose.prod.yml down

# Start new containers
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### Step 5: Database Migration
```bash
# SSH to server (if not already)
ssh remotepang1@10.36.16.16
cd /home/remotepang1/ku-badminton-app

# Run database migration
mysql -u appuser -p'Changeme123!' -h 10.36.16.16 book_badminton_court < add_system_settings.sql

# Or connect to app container and run Prisma
docker exec -it nextjs-app npx prisma db push
```

### Step 6: Verify Deployment
```bash
# Check containers
docker ps

# Check logs
docker logs nextjs-app

# Test application
curl http://10.36.16.16:3000

# Check database connection
docker exec -it nextjs-app npx prisma db seed
```

## 🎯 Quick Deploy Script

Create this script for future deployments:

```bash
#!/bin/bash
# quick-deploy.sh

echo "🚀 Quick Deployment Script"

# Step 1: Build and push
echo "📦 Building and pushing image..."
docker build -t thirapongp/ku-badminton-reservation:latest .
docker push thirapongp/ku-badminton-reservation:latest

# Step 2: Deploy on server
echo "🚀 Deploying on server..."
ssh remotepang1@10.36.16.16 "cd /home/remotepang1/ku-badminton-app && docker pull thirapongp/ku-badminton-reservation:latest && docker-compose -f docker-compose.prod.yml up -d"

echo "✅ Deployment complete!"
echo "🌐 Application: http://10.36.16.16:3000"
```

## 📁 Final File Structure

### Local Development:
```
ku-badminton-reservation/
├── src/                          # Keep
├── public/                       # Keep
├── prisma/                       # Keep
├── Dockerfile                    # Keep
├── docker-compose.prod.yml       # Keep
├── .env.prod                     # Keep
├── package.json                  # Keep
├── next.config.js                # Keep
├── quick-deploy.sh               # Keep
└── DEPLOYMENT_GUIDE.md           # Keep
```

### Server:
```
/home/remotepang1/ku-badminton-app/
├── docker-compose.prod.yml
├── .env.prod
└── add_system_settings.sql
```

## 🔍 Troubleshooting

### Common Issues:

1. **Port 3306 already in use**:
   ```bash
   # Check what's using the port
   sudo netstat -tulpn | grep :3306
   # Use external MySQL (already configured)
   ```

2. **Docker permission denied**:
   ```bash
   sudo usermod -aG docker $USER
   newgrp docker
   ```

3. **Image not found**:
   ```bash
   docker pull thirapongp/ku-badminton-reservation:latest
   ```

4. **Database connection failed**:
   ```bash
   # Check MySQL service
   sudo systemctl status mysql
   # Check credentials in .env.prod
   ```

## 🎛️ New Features Included:

1. **Booking System Control** - Admin can open/close booking system
2. **Auto-Open at 9:00 AM** - System opens automatically if admin forgets
3. **System Status Display** - Users see if system is open/closed
4. **Admin Logging** - Track all admin actions

## 🌐 Access URLs:

- **Application**: http://10.36.16.16:3000
- **Admin Panel**: http://10.36.16.16:3000/admin
- **Database**: 10.36.16.16:3306

## 📞 Support:

If deployment fails:
1. Check Docker logs: `docker logs nextjs-app`
2. Check database connection
3. Verify environment variables
4. Check firewall settings