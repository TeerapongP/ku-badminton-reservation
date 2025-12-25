# =========================
# Base
# =========================
FROM node:20-alpine AS base
WORKDIR /app
# Prisma บน musl ต้องมี openssl / libc6-compat
RUN apk add --no-cache libc6-compat openssl
# ใช้ pnpm ผ่าน corepack
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@latest --activate

# =========================
# Dependencies
# =========================
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# Copy prisma directory ก่อน install เพื่อให้ postinstall script (prisma generate) ทำงานได้
COPY prisma ./prisma
# ถ้ามีพวก native deps (sharp/bcrypt) แล้วเจอ compile error ให้เปิดบรรทัดนี้
# RUN apk add --no-cache python3 make g++

# ใช้ --no-frozen-lockfile เพื่อให้ยืดหยุ่นกับ config changes
# สำหรับ production ควรใช้ --frozen-lockfile และ commit lockfile ที่ถูกต้อง
RUN pnpm install --no-frozen-lockfile

# =========================
# Builder
# =========================
FROM base AS builder
WORKDIR /app

# ใช้ node_modules จาก deps
COPY --from=deps /app/node_modules ./node_modules

# คัดลอก prisma ก่อนเพื่อให้ cache bust เมื่อ schema เปลี่ยน
COPY prisma ./prisma

# แล้วค่อยคัดลอกโค้ดที่เหลือ
COPY . .

# Prisma imports have been fixed to use @prisma/client

# ✅ Generate Prisma Client บน Alpine (linux-musl)
RUN npx prisma -v && npx prisma generate

# ปิด telemetry และ build Next.js (ควรตั้ง next.config ให้ output=standalone)
ENV NEXT_TELEMETRY_DISABLED=1

# กันเคส validate ENV ตอน build (ถ้าคุณมีโค้ดตรวจ .env ใน phase build ให้ใช้ตัวนี้)
ARG SKIP_ENV_VALIDATION=1
ENV SKIP_ENV_VALIDATION=$SKIP_ENV_VALIDATION

# Enable standalone output for Docker builds
ENV DOCKER_BUILD=true

# ✅ Build-time environment variables for NEXT_PUBLIC_* (required for client-side code)
ARG NEXT_PUBLIC_ENCRYPTION_KEY
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_ENCRYPTION_KEY=$NEXT_PUBLIC_ENCRYPTION_KEY
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY

# ✅ สร้าง production build (ถ้าไม่มี script build:prod จะรัน build ปกติ)
RUN pnpm run build:prod || pnpm run build

# ✅ ตัด dev deps ออก เหลือเฉพาะ production (ยังคง @prisma/client + engines)
# ใช้ --ignore-scripts เพื่อไม่ให้รัน postinstall script (prisma generate) เพราะ generate แล้วในบรรทัด 44
RUN pnpm prune --prod --ignore-scripts

# =========================
# Runner (Production)
# =========================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# สร้าง user ปลอดภัย
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# ✅ คัดลอกไฟล์สำหรับ Next.js standalone
# หมายเหตุ: ต้องตั้งค่า output=standalone ใน next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma schema (เผื่อใช้ migrate deploy ใน runtime)
COPY --from=builder /app/prisma ./prisma

# ✅ ใช้ node_modules จาก builder (ที่ถูก prune แล้ว และ Prisma client ถูก generate สำหรับ Alpine แล้ว)
# node_modules จะรวม .prisma และ @prisma อยู่แล้ว
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000

# Next.js standalone สร้าง server.js มาให้แล้ว
CMD ["node", "server.js"]
