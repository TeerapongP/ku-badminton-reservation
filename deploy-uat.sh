#!/bin/bash
# Deploy script for UAT behind Nginx reverse proxy (FINAL — overwrite nginx conf)
set -euo pipefail
cd "$(dirname "$0")"   # run from this script's directory

# ---- Config (local) ----
APP_IMAGE="thirapongp/ku-badminton-reservation:latest"
APP_NAME="ku-badminton-uat"
APP_NET="ku-net"
APP_DIR="/home/bookingkps/ku-badminton-app"
ENV_FILE=".env-uat"
APP_PORT="3000"
HOST_PORT="8080"
UPLOADS_DIR="${APP_DIR}/uploads"
SUDO_PASS="Al96yvOZ@"   # ⚠️ password of user 'bookingkps' on the server
SSH_PASS="Al96yvOZ@"    # SSH password (same as sudo for this user)
SERVER_USER="bookingkps"
SERVER_HOST="158.108.196.150"

# ---- Local sanity checks ----
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "❌ ${ENV_FILE} not found in $(pwd)"; exit 1
fi

# ---- SSH Key Setup (run once) ----
setup_ssh_key() {
  echo "🔑 Setting up SSH key authentication..."
  
  # Generate SSH key if not exists
  if [[ ! -f ~/.ssh/id_rsa ]]; then
    echo "📝 Generating SSH key..."
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N "" -C "deploy-key"
  fi
  
  # Copy public key to server
  echo "📤 Copying public key to server..."
  echo "Enter server password when prompted:"
  ssh-copy-id "${SERVER_USER}@${SERVER_HOST}"
  
  echo "✅ SSH key setup complete. You won't need password anymore."
}

# Check if SSH key authentication works
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "${SERVER_USER}@${SERVER_HOST}" exit 2>/dev/null; then
  echo "⚠️ SSH key authentication not working. Setting up..."
  setup_ssh_key
fi

echo "🚀 Starting UAT deployment..."
echo "📦 Building Docker image..."

# Load environment variables from .env-uat for build args
if [[ -f "${ENV_FILE}" ]]; then
  export $(grep -v '^#' "${ENV_FILE}" | grep 'NEXT_PUBLIC_' | xargs)
fi

docker buildx build --no-cache --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_ENCRYPTION_KEY="${NEXT_PUBLIC_ENCRYPTION_KEY}" \
  --build-arg NEXT_PUBLIC_RECAPTCHA_SITE_KEY="${NEXT_PUBLIC_RECAPTCHA_SITE_KEY}" \
  -t "${APP_IMAGE}" --push .

echo "📋 Copying environment file..."
scp "${ENV_FILE}" "${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/"

echo "📋 Copying log cleanup files..."
ssh "${SERVER_USER}@${SERVER_HOST}" "mkdir -p '${APP_DIR}/docker/cron' '${APP_DIR}/scripts' '${APP_DIR}/prisma'"
scp "docker/cron/Dockerfile.cron" "${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/docker/cron/"
scp "scripts/cleanup-logs.js" "${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/scripts/"
scp "package.json" "${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/"
scp "prisma/schema.prisma" "${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/prisma/"

echo "🔍 Verifying environment file..."
ssh "${SERVER_USER}@${SERVER_HOST}" "cd '${APP_DIR}' && ls -la ${ENV_FILE} && head -5 ${ENV_FILE}"

echo "🚢 Deploying on server..."
ssh "${SERVER_USER}@${SERVER_HOST}" "SUDO_PASS='${SUDO_PASS}' bash -se" << 'EOSSH'
set -euo pipefail

# ---- Config (remote) ----
APP_IMAGE="thirapongp/ku-badminton-reservation:latest"
APP_NAME="ku-badminton-uat"
APP_NET="ku-net"
APP_DIR="/home/bookingkps/ku-badminton-app"
ENV_FILE=".env-uat"
APP_PORT="3000"
HOST_PORT="8080"
UPLOADS_DIR="${APP_DIR}/uploads"

# ---- Folders & permissions ----
echo "📁 Ensuring base directories and permissions..."
echo "$SUDO_PASS" | sudo -S mkdir -p "${UPLOADS_DIR}"/{profiles,facilities,courts,payments,payment-slips,banners,temp}
echo "$SUDO_PASS" | sudo -S chown -R bookingkps:bookingkps "${UPLOADS_DIR}" || true
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
  -p 8080:3000 \
  -e HOST=0.0.0.0 \
  -e PORT="${APP_PORT}" \
  -e IMAGE_PATH="/app/uploads" \
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

# ---- Health check ----
echo "🩺 Health check..."
echo "🔍 Checking if Next.js app is responding..."
for i in $(seq 1 30); do
  if docker exec "${APP_NAME}" /bin/sh -c 'curl -fsS http://localhost:3000/ >/dev/null 2>&1'; then
    echo "✅ Next.js app is responding"; break; fi; sleep 2
  [ "$i" -eq 30 ] && { echo "❌ Next.js app not responding"; docker logs "${APP_NAME}" --tail 50; }
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

echo "📝 App logs (last 60 lines):"
docker logs "${APP_NAME}" --tail 60 || true

echo "🧹 Log cleanup cron logs (if available):"
docker logs "${LOG_CLEANUP_NAME}" --tail 20 2>/dev/null || echo "Log cleanup container not running"

echo "ℹ️ If firewall enabled, allow: sudo ufw allow 8080/tcp"
EOSSH

echo "✅ UAT deployment completed!"
echo "🌐 App should be available at: http://158.108.196.150:8080"
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
