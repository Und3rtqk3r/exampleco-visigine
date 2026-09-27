# ExampleVisi backend — Node 20 Express API.
# Build context is the repo root (see docker-compose.yml).
#
# Two-stage build: stage 1 has python+make+g++ for compiling better-sqlite3's
# native bindings; stage 2 is a slim runtime that copies just the resolved
# node_modules so the final image stays small.

# ── stage 1: build native deps ────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Build toolchain for better-sqlite3 (and any future native module).
RUN apk add --no-cache python3 make g++ libc6-compat

COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# ── stage 2: runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

# better-sqlite3's compiled .node binary links against libstdc++ at runtime.
RUN apk add --no-cache libstdc++

COPY --from=deps /app/node_modules ./node_modules
COPY server/ .

EXPOSE 3001

# Light-weight healthcheck — busybox wget ships with alpine.
# Use 127.0.0.1 explicitly: alpine resolves `localhost` to ::1 by default
# and our Node listener only binds IPv4 (0.0.0.0).
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
  CMD wget --spider --quiet http://127.0.0.1:3001/health || exit 1

CMD ["node", "index.js"]
