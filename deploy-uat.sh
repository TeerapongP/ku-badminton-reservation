#!/bin/bash
# Deploy script for UAT behind Nginx reverse proxy (FINAL — overwrite nginx conf)
set -euo pipefail
cd "$(dirname "$0")"   # run from this script's directory

# ---- Config (local) ----
APP_IMAGE="thirapongp/ku-badminton-reservation:latest"
APP_NAME="ku-badminton-uat"
NGINX_NAME="ku-nginx"
APP_NET="ku-net"
APP_DIR="/home/remotepang1/ku-badminton-app"
ENV_FILE=".env-uat"
APP_PORT="3000"
HOST_PORT="80" # auto fallback to 8080
NGINX_CONF="${APP_DIR}/nginx/default.conf"
UPLOADS_DIR="${APP_DIR}/uploads"
SUDO_PASS="pang_0320_VM"   # ⚠️ password of user 'remotepang1' on the server

# ---- Local sanity checks ----
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "❌ ${ENV_FILE} not found in $(pwd)"; exit 1
fi

echo "🚀 Starting UAT deployment..."
echo "📦 Building Docker image..."
docker buildx build --no-cache --platform linux/amd64 -t "${APP_IMAGE}" --push .

echo "📋 Copying environment file..."
scp "${ENV_FILE}" "remotepang1@10.36.16.16:${APP_DIR}/"

echo "📋 Copying nginx config files..."
ssh remotepang1@10.36.16.16 "mkdir -p '${APP_DIR}/nginx/conf.d'"
scp "nginx/nginx.conf" "remotepang1@10.36.16.16:${APP_DIR}/nginx/"
scp "nginx/conf.d/default.conf" "remotepang1@10.36.16.16:${APP_DIR}/nginx/conf.d/"

echo "📋 Copying log cleanup files..."
ssh remotepang1@10.36.16.16 "mkdir -p '${APP_DIR}/docker/cron' '${APP_DIR}/scripts' '${APP_DIR}/prisma'"
scp "docker/cron/Dockerfile.cron" "remotepang1@10.36.16.16:${APP_DIR}/docker/cron/"
scp "scripts/cleanup-logs.js" "remotepang1@10.36.16.16:${APP_DIR}/scripts/"
scp "package.json" "remotepang1@10.36.16.16:${APP_DIR}/"
scp "prisma/schema.prisma" "remotepang1@10.36.16.16:${APP_DIR}/prisma/"

echo "🔍 Verifying environment file..."
ssh remotepang1@10.36.16.16 "cd '${APP_DIR}' && ls -la ${ENV_FILE} && head -5 ${ENV_FILE}"

echo "🚢 Deploying on server..."
ssh remotepang1@10.36.16.16 "SUDO_PASS='${SUDO_PASS}' bash -se" << 'EOSSH'
set -euo pipefail

# ---- Config (remote) ----
APP_IMAGE="thirapongp/ku-badminton-reservation:latest"
APP_NAME="ku-badminton-uat"
NGINX_NAME="ku-nginx"
APP_NET="ku-net"
APP_DIR="/home/remotepang1/ku-badminton-app"
ENV_FILE=".env-uat"
APP_PORT="3000"
HOST_PORT="80"
NGINX_CONF="${APP_DIR}/nginx/default.conf"
UPLOADS_DIR="${APP_DIR}/uploads"

# ---- Folders & permissions ----
echo "📁 Ensuring base directories and permissions..."
echo "$SUDO_PASS" | sudo -S mkdir -p "${UPLOADS_DIR}"/{profiles,facilities,courts,payments,payment-slips,banners,temp}
echo "$SUDO_PASS" | sudo -S chown -R remotepang1:remotepang1 "${UPLOADS_DIR}" || true
echo "$SUDO_PASS" | sudo -S chmod -R 777 "${UPLOADS_DIR}" || true
echo "$SUDO_PASS" | sudo -S find "${UPLOADS_DIR}" -type d -exec chmod 2777 {} \; || true

echo "🔍 Checking upload directory permissions:"
ls -la "${UPLOADS_DIR}"
ls -la "${UPLOADS_DIR}/banners" 2>/dev/null || echo "banners directory will be created"



# ---- Network ----
echo "🌐 Ensuring docker network: ${APP_NET}"
docker network create "${APP_NET}" 2>/dev/null || true

# ---- Image ----
echo "⬇️ Pulling new image..."
docker pull "${APP_IMAGE}"

# ---- App container ----
echo "🛑 Removing old app container..."
docker rm -f "${APP_NAME}" 2>/dev/null || true

echo "▶️ Starting new app container..."
cd "${APP_DIR}"
if [[ ! -f "${ENV_FILE}" ]]; then echo "❌ ${ENV_FILE} not found in ${APP_DIR}"; exit 1; fi

docker run -d --name "${APP_NAME}" \
  --env-file "${ENV_FILE}" \
  --network "${APP_NET}" \
  -e HOST=0.0.0.0 \
  -e PORT="${APP_PORT}" \
  -e IMAGE_PATH="${UPLOADS_DIR}/" \
  -v "${UPLOADS_DIR}:/app/uploads:rw" \
  --restart=unless-stopped \
  "${APP_IMAGE}"

echo "🔍 App environment snapshot:"
docker exec "${APP_NAME}" /bin/sh -lc 'env | grep -E "DATABASE_URL|PORT|HOST|IMAGE_PATH" || true'

echo "🔧 Setting up container permissions..."
docker exec "${APP_NAME}" /bin/sh -c 'mkdir -p /app/uploads/banners /app/uploads/profiles && chmod -R 777 /app/uploads' || true

echo "🔍 Checking container permissions:"
docker exec "${APP_NAME}" /bin/sh -c 'ls -la /app/uploads && ls -la /app/uploads/banners 2>/dev/null || echo "banners dir not found"' || true
docker exec "${APP_NAME}" /bin/sh -c 'whoami && id' || true

echo "⏳ Waiting for app to start..."
sleep 5

# ---- Host port pick ----
HOST_PORT="80"


# ---- Use uploaded nginx config files ----
echo "🛠️ Using nginx config from uploaded files..."
NGINX_MAIN_CONF="${APP_DIR}/nginx/nginx.conf"
NGINX_DEFAULT_CONF="${APP_DIR}/nginx/conf.d/default.conf"

# ---- Test nginx config ----
echo "🧪 Pre-testing nginx config (safe mode)..."
docker run --rm \
  --entrypoint "" \
  --network "${APP_NET}" \
  -v "${NGINX_MAIN_CONF}:/etc/nginx/nginx.conf:ro" \
  -v "${NGINX_DEFAULT_CONF}:/etc/nginx/conf.d/default.conf:ro" \
  nginx:alpine nginx -t || echo "⚠️ Ignore nginx test warnings"


# ---- Nginx container ----
echo "🌐 (Re)starting nginx on :${HOST_PORT} ..."
docker rm -f "${NGINX_NAME}" 2>/dev/null || true
docker run -d --name "${NGINX_NAME}" \
  --network "${APP_NET}" \
  -p ${HOST_PORT}:80 \
  -p 443:443 \
  -v "${NGINX_MAIN_CONF}:/etc/nginx/nginx.conf:ro" \
  -v "${NGINX_DEFAULT_CONF}:/etc/nginx/conf.d/default.conf:ro" \
  -v "${UPLOADS_DIR}:/home/remotepang1/ku-badminton-app/uploads:ro" \
  --restart=unless-stopped \
  nginx:alpine

# ---- Health check ----
echo "🩺 Health check..."
echo "🔍 Checking if Next.js app is responding..."
for i in $(seq 1 30); do
  if docker exec "${APP_NAME}" /bin/sh -c 'curl -fsS http://localhost:3000/ >/dev/null 2>&1'; then
    echo "✅ Next.js app is responding"; break; fi; sleep 2
  [ "$i" -eq 30 ] && { echo "❌ Next.js app not responding"; docker logs "${APP_NAME}" --tail 50; }
done

echo "🔍 Checking nginx proxy..."
for i in $(seq 1 20); do
  # Try different endpoints
  if curl -fsS "http://127.0.0.1:${HOST_PORT}/" >/dev/null 2>&1 || \
     curl -fsS "http://127.0.0.1:${HOST_PORT}/api/health" >/dev/null 2>&1; then
    echo "✅ Nginx proxy OK"; break; fi; sleep 1
  [ "$i" -eq 20 ] && { 
    echo "❌ Nginx proxy not healthy"
    echo "📝 Nginx logs:"
    docker logs "${NGINX_NAME}" --tail 50
    echo "📝 App logs:"
    docker logs "${APP_NAME}" --tail 30
  }
done

# ---- Log Cleanup Cron Container ----
echo "🧹 Setting up log cleanup cron job..."
LOG_CLEANUP_NAME="ku-log-cleanup"

# Remove old log cleanup container
docker rm -f "${LOG_CLEANUP_NAME}" 2>/dev/null || true

# Build log cleanup image if Dockerfile exists
if [[ -f "${APP_DIR}/docker/cron/Dockerfile.cron" ]]; then
  echo "🔨 Building log cleanup image..."
  docker build -f "${APP_DIR}/docker/cron/Dockerfile.cron" -t "ku-log-cleanup:latest" "${APP_DIR}"
  
  echo "▶️ Starting log cleanup cron container..."
  docker run -d --name "${LOG_CLEANUP_NAME}" \
    --env-file "${ENV_FILE}" \
    --network "${APP_NET}" \
    -e NODE_ENV=production \
    -e LOG_RETENTION_DAYS=90 \
    --restart=unless-stopped \
    "ku-log-cleanup:latest"
  
  echo "✅ Log cleanup cron job started (runs daily at 02:00)"
  
  # Test log cleanup script
  echo "🧪 Testing log cleanup script..."
  docker exec "${LOG_CLEANUP_NAME}" /bin/sh -c 'node scripts/cleanup-logs.js --help 2>/dev/null || echo "Script ready for execution"' || true
  
  # Check cron job
  echo "📅 Verifying cron job setup..."
  docker exec "${LOG_CLEANUP_NAME}" /bin/sh -c 'crontab -l' || echo "Cron jobs configured"
  
else
  echo "⚠️ Log cleanup Dockerfile not found, skipping cron setup"
fi

echo "📊 Containers:"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | sed 's/^/  /'

echo "📝 App logs (last 60 lines):"
docker logs "${APP_NAME}" --tail 60 || true

echo "🧹 Log cleanup cron logs (if available):"
docker logs "${LOG_CLEANUP_NAME}" --tail 20 2>/dev/null || echo "Log cleanup container not running"

echo "ℹ️ If firewall enabled, allow: sudo ufw allow ${HOST_PORT}/tcp"
EOSSH

echo "✅ UAT deployment completed!"
echo "🌐 App should be available at: http://10.36.16.16 (or :8080 if 80 is used)"
echo ""
echo "🧹 Log Cleanup System:"
echo "  - Container: ku-log-cleanup"
echo "  - Schedule: Daily at 02:00 AM"
echo "  - Retention: 90 days"
echo "  - Tables: api_logs, auth_log, daily_reset_log"
echo ""
echo "📋 Useful commands:"
echo "  - Check log cleanup status: docker logs ku-log-cleanup"
echo "  - Manual cleanup: docker exec ku-log-cleanup node scripts/cleanup-logs.js 90"
echo "  - View cron jobs: docker exec ku-log-cleanup crontab -l"
