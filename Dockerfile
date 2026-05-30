# syntax=docker/dockerfile:1.7

# ─── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Cài full deps (gồm dev) để chạy tsc.
COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Stage 2: production deps ─────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# ─── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Chỉ chạy với user không phải root.
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nodejs

COPY --from=deps  --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist         ./dist
COPY --chown=nodejs:nodejs package.json                   ./
COPY --chown=nodejs:nodejs migrations                     ./migrations
COPY --chown=nodejs:nodejs docker/backend-entrypoint.sh   /usr/local/bin/backend-entrypoint.sh
# Đổi CRLF (Windows) → LF + chmod để script chạy được trong Alpine.
RUN sed -i 's/\r$//' /usr/local/bin/backend-entrypoint.sh \
 && chmod +x /usr/local/bin/backend-entrypoint.sh

USER nodejs

EXPOSE 3000

# Healthcheck dùng /api/health (route được app expose).
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/backend-entrypoint.sh"]
CMD ["node", "dist/server.js"]
