# ExampleVisi

GEO/SEO-Auditor für AI-Suchen (ChatGPT, Claude, Perplexity, Gemini …).
Frontend: React 19 + Vite. Backend: Node 20 + Express.

## Dev-Setup

```bash
# Frontend deps
npm install

# Backend deps
npm install --prefix server

# Backend secrets
cp server/.env.example server/.env
# → MISTRAL_KEY=...  in server/.env eintragen
```

## Start

```bash
npm run dev
```

Startet client (Vite, Port 5173) und server (Express, Port 3001) parallel.
Vite proxied `/api/*` automatisch an den Backend-Port.

Health-Check: `curl http://localhost:3001/health` → `{"ok":true}`.

## Secrets

Der Mistral-API-Key liegt **nur** in `server/.env` als `MISTRAL_KEY`.
Es gibt keine `VITE_*`-Keys im Frontend — der Browser sieht den Schlüssel nie.

## Stack

- React 19, Vite 8 (kein TypeScript)
- Express 4, Node 20 native `fetch`
- Mistral `mistral-large-latest` (nur serverseitig)

## Production Deployment

### Backend (`server/`)

Required env vars:

- `MISTRAL_KEY` — Mistral API key (server-only, never exposed to the client).
- `PORT` — port to bind (default `3001`).
- `ALLOWED_ORIGINS` — comma-separated CORS whitelist
  (e.g. `https://www.examplevisi.example,https://examplevisi.example`).
- `NODE_ENV=production` — disables debug mode unconditionally.
- `ALLOW_PRIVATE_HOSTS=0` — keep at `0` in production (SSRF protection).

Run: `npm start` inside `server/`. The Express listener binds `0.0.0.0:$PORT`
so containers and reverse proxies can reach it.

Health check: `GET /health` → `{ "ok": true }`.

### Frontend

Static build: `npm run build` in the repo root → `dist/`. Serve via any
static host. The frontend calls `/api/analyze` — your hosting layer must
proxy `/api/*` to the backend (nginx / Caddy / Cloudflare Workers / etc.).

### Operations

- Rate limit: 20 requests / 60 s / IP on `/api/analyze`.
- In-memory cache: 1 h TTL, 1000 entries (LRU). `X-Cache: HIT|MISS` header.
- Every request gets an `X-Request-Id` and a structured log line.
- `?debug=1` is ignored when `NODE_ENV=production`.
