# ExampleVisi — Docker

Single-stack compose: nginx serves the built React app on port `8080` and
reverse-proxies `/api/*` to the backend container over the internal docker
network. The browser sees one origin — no CORS dance.

## Prerequisites

- Docker Desktop / Docker Engine
- `docker compose` v2 plugin (bundled with current Docker Desktop)

## First run

```bash
# 1. Make sure server/.env exists with MISTRAL_KEY and ADMIN_TOKEN.
#    If you only used the dev flow so far, server/.env is already populated.
cat server/.env

# 2. Build + start (from repo root)
docker compose -f docker/docker-compose.yml up -d --build

# 3. Open
#    UI:     http://localhost:8080
#    Admin:  http://localhost:8080/admin
#    Health: http://localhost:8080/health
```

## Daily ops

```bash
# Logs (follow)
docker compose -f docker/docker-compose.yml logs -f

# Restart after backend code change
docker compose -f docker/docker-compose.yml up -d --build backend

# Restart after frontend code change
docker compose -f docker/docker-compose.yml up -d --build frontend

# Stop everything
docker compose -f docker/docker-compose.yml down

# Stop + remove built images
docker compose -f docker/docker-compose.yml down --rmi local
```

## What runs where

| Container          | Image        | Port    | Role                              |
|--------------------|--------------|---------|-----------------------------------|
| `examplevisi-frontend`| nginx:alpine | `8080`  | Serves `dist/` + proxies `/api/*` |
| `examplevisi-backend` | node:20      | `3001`* | Express API, Mistral, checks      |

*Backend port is **internal-only**. It is `expose:`d, not `ports:`d — nothing
on your host can hit `:3001` directly. The frontend reaches it via the
docker network DNS name `backend:3001`.

## Configuration

- **Secrets** (`MISTRAL_KEY`, `ADMIN_TOKEN`): loaded from `../server/.env`.
- **Deployment vars**: hard-set in `docker-compose.yml`. To run on a
  different host port or domain:
  - Change `ports: "8080:80"` to whatever you want on the host side.
  - Update `ALLOWED_ORIGINS` to match the public URL the browser uses.

## Notes

- `NODE_ENV=production` → `?debug=1` is unconditionally stripped from
  responses. The admin dashboard still gets full debug data through
  `/api/admin/analyze` (gated by `ADMIN_TOKEN`).
- `ALLOW_PRIVATE_HOSTS=0` → SSRF guard is fully on. Don't flip this in prod.
- Nginx strips the browser `Origin` header before forwarding, so the
  backend's CORS allow-list only governs cross-origin browsers hitting
  `:3001` directly — which can only happen if you manually `-p 3001:3001`.
