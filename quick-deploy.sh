#!/bin/bash
# Quick Deployment Script for Mac/Linux (no build/push)
# Usage: ./quick-deploy.sh [tag]

set -euo pipefail

TAG=${1:-latest}

echo "🚀 Quick Deployment Script - Mac/Linux (no build/push)"
echo "======================================================"
echo "Deploying: thirapongp/ku-badminton-reservation:$TAG"
echo ""

# ---- Config ----
DOCKER_USERNAME="thirapongp"
IMAGE_NAME="ku-badminton-reservation"
SERVER_USER="remotepang1"
SERVER_IP="10.36.16.16"
DEPLOY_PATH="/home/remotepang1/ku-badminton-app"
REMOTE_IMAGE="${DOCKER_USERNAME}/${IMAGE_NAME}:${TAG}"
# ----------------

# 0) SSH connectivity check
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 ${SERVER_USER}@${SERVER_IP} echo "SSH OK" >/dev/null 2>&1; then
  echo "❌ Cannot connect to server. Check SSH key / network / VPN."
  echo "🔧 Try: ./check-ssh.sh  หรือ  ./setup-ssh.sh"
  exit 1
fi

# 1) (Optional) local cleanup of junk files — keep if you like; harmless
echo "🧹 Cleaning up local junk files..."
rm -f docker-compose.yml docker-compose.simple.yml docker-compose.override.yml \
      .env.docker .env.prod.example deploy-manual.md \
      copy-files.bat connect-server.sh server-commands.sh \
      check-database.sh setup-server.sh deploy-with-env.sh \
      deploy-to-server.sh deploy-to-server.bat || true

# 2) DEPLOY on server (no build/push locally)
echo "🚀 Deploying on server..."
echo "  Server: ${SERVER_USER}@${SERVER_IP}"
echo "  Path:   ${DEPLOY_PATH}"
echo "  Image:  ${REMOTE_IMAGE}"
echo ""

ssh ${SERVER_USER}@${SERVER_IP} << EOF
  set -euo pipefail
  cd ${DEPLOY_PATH}

  echo "📥 Pulling image: ${REMOTE_IMAGE}"
  docker pull ${REMOTE_IMAGE}

  echo "🛑 Stopping current containers..."
  docker-compose -f docker-compose.prod.yml down

  echo "🧽 Removing exited containers (if any)..."
  docker container prune -f >/dev/null || true

  echo "🚀 Starting new containers..."
  # ให้ docker-compose ใช้ tag เดียวกัน (ตรวจในไฟล์ docker-compose.prod.yml ว่าตั้ง image: ${REMOTE_IMAGE} ไว้แล้ว)
  docker-compose -f docker-compose.prod.yml up -d

  echo "⏳ Waiting for containers to start..."
  sleep 10

  echo "📊 Container status:"
  docker-compose -f docker-compose.prod.yml ps
EOF

echo ""
echo "✅ Deployment successful!"
echo "🌐 App:  http://${SERVER_IP}:3000"
echo "🗄️ DB:   ${SERVER_IP}:3306"
echo "🧰 Logs: ssh ${SERVER_USER}@${SERVER_IP} 'cd ${DEPLOY_PATH} && docker-compose -f docker-compose.prod.yml logs -f'"
echo "🔁 Restart: ssh ${SERVER_USER}@${SERVER_IP} 'cd ${DEPLOY_PATH} && docker-compose -f docker-compose.prod.yml restart'"
