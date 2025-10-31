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
echo "$SUDO_PASS" | sudo -S mkdir -p "${APP_DIR}/nginx" "${UPLOADS_DIR}"/{profiles,facilities,courts,payments,temp,banners}
echo "$SUDO_PASS" | sudo -S chown -R remotepang1:remotepang1 "${UPLOADS_DIR}" || true
echo "$SUDO_PASS" | sudo -S chmod -R 775 "${UPLOADS_DIR}" || true
echo "$SUDO_PASS" | sudo -S find  "${UPLOADS_DIR}" -type d -exec chmod 2775 {} \; || true

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
  -e IMAGE_PATH="${UPLOADS_DIR}" \
  -v "${UPLOADS_DIR}:${UPLOADS_DIR}:rw" \
  --restart=unless-stopped \
  "${APP_IMAGE}"

echo "🔍 App environment snapshot:"
docker exec "${APP_NAME}" /bin/sh -lc 'env | grep -E "DATABASE_URL|PORT|HOST|IMAGE_PATH" || true'

echo "⏳ Waiting for app to start..."
sleep 5

# ---- Host port pick ----
if ss -tulpen | grep -qE ':80\s'; then
  echo "⚠️ Port 80 in use -> switching to 8080"
  HOST_PORT="8080"
else
  HOST_PORT="80"
fi

# ---- Write FULL nginx config (overwrite) ----
echo "🛠️ Writing nginx config (full overwrite)..."
cat > "${NGINX_CONF}" <<'NGINX_FULL'
resolver 127.0.0.11 valid=30s ipv6=off;

map $http_upgrade $connection_upgrade { default upgrade; '' close; }

upstream ku_badminton_app {
    zone ku_badminton_app 64k;
    server ku-badminton-uat:3000 resolve;
    keepalive 32;
}

server {
    listen 80;
    server_name _;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 1024;

    proxy_read_timeout 120s;
    proxy_send_timeout 120s;
    send_timeout 120s;

    # reverse proxy to app
    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        client_max_body_size 20m;
        proxy_pass http://ku_badminton_app;
    }

    # serve uploaded files directly
    location /uploads/ {
        alias /home/remotepang1/ku-badminton-app/uploads/;
        autoindex off;
        access_log off;
        expires 7d;
    }

    # health
    location = /healthz {
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}
NGINX_FULL

# ---- Test nginx config ----
echo "🧪 Pre-testing nginx config..."
docker run --rm \
  -v "${NGINX_CONF}:/etc/nginx/conf.d/default.conf:ro" \
  nginx:alpine nginx -t

# ---- Nginx container ----
echo "🌐 (Re)starting nginx on :${HOST_PORT} ..."
docker rm -f "${NGINX_NAME}" 2>/dev/null || true
docker run -d --name "${NGINX_NAME}" \
  --network "${APP_NET}" \
  -p ${HOST_PORT}:80 \
  -v "${NGINX_CONF}:/etc/nginx/conf.d/default.conf:ro" \
  -v "${UPLOADS_DIR}:/home/remotepang1/ku-badminton-app/uploads:ro" \
  --restart=unless-stopped \
  nginx:alpine

# ---- Health check ----
echo "🩺 Health check..."
for i in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:${HOST_PORT}/healthz" >/dev/null 2>&1; then
    echo "✅ Nginx health OK"; break; fi; sleep 1
  [ "$i" -eq 20 ] && { echo "❌ Nginx not healthy"; docker logs "${NGINX_NAME}" --tail 100; exit 1; }
done

echo "📊 Containers:"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | sed 's/^/  /'

echo "📝 App logs (last 60 lines):"
docker logs "${APP_NAME}" --tail 60 || true

echo "ℹ️ If firewall enabled, allow: sudo ufw allow ${HOST_PORT}/tcp"
EOSSH

echo "✅ UAT deployment completed!"
echo "🌐 App should be available at: http://10.36.16.16 (or :8080 if 80 is used)"