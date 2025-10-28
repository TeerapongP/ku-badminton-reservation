#!/bin/bash
# Deploy script for UAT behind Nginx reverse proxy (robust)
set -euo pipefail

APP_IMAGE="thirapongp/ku-badminton-reservation:latest"
APP_NAME="ku-badminton-uat"
NGINX_NAME="ku-nginx"
APP_NET="ku-net"
APP_DIR="/home/remotepang1/ku-badminton-app"
ENV_FILE=".env-uat"
APP_PORT="3000"              # พอร์ตในคอนเทนเนอร์แอป
HOST_PORT="80"               # เปลี่ยนเป็น 8080 ถ้า 80 ชน
NGINX_CONF="nginx/default.conf"

echo "🚀 Starting UAT deployment..."

# 1) Build & push image
echo "📦 Building Docker image..."
docker buildx build --no-cache --platform linux/amd64 -t "${APP_IMAGE}" --push .

# 2) Copy env to server
echo "📋 Copying environment file..."
scp "${ENV_FILE}" "remotepang1@10.36.16.16:${APP_DIR}/"

# 3) Verify env
echo "🔍 Verifying environment file..."
ssh remotepang1@10.36.16.16 "cd '${APP_DIR}' && ls -la ${ENV_FILE} && head -5 ${ENV_FILE}"

# 4) Remote deploy
echo "🚢 Deploying on server..."
ssh remotepang1@10.36.16.16 bash -se << 'EOSSH'
set -euo pipefail

APP_IMAGE="thirapongp/ku-badminton-reservation:latest"
APP_NAME="ku-badminton-uat"
NGINX_NAME="ku-nginx"
APP_NET="ku-net"
APP_DIR="/home/remotepang1/ku-badminton-app"
ENV_FILE=".env-uat"
APP_PORT="3000"
HOST_PORT="80"                         # ถ้าพอร์ต 80 ถูกใช้อยู่ จะสลับไป 8080 อัตโนมัติด้านล่าง
NGINX_CONF="${APP_DIR}/nginx/default.conf"

cd "${APP_DIR}"

# --- Helper ---
port_in_use () { ss -tulpen | awk '{print $5}' | grep -qE ":(\$1)\$"; }

# Network
echo "🌐 Ensuring docker network: ${APP_NET}"
docker network create "${APP_NET}" 2>/dev/null || true

# Pull image ใหม่
echo "⬇️ Pulling new image..."
docker pull "${APP_IMAGE}"

# แอปรอบเก่า
echo "🛑 Removing old app container if exists..."
docker rm -f "${APP_NAME}" 2>/dev/null || true

# รันแอป (สำคัญ: HOST=0.0.0.0 เพื่อให้ Nginx ยิงถึง)
echo "▶️ Starting new app container..."
docker run -d --name "${APP_NAME}" \
  --env-file "${ENV_FILE}" \
  --network "${APP_NET}" \
  -e HOST=0.0.0.0 \
  -e PORT="${APP_PORT}" \
  --restart=unless-stopped \
  "${APP_IMAGE}"

# Debug env
echo "🔍 Checking environment variables inside app..."
docker exec "${APP_NAME}" /bin/sh -lc 'env | grep -E "DATABASE_URL|PORT|HOST" || true'

# รอให้แอปฟังพอร์ตภายในคอนเทนเนอร์
echo "⏳ Waiting app to be ready on ${APP_NAME}:${APP_PORT} ..."
for i in $(seq 1 30); do
  if docker exec "${APP_NAME}" /bin/sh -lc "nc -z 127.0.0.1 ${APP_PORT}" >/dev/null 2>&1; then
    echo "✅ App is listening on ${APP_PORT}"
    break
  fi
  sleep 1
  [ "$i" -eq 30 ] && { echo "❌ App did not start on time"; docker logs "${APP_NAME}" --tail 100; exit 1; }
done

# เลือกพอร์ต host สำหรับ Nginx (ถ้า 80 ชน ให้ใช้ 8080)
if ss -tulpen | grep -qE ':80\s'; then
  echo "⚠️  Port 80 in use -> will use 8080 instead"
  HOST_PORT="8080"
else
  HOST_PORT="80"
fi

# ตรวจ Nginx config มีค่า resolver + zone (กัน error runtime resolve)
if ! grep -q 'resolver 127\.0\.0\.11' "${NGINX_CONF}" || ! grep -q 'upstream .*zone' "${NGINX_CONF}"; then
cat > "${NGINX_CONF}" <<'NGINX'
resolver 127.0.0.11 valid=30s ipv6=off;

map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

upstream ku_badminton_app {
    zone ku_badminton_app 64k;
    server ku-badminton-uat:3000 resolve;
    keepalive 32;
}

server {
    listen 80;
    server_name _;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss image/svg+xml;
    gzip_min_length 1024;

    proxy_read_timeout 120s;
    proxy_send_timeout 120s;
    send_timeout 120s;

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

    location = /healthz {
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}
NGINX
echo "🛠️  Wrote safe nginx config (with resolver & zone)."
fi

# ตรวจ config Nginx ล่วงหน้า
echo "🧪 Pre-testing nginx config..."
docker run --rm \
  -v "${NGINX_CONF}:/etc/nginx/conf.d/default.conf:ro" \
  nginx:alpine nginx -t

# รัน/รีสตาร์ท Nginx
echo "🌐 Ensuring nginx reverse proxy is running on :${HOST_PORT} ..."
docker rm -f "${NGINX_NAME}" 2>/dev/null || true
docker run -d --name "${NGINX_NAME}" \
  --network "${APP_NET}" \
  -p ${HOST_PORT}:80 \
  -v "${NGINX_CONF}:/etc/nginx/conf.d/default.conf:ro" \
  --restart=unless-stopped \
  nginx:alpine

# Smoke test ภายในเครื่อง
echo "🩺 Health check through nginx..."
for i in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:${HOST_PORT}/healthz" >/dev/null 2>&1; then
    echo "✅ Nginx health OK"
    break
  fi
  sleep 1
  [ "$i" -eq 20 ] && { echo "❌ Nginx not healthy"; docker logs "${NGINX_NAME}" --tail 100; exit 1; }
done

echo "📊 Containers:"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | sed 's/^/  /'

echo "📝 App logs (last 40 lines):"
docker logs "${APP_NAME}" --tail 40 || true

echo "ℹ️  If firewall enabled, allow: sudo ufw allow ${HOST_PORT}/tcp"
EOSSH

echo "✅ UAT deployment completed!"
echo "🌐 App should be available at:  http://10.36.16.16 (or :8080 if 80 was in use)"
