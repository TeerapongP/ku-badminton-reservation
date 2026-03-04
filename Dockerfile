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

RUN pnpm prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true
ENV NODE_ENV=production

ARG SKIP_ENV_VALIDATION=1
ENV SKIP_ENV_VALIDATION=$SKIP_ENV_VALIDATION

ARG NEXT_PUBLIC_ENCRYPTION_KEY
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_ENCRYPTION_KEY=$NEXT_PUBLIC_ENCRYPTION_KEY
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY

# ✅ บังคับใช้ webpack แทน turbopack (Next.js 16 defaults to Turbopack)
RUN pnpm exec next build --webpack

# =========================
# Runner
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

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

RUN mkdir -p /app/uploads/profiles /app/uploads/facilities /app/uploads/courts \
    /app/uploads/payments /app/uploads/payment-slips /app/uploads/banners /app/uploads/temp \
    && chown -R nextjs:nodejs /app/uploads

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]