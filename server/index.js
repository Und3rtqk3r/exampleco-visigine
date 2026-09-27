import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import analyzeRoute from './routes/analyze.js'
import adminRoute from './routes/admin.js'
import adminMonitoringRoute from './routes/admin-monitoring.js'
import demoMonitoringRoute from './routes/demo-monitoring.js'
// Importing the db module here ensures SQLite is opened and the schema is
// applied at startup, before any route handler can hit it.
import './db/index.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001

// Comma-separated whitelist; missing/empty means deny all browser origins.
// Legacy single-origin var is still honored for backwards compat.
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  process.env.ALLOWED_ORIGIN ||
  ''
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.set('trust proxy', 1)

app.use(
  cors({
    origin(origin, cb) {
      // No Origin header: same-origin, curl, server-to-server, health probes.
      if (!origin) return cb(null, true)
      if (allowedOrigins.includes(origin)) return cb(null, true)
      cb(new Error('CORS_NOT_ALLOWED'))
    },
    methods: ['POST', 'GET'],
    allowedHeaders: ['Content-Type', 'X-Admin-Token'],
    exposedHeaders: ['X-Cache', 'X-Request-Id'],
  })
)

app.use(express.json({ limit: '64kb' }))

const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte einen Moment warten.' },
})

// Public demo endpoint: 5 / hour / IP. Reserved for iteration 4b landing-page
// teaser; backend works today, no UI exposes it yet.
const demoMonitoringLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte später erneut versuchen.' },
})

// Admin middleware: 401 unconditionally when ADMIN_TOKEN is empty/missing.
// This is the kill-switch for production deployments where admin is disabled.
function requireAdmin(req, res, next) {
  const token = req.get('X-Admin-Token')
  const expected = process.env.ADMIN_TOKEN
  if (!expected || !token || token !== expected) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/api/analyze', analyzeLimiter, analyzeRoute)
// Public demo for iteration 4b. Backend wired now, no UI yet.
app.use('/api/demo/monitoring', demoMonitoringLimiter, demoMonitoringRoute)
// Admin: token gate first, then the routers. No rate limiter is applied here
// because admin routes are gated by ADMIN_TOKEN and intended for the owner.
// The public /api/autofix/zip endpoint is intentionally NOT mounted — the
// public site only shows a teaser; downloadable files are paid-product only.
app.use('/api/admin/monitoring', requireAdmin, adminMonitoringRoute)
app.use('/api/admin', requireAdmin, adminRoute)

// Generic error handler — never leak stack traces.
app.use((err, _req, res, _next) => {
  if (err?.message === 'CORS_NOT_ALLOWED') {
    if (res.headersSent) return
    return res.status(403).json({ error: 'Zugriff verweigert.' })
  }
  console.error('[express-error]', err?.message || err)
  if (res.headersSent) return
  res.status(500).json({ error: 'Ein interner Fehler ist aufgetreten.' })
})

// Bind 0.0.0.0 so containers / reverse proxies can reach the listener.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[examplevisi-server] listening on 0.0.0.0:${PORT}`)
})

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err?.message || err)
})
