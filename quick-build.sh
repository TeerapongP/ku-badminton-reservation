#!/bin/bash
# quick-build.sh

set -euo pipefail

TAG=${1:-latest}
IMAGE_NAME="ku-badminton-reservation"
DOCKER_HUB_REPO="thirapongp/ku-badminton-reservation"

echo "🔨 Quick Build Script - Mac/Linux"
echo "================================="
echo "Building: $DOCKER_HUB_REPO:$TAG"
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker first."
  exit 1
fi

# Ensure buildx exists & use it
if ! docker buildx inspect multiarch >/dev/null 2>&1; then
  docker buildx create --name multiarch --use >/dev/null
else
  docker buildx use multiarch >/dev/null
fi

echo "🧹 Cleaning up dangling images..."
docker image prune -f >/dev/null || true

echo "📦 Building multi-arch image (linux/amd64, linux/arm64)..."
# หมายเหตุ: --load จะโหลดได้ทีละสถาปัตย์เท่านั้น
# ถ้าต้องการรัน local บน Mac ให้เลือกเฉพาะ arm64 พร้อม --load
# ถ้าจะเอา multi-arch จริง ควร --push ไป registry แล้วดึงที่ server
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t "$DOCKER_HUB_REPO:$TAG" \
  -t "$IMAGE_NAME:$TAG" \
  --provenance=false \
  --sbom=false \
  . \
  --push

echo "✅ Build & Push successful!"
echo "🏷️ Image: $DOCKER_HUB_REPO:$TAG"
echo
echo "🔁 To run on server (amd64):"
echo "  docker pull $DOCKER_HUB_REPO:$TAG && docker run --rm $DOCKER_HUB_REPO:$TAG"
