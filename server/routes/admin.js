import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import JSZip from 'jszip'
import { runAnalysisPipeline, validateUrl } from '../lib/pipeline.js'
import { buildReadme } from '../lib/autofix/index.js'
import { recordAnalysis, recentAnalyses, computeStats } from '../lib/activity.js'
import { cacheGet, cacheSet } from '../lib/cache.js'

function normalizeForCache(url) {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.hostname.toLowerCase()}${u.pathname || '/'}`
  } catch {
    return url.toLowerCase()
  }
}

function safeFilename(host) {
  if (!host) return 'examplevisi-autofix.zip'
  const cleaned = host.toLowerCase().replace(/[^a-z0-9.\-]/g, '').slice(0, 50)
  return cleaned ? `examplevisi-autofix-${cleaned}.zip` : 'examplevisi-autofix.zip'
}

const router = Router()

// Admin analyze: always debug mode. Cache bypass defaults to true but can be
// toggled off via { bypassCache: false } in the request body — useful for
// inspecting what a regular cached response would look like.
// Critical: `_debug` is NEVER stripped here, even in NODE_ENV=production.
router.post('/analyze', async (req, res) => {
  const started = Date.now()
  const requestId = randomUUID().slice(0, 8)
  res.setHeader('X-Request-Id', requestId)

  const v = validateUrl(req?.body?.url)
  if (v.error) {
    const ms = Date.now() - started
    recordAnalysis({ requestId, host: null, ms, status: 'err', code: v.error.code, admin: true })
    return res.status(v.error.http).json({ error: v.error.msg })
  }
  const { targetUrl, host } = v
  const bypassCache = req.body?.bypassCache !== false
  const cacheKey = normalizeForCache(targetUrl)

  // When the admin opts in to the cache, serve from it just like /api/analyze
  // would. We still attach a _debug shell so the UI can render its sections.
  if (!bypassCache) {
    const cached = cacheGet(cacheKey)
    if (cached) {
      const ms = Date.now() - started
      res.setHeader('X-Cache', 'HIT')
      recordAnalysis({
        requestId, host,
        score: cached.data.score, issuesCount: cached.data.issues.length,
        failedCheckIds: cached.failedCheckIds || [],
        cacheHit: true, ms, status: 'ok', admin: true,
      })
      const response = {
        ...cached.data,
        _debug: cached.debugPayload
          ? { ...cached.debugPayload, totalMs: ms, cacheHit: true }
          : { totalMs: ms, cacheHit: true, checks: [], fetches: {}, siteData: null, note: 'Aus Cache geladen — keine frischen Debug-Daten verfügbar.' },
      }
      return res.json(response)
    }
  }
  res.setHeader('X-Cache', 'MISS')

  try {
    const out = await runAnalysisPipeline(targetUrl, { debugMode: true })
    if (out.error) {
      const ms = Date.now() - started
      recordAnalysis({ requestId, host, cacheHit: false, ms, status: 'err', code: out.error.code, admin: true })
      return res.status(out.error.http).json({ error: out.error.msg })
    }

    const ms = Date.now() - started
    const response = { ...out.data, _debug: { ...out.debugPayload, totalMs: ms, cacheHit: false } }

    // Populate the cache so non-bypass admin requests (and the public route)
    // can later read it.
    if (!bypassCache && out.mainStatus >= 200 && out.mainStatus < 400) {
      cacheSet(cacheKey, { data: out.data, failedCheckIds: out.failedCheckIds, debugPayload: out.debugPayload })
    }

    recordAnalysis({
      requestId, host,
      score: out.data.score, issuesCount: out.data.issues.length,
      failedCheckIds: out.failedCheckIds,
      cacheHit: false, ms, status: 'ok', admin: true,
    })
    return res.json(response)
  } catch (err) {
    console.error('[admin-analyze-error]', requestId, err?.message || err)
    const ms = Date.now() - started
    recordAnalysis({ requestId, host, cacheHit: false, ms, status: 'err', code: 'INTERNAL', admin: true })
    return res.status(500).json({ error: 'Ein interner Fehler ist aufgetreten.' })
  }
})

router.get('/recent', (_req, res) => {
  res.json({ analyses: recentAnalyses() })
})

router.get('/stats', (_req, res) => {
  res.json(computeStats())
})

// Admin ZIP: always bypass cache, no rate limit.
router.post('/autofix/zip', async (req, res) => {
  const started = Date.now()
  const requestId = randomUUID().slice(0, 8)
  res.setHeader('X-Request-Id', requestId)

  const v = validateUrl(req?.body?.url)
  if (v.error) {
    const ms = Date.now() - started
    recordAnalysis({ requestId, host: null, ms, status: 'err', code: v.error.code, admin: true })
    return res.status(v.error.http).json({ error: v.error.msg })
  }
  const { targetUrl, host } = v

  try {
    const out = await runAnalysisPipeline(targetUrl, { debugMode: false })
    if (out.error) {
      const ms = Date.now() - started
      recordAnalysis({ requestId, host, cacheHit: false, ms, status: 'err', code: out.error.code, admin: true })
      return res.status(out.error.http).json({ error: out.error.msg })
    }

    const zip = new JSZip()
    zip.file('llms.txt', out.data.autofix.llmsTxt.content)
    zip.file('robots.txt', out.data.autofix.robotsTxt.content)
    zip.file('jsonld.html', out.data.autofix.jsonLd.content)
    zip.file('README.txt', buildReadme(out.data.autofix))
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

    const filename = safeFilename(host)
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', buffer.length)

    const ms = Date.now() - started
    recordAnalysis({
      requestId, host,
      score: out.data.score, issuesCount: out.data.issues.length,
      failedCheckIds: out.failedCheckIds,
      cacheHit: false, ms, status: 'ok', admin: true,
    })
    return res.send(buffer)
  } catch (err) {
    console.error('[admin-zip-error]', requestId, err?.message || err)
    const ms = Date.now() - started
    recordAnalysis({ requestId, host, cacheHit: false, ms, status: 'err', code: 'INTERNAL', admin: true })
    return res.status(500).json({ error: 'Ein interner Fehler ist aufgetreten.' })
  }
})

export default router
