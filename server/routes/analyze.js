import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { cacheGet, cacheSet } from '../lib/cache.js'
import { runAnalysisPipeline, validateUrl, toPublicResponse } from '../lib/pipeline.js'
import { recordAnalysis } from '../lib/activity.js'

function normalizeForCache(url) {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.hostname.toLowerCase()}${u.pathname || '/'}`
  } catch {
    return url.toLowerCase()
  }
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function logLine({ requestId, host, score, issues, cache, ms, status, code }) {
  const parts = [
    `[analyze]`,
    `id=${requestId}`,
    `ts=${nowIso()}`,
    `host=${host || '-'}`,
  ]
  if (score !== undefined) parts.push(`score=${score}`)
  if (issues !== undefined) parts.push(`issues=${issues}`)
  parts.push(`cache=${cache}`)
  parts.push(`ms=${ms}`)
  parts.push(`status=${status}`)
  if (code) parts.push(`code=${code}`)
  console.log(parts.join(' '))
}

const router = Router()

router.post('/', async (req, res) => {
  const started = Date.now()
  const requestId = randomUUID().slice(0, 8)
  res.setHeader('X-Request-Id', requestId)

  const debugRequested = req.query?.debug === '1'
  const isProd = process.env.NODE_ENV === 'production'
  const debugMode = debugRequested && !isProd

  const v = validateUrl(req?.body?.url)
  if (v.error) {
    const ms = Date.now() - started
    logLine({ requestId, cache: 'miss', ms, status: 'err', code: v.error.code })
    recordAnalysis({ requestId, host: null, ms, status: 'err', code: v.error.code })
    return res.status(v.error.http).json({ error: v.error.msg })
  }
  const { targetUrl, host: hostForLog } = v
  const cacheKey = normalizeForCache(targetUrl)

  if (!debugMode) {
    const cached = cacheGet(cacheKey)
    if (cached) {
      const ms = Date.now() - started
      res.setHeader('X-Cache', 'HIT')
      logLine({
        requestId, host: hostForLog,
        score: cached.data.score, issues: cached.data.issues.length,
        cache: 'hit', ms, status: 'ok',
      })
      recordAnalysis({
        requestId, host: hostForLog,
        score: cached.data.score, issuesCount: cached.data.issues.length,
        failedCheckIds: cached.failedCheckIds || [],
        cacheHit: true, ms, status: 'ok',
      })
      return res.json(toPublicResponse(cached.data))
    }
  }
  res.setHeader('X-Cache', 'MISS')

  try {
    const out = await runAnalysisPipeline(targetUrl, { debugMode })
    if (out.error) {
      const ms = Date.now() - started
      logLine({ requestId, host: hostForLog, cache: 'miss', ms, status: 'err', code: out.error.code })
      recordAnalysis({ requestId, host: hostForLog, cacheHit: false, ms, status: 'err', code: out.error.code })
      return res.status(out.error.http).json({ error: out.error.msg })
    }

    const response = toPublicResponse(out.data)
    if (debugMode && out.debugPayload) response._debug = out.debugPayload
    // Belt-and-suspenders: in production, never serve _debug.
    if (isProd && response._debug) delete response._debug

    if (!debugMode && out.mainStatus >= 200 && out.mainStatus < 400) {
      cacheSet(cacheKey, { data: out.data, failedCheckIds: out.failedCheckIds })
    }

    const ms = Date.now() - started
    logLine({
      requestId, host: hostForLog,
      score: out.data.score, issues: out.data.issues.length,
      cache: 'miss', ms, status: 'ok',
    })
    recordAnalysis({
      requestId, host: hostForLog,
      score: out.data.score, issuesCount: out.data.issues.length,
      failedCheckIds: out.failedCheckIds,
      cacheHit: false, ms, status: 'ok',
    })
    return res.json(response)
  } catch (err) {
    console.error('[analyze-error]', requestId, err?.message || err)
    const ms = Date.now() - started
    logLine({ requestId, host: hostForLog, cache: 'miss', ms, status: 'err', code: 'INTERNAL' })
    recordAnalysis({ requestId, host: hostForLog, cacheHit: false, ms, status: 'err', code: 'INTERNAL' })
    return res.status(500).json({ error: 'Ein interner Fehler ist aufgetreten.' })
  }
})

export default router
