#!/bin/bash
# deploy script for uat behind nginx reverse proxy
set -euo pipefail
cd "$(dirname "$0")"   # run from this script's directory

# ---- config (local) ----
APP_IMAGE="thirapongp/ku-badminton-reservation:latest"
APP_NAME="ku-badminton-uat"
APP_NET="ku-net"
APP_DIR="/home/bookingkps/ku-badminton-app"
ENV_FILE=".env-uat"
APP_PORT="3000"
HOST_PORT="8080"
UPLOADS_DIR="${APP_DIR}/uploads"
SUDO_PASS="Al96yvOZ@"   # set via environment variable
SUDO_PASS="Al96yvOZ@"     # set via environment variable
SERVER_USER="bookingkps"
SERVER_HOST="158.108.196.150"

# ---- local sanity checks ----
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "❌ ${ENV_FILE} not found in $(pwd)"; exit 1
fi

# ---- ssh key setup (run once) ----
setup_ssh_key() {
  echo "🔑 setting up ssh key authentication..."
  
  if [[ ! -f ~/.ssh/id_rsa ]]; then
    echo "📝 generating ssh key..."
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N "" -C "deploy-key"
  fi
  
  echo "📤 copying public key to server..."
  echo "enter server password when prompted:"
  ssh-copy-id "${SERVER_USER}@${SERVER_HOST}"
  
  echo "✅ ssh key setup complete. you won't need password anymore."
}

if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "${SERVER_USER}@${SERVER_HOST}" exit 2>/dev/null; then
  echo "⚠️ ssh key authentication not working. setting up..."
  setup_ssh_key
fi

echo "🚀 starting uat deployment..."
echo "📦 building docker image (using cache if available)..."

# load environment variables from .env-uat for build args
if [[ -f "${ENV_FILE}" ]]; then
  export $(grep -v '^#' "${ENV_FILE}" | grep 'NEXT_PUBLIC_' | xargs)
fi

# removed --no-cache here to significantly speed up the build process
docker buildx build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_ENCRYPTION_KEY="${NEXT_PUBLIC_ENCRYPTION_KEY}" \
  --build-arg NEXT_PUBLIC_RECAPTCHA_SITE_KEY="${NEXT_PUBLIC_RECAPTCHA_SITE_KEY}" \
  -t "${APP_IMAGE}" --push .

echo "📋 copying environment file..."
scp "${ENV_FILE}" "${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/"

echo "📋 copying log cleanup files..."
ssh "${SERVER_USER}@${SERVER_HOST}" "mkdir -p '${APP_DIR}/docker/cron' '${APP_DIR}/scripts' '${APP_DIR}/prisma'"
scp "docker/cron/Dockerfile.cron" "${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/docker/cron/"
scp "scripts/cleanup-logs.js" "${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/scripts/"
scp "package.json" "${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/"
scp "prisma/schema.prisma" "${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/prisma/"

echo "🔍 verifying environment file..."
ssh "${SERVER_USER}@${SERVER_HOST}" "cd '${APP_DIR}' && ls -la ${ENV_FILE} && head -5 ${ENV_FILE}"

echo "🚢 deploying on server..."
ssh "${SERVER_USER}@${SERVER_HOST}" "SUDO_PASS='${SUDO_PASS}' bash -se" << 'EOSSH'
set -euo pipefail

# ---- config (remote) ----
APP_IMAGE="thirapongp/ku-badminton-reservation:latest"
APP_NAME="ku-badminton-uat"
APP_NET="ku-net"
APP_DIR="/home/bookingkps/ku-badminton-app"
ENV_FILE=".env-uat"
APP_PORT="3000"
HOST_PORT="8080"
UPLOADS_DIR="${APP_DIR}/uploads"

# ---- folders & permissions ----
echo "📁 ensuring base directories and permissions..."
echo "$SUDO_PASS" | sudo -S mkdir -p "${UPLOADS_DIR}"/{profiles,facilities,courts,payments,payment-slips,banners,temp}
echo "$SUDO_PASS" | sudo -S chown -R bookingkps:bookingkps "${UPLOADS_DIR}" || true
echo "$SUDO_PASS" | sudo -S chmod -R 777 "${UPLOADS_DIR}" || true
echo "$SUDO_PASS" | sudo -S find "${UPLOADS_DIR}" -type d -exec chmod 2777 {} \; || true

# ---- network ----
echo "🌐 ensuring docker network: ${APP_NET}"
docker network create "${APP_NET}" 2>/dev/null || true

# ---- image ----
echo "⬇️ pulling new image..."
docker pull "${APP_IMAGE}"

# ---- app container ----
echo "🛑 removing old app container..."
docker rm -f "${APP_NAME}" 2>/dev/null || true

echo "▶️ starting new app container..."
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

echo "🔧 setting up container permissions..."
docker exec "${APP_NAME}" /bin/sh -c 'mkdir -p /app/uploads/banners /app/uploads/profiles && chmod -R 777 /app/uploads' || true

echo "⏳ waiting for app to start..."
sleep 5

# ---- health check ----
echo "🩺 checking if next.js app is responding..."
for i in $(seq 1 30); do
  if docker exec "${APP_NAME}" /bin/sh -c 'curl -fsS http://localhost:3000/ >/dev/null 2>&1'; then
    echo "✅ next.js app is responding"; break; fi; sleep 2
  [ "$i" -eq 30 ] && { echo "❌ next.js app not responding"; docker logs "${APP_NAME}" --tail 50; }
done

# ---- log cleanup cron container ----
echo "🧹 setting up log cleanup cron job..."
LOG_CLEANUP_NAME="ku-log-cleanup"

docker rm -f "${LOG_CLEANUP_NAME}" 2>/dev/null || true

if [[ -f "${APP_DIR}/docker/cron/Dockerfile.cron" ]]; then
  echo "🔨 building log cleanup image (will be instant if no changes)..."
  docker build -f "${APP_DIR}/docker/cron/Dockerfile.cron" -t "ku-log-cleanup:latest" "${APP_DIR}"
  
  echo "▶️ starting log cleanup cron container..."
  docker run -d --name "${LOG_CLEANUP_NAME}" \
    --env-file "${ENV_FILE}" \
    --network "${APP_NET}" \
    -e NODE_ENV=production \
    -e LOG_RETENTION_DAYS=90 \
    --restart=unless-stopped \
    "ku-log-cleanup:latest"
    
  echo "✅ log cleanup cron job started"
fi

echo "✅ uat deployment completed!"
EOSSH