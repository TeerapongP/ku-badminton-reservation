# =========================
# Base
# =========================
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@latest --activate

# =========================
# Dependencies
# =========================
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --no-frozen-lockfile

# =========================
# Builder
# =========================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY . .

# Generate Prisma Client
RUN pnpm prisma generate

# Create middleware NFT file workaround for Next.js 16 bug
RUN mkdir -p /app/.next/server || true

ENV NEXT_TELEMETRY_DISABLED=1
ENV TURBOPACK=0

ARG SKIP_ENV_VALIDATION=1
ENV SKIP_ENV_VALIDATION=$SKIP_ENV_VALIDATION

ENV DOCKER_BUILD=true

ARG NEXT_PUBLIC_ENCRYPTION_KEY
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_ENCRYPTION_KEY=$NEXT_PUBLIC_ENCRYPTION_KEY
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY

RUN pnpm run build:prod

# =========================
# Runner (Production)
# =========================
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy everything needed for non-standalone build
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js

# Prisma schema for migrate deploy at runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Create uploads directory with proper ownership BEFORE switching user
RUN mkdir -p /app/uploads/profiles /app/uploads/facilities /app/uploads/courts \
    /app/uploads/payments /app/uploads/payment-slips /app/uploads/banners /app/uploads/temp \
 && chown -R nextjs:nodejs /app/uploads

USER nextjs
EXPOSE 3000

CMD ["node_modules/.bin/next", "start"]