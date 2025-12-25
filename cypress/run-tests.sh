#!/bin/bash

# Script สำหรับรัน Cypress tests พร้อมกับ dev server

echo "🚀 Starting Next.js dev server..."
pnpm dev &
DEV_PID=$!

echo "⏳ Waiting for server to start..."
sleep 10

# ตรวจสอบว่า server รันอยู่
for i in {1..30}; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Server is running!"
    break
  fi
  echo "Waiting for server... ($i/30)"
  sleep 2
done

echo "🧪 Running Cypress tests..."
pnpm cypress:headless

# Kill dev server
echo "🛑 Stopping dev server..."
kill $DEV_PID 2>/dev/null || true

echo "✅ Tests completed!"

