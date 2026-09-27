import { Router } from 'express'
import * as repo from '../db/repo.js'
import { runMonitoring, RunError } from '../lib/monitoring/run.js'
import { generateQueries } from '../lib/monitoring/generate-queries.js'
import { runAnalysisPipeline, validateUrl } from '../lib/pipeline.js'
import { getProviderModes } from '../lib/providers/index.js'

const router = Router()

function serializeClient(c) {
  if (!c) return null
  let aliases = []
  try { aliases = JSON.parse(c.brand_aliases || '[]') } catch { /* keep [] */ }
  return { ...c, brand_aliases: aliases }
}

function mentionRate(mentions, runs) {
  if (!runs || runs <= 0) return null
  return Number((mentions / runs).toFixed(4))
}

// ─── clients ──────────────────────────────────────────────────────

router.get('/clients', (_req, res) => {
  const rows = repo.listClients().map((c) => ({
    id: c.id,
    hostname: c.hostname,
    name: c.name,
    status: c.status,
    queries_count: c.queries_count,
    last_run_at: c.last_run_at,
    mention_rate_30d: mentionRate(c.mentions_30d, c.runs_30d),
    runs_30d: c.runs_30d,
    mentions_30d: c.mentions_30d,
  }))
  res.json({ clients: rows, providerModes: getProviderModes() })
})

router.post('/clients', async (req, res) => {
  const body = req.body || {}
  if (!body.url) return res.status(400).json({ error: 'URL erforderlich.' })

  const v = validateUrl(body.url)
  if (v.error) return res.status(v.error.http).json({ error: v.error.msg })

  // If hostname already exists, return existing instead of duplicating.
  const existing = repo.getClientByHost(v.host)
  if (existing) return res.json(serializeClient(existing))

  // Pull siteData from the analyze pipeline if name/description not provided.
  let { hostname, name, description, language, brand_aliases } = body
  hostname = hostname || v.host

  if (!name || !description) {
    try {
      const out = await runAnalysisPipeline(v.targetUrl, { debugMode: false })
      if (!out.error) {
        const sd = out._siteData || {}
        name = name || sd.name || v.host
        description = description || sd.description || null
        language = language || sd.language || 'de'
      }
    } catch (e) {
      console.warn('[admin-monitoring] prefill failed:', e?.message || e)
    }
  }

  const aliasesJson = JSON.stringify(Array.isArray(brand_aliases) ? brand_aliases : [])

  try {
    const created = repo.insertClient({
      hostname,
      url: v.targetUrl,
      name: name || v.host,
      description,
      brand_aliases: aliasesJson,
      language: language || 'de',
    })
    return res.status(201).json(serializeClient(created))
  } catch (err) {
    if (String(err?.message || '').includes('UNIQUE')) {
      return res.status(409).json({ error: 'Marke existiert bereits.' })
    }
    console.error('[admin-monitoring] insert error', err)
    return res.status(500).json({ error: 'Ein interner Fehler ist aufgetreten.' })
  }
})

router.get('/clients/:id', (req, res) => {
  const c = repo.getClient(Number(req.params.id))
  if (!c) return res.status(404).json({ error: 'Marke nicht gefunden.' })
  res.json(serializeClient(c))
})

router.patch('/clients/:id', (req, res) => {
  const id = Number(req.params.id)
  const existing = repo.getClient(id)
  if (!existing) return res.status(404).json({ error: 'Marke nicht gefunden.' })
  const patch = req.body || {}
  if (patch.status && !['active', 'paused', 'archived'].includes(patch.status)) {
    return res.status(400).json({ error: 'Ungültiger Status.' })
  }
  if (patch.brand_aliases !== undefined && Array.isArray(patch.brand_aliases)) {
    patch.brand_aliases = JSON.stringify(patch.brand_aliases)
  }
  const updated = repo.updateClient(id, patch)
  res.json(serializeClient(updated))
})

router.delete('/clients/:id', (req, res) => {
  const ok = repo.deleteClient(Number(req.params.id))
  if (!ok) return res.status(404).json({ error: 'Marke nicht gefunden.' })
  res.json({ deleted: true })
})

// ─── queries ──────────────────────────────────────────────────────

router.post('/clients/:id/generate-queries', async (req, res) => {
  const id = Number(req.params.id)
  const c = repo.getClient(id)
  if (!c) return res.status(404).json({ error: 'Marke nicht gefunden.' })

  const previousCount = repo.listAllQueries(id).length
  const result = await generateQueries({
    name: c.name,
    description: c.description,
    url: c.url,
    hostname: c.hostname,
  })

  if (!result.queries || result.queries.length === 0) {
    return res.status(502).json({ error: 'Query-Generierung fehlgeschlagen. Bitte später erneut versuchen.' })
  }

  repo.replaceQueries(id, result.queries)
  return res.json({
    generated: result.queries.length,
    replaced: previousCount,
    warning: result.warning || null,
  })
})

router.get('/clients/:id/queries', (req, res) => {
  const id = Number(req.params.id)
  if (!repo.getClient(id)) return res.status(404).json({ error: 'Marke nicht gefunden.' })
  res.json({ queries: repo.listAllQueries(id) })
})

router.post('/clients/:id/queries', (req, res) => {
  const id = Number(req.params.id)
  if (!repo.getClient(id)) return res.status(404).json({ error: 'Marke nicht gefunden.' })
  const text = String(req.body?.text || '').trim()
  if (text.length < 5) return res.status(400).json({ error: 'Query zu kurz.' })
  const q = repo.insertQuery(id, text)
  res.status(201).json(q)
})

router.patch('/queries/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!repo.getQuery(id)) return res.status(404).json({ error: 'Query nicht gefunden.' })
  const patch = req.body || {}
  if (patch.text !== undefined) patch.text = String(patch.text).trim()
  if (patch.text !== undefined && patch.text.length < 5) {
    return res.status(400).json({ error: 'Query zu kurz.' })
  }
  const q = repo.updateQuery(id, patch)
  res.json(q)
})

router.delete('/queries/:id', (req, res) => {
  const ok = repo.deleteQuery(Number(req.params.id))
  if (!ok) return res.status(404).json({ error: 'Query nicht gefunden.' })
  res.json({ deleted: true })
})

// ─── runs ─────────────────────────────────────────────────────────

router.post('/clients/:id/run', async (req, res) => {
  const id = Number(req.params.id)
  try {
    const summary = await runMonitoring(id)
    res.json(summary)
  } catch (err) {
    if (err instanceof RunError) {
      const status = err.code === 'CLIENT_NOT_FOUND' ? 404 : 400
      const message = err.code === 'CLIENT_NOT_FOUND' ? 'Marke nicht gefunden.'
        : err.code === 'NO_ACTIVE_QUERIES' ? 'Keine aktiven Queries — bitte zuerst generieren oder anlegen.'
        : err.code === 'CLIENT_NOT_ACTIVE' ? 'Marke ist pausiert oder archiviert.'
        : err.code
      return res.status(status).json({ error: message, code: err.code })
    }
    console.error('[admin-monitoring] run error', err)
    return res.status(500).json({ error: 'Ein interner Fehler ist aufgetreten.' })
  }
})

router.get('/clients/:id/runs', (req, res) => {
  const id = Number(req.params.id)
  if (!repo.getClient(id)) return res.status(404).json({ error: 'Marke nicht gefunden.' })
  const page = Math.max(1, Number(req.query.page || 1))
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)))
  const offset = (page - 1) * limit
  res.json({
    page,
    limit,
    total: repo.countRuns(id),
    runs: repo.recentRuns(id, limit, offset),
  })
})

router.get('/clients/:id/stats', (req, res) => {
  const id = Number(req.params.id)
  if (!repo.getClient(id)) return res.status(404).json({ error: 'Marke nicht gefunden.' })
  const byProvider = repo.statsByProvider(id)
  const totals = repo.totalsLast30d(id)
  res.json({
    byProvider: byProvider.map((r) => ({
      provider: r.provider,
      total: r.total,
      mentions: r.mentions,
      cost: Number((r.cost || 0).toFixed(6)),
      mention_rate: mentionRate(r.mentions, r.total),
      last_run: r.last_run,
    })),
    totalRuns30d: totals?.total || 0,
    totalMentions30d: totals?.mentions || 0,
    mentionRate30d: mentionRate(totals?.mentions, totals?.total),
    totalCost30d: Number(((totals?.cost) || 0).toFixed(6)),
  })
})

export default router
