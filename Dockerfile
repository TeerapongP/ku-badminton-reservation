FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

# ---------- deps ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- builder ----------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# แยก copy prisma ก่อน เพื่อให้ cache bust เมื่อ schema เปลี่ยน
COPY prisma ./prisma
# แล้วค่อย copy โค้ดส่วนที่เหลือ
COPY . .

# ✅ generate Prisma client บน Alpine (musl)
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build:prod || pnpm run build

# ✅ prune ให้เหลือ production deps เท่านั้น (ยังคง @prisma/client + engines)
RUN pnpm prune --prod

# ---------- runner ----------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# แอป + static
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/prisma ./prisma

# ✅ คัดลอก node_modules ที่ “pruned แล้ว” จาก builder (มี @prisma/client + engines ตรง platform)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000
CMD ["pnpm","start"]
