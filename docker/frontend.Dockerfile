# ExampleVisi frontend — multi-stage: build React with Vite, then serve with nginx.
# Build context is the repo root (see docker-compose.yml).

# ── stage 1: build ────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY index.html vite.config.js eslint.config.js ./
COPY src ./src
COPY public ./public

RUN npm run build

# ── stage 2: runtime ──────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
