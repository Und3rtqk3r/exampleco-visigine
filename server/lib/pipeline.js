import { fetchPage } from './fetcher.js'
import { parseHtml } from './parser.js'
import { computeScore } from './scoring.js'
import { generateSummary } from './summary.js'
import { runAllChecks } from '../checks/index.js'
import { generateAutofix } from './autofix/index.js'

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 }
const MAX_ISSUES = 8
const MAX_URL_LENGTH = 2048

// Map internal fetch error codes → { httpStatus, germanMessage }.
export const FETCH_ERROR_MAP = {
  PRIVATE_HOST_BLOCKED: { http: 400, msg: 'Diese Adresse kann nicht analysiert werden.' },
  ENOTFOUND:            { http: 502, msg: 'Die Website ist nicht erreichbar. Bitte URL prüfen.' },
  TIMEOUT:              { http: 504, msg: 'Die Analyse hat zu lange gedauert. Bitte später erneut versuchen.' },
  SSL_INVALID:          { http: 502, msg: 'SSL-Zertifikat der Website ist ungültig. Bitte den Hosting-Anbieter kontaktieren.' },
  NETWORK:              { http: 502, msg: 'Die Website ist nicht erreichbar. Bitte URL prüfen.' },
}

// HTML payload masquerading as text/plain (SPA fallback, custom 404) → treat as empty.
function looksLikeText(body) {
  if (!body) return false
  return !body.trimStart().startsWith('<')
}

export function validateUrl(rawInput) {
  if (typeof rawInput !== 'string' || rawInput.trim().length === 0) {
    return { error: { http: 400, code: 'EMPTY_URL', msg: 'Bitte eine URL eingeben.' } }
  }
  let raw = rawInput.trim()
  if (raw.length > MAX_URL_LENGTH) {
    return { error: { http: 400, code: 'URL_TOO_LONG', msg: 'URL ist zu lang.' } }
  }
  if (/^http:\/\//i.test(raw)) {
    return { error: { http: 400, code: 'HTTP_NOT_SUPPORTED', msg: 'HTTP wird nicht unterstützt. Bitte eine HTTPS-URL verwenden.' } }
  }
  raw = raw.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  const targetUrl = 'https://' + raw
  try {
    const u = new URL(targetUrl)
    return { targetUrl, host: u.hostname, originalOrigin: u.origin }
  } catch {
    return { error: { http: 400, code: 'INVALID_URL', msg: 'Ungültige URL. Bitte eine gültige Domain eingeben.' } }
  }
}

// Runs the full analysis pipeline against an already-validated targetUrl.
// Returns either `{ error: { http, code, msg } }` for hard fetch failures,
// or `{ data: { score, summary, issues, autofix }, debugPayload, mainStatus }`.
export async function runAnalysisPipeline(targetUrl, { debugMode = false } = {}) {
  const main = await fetchPage(targetUrl)

  if (main.status === 0 && main.error && FETCH_ERROR_MAP[main.error]) {
    const mapping = FETCH_ERROR_MAP[main.error]
    return { error: { http: mapping.http, code: main.error, msg: mapping.msg } }
  }

  const finalUrl = main.finalUrl || targetUrl
  let finalOrigin
  try {
    finalOrigin = new URL(finalUrl).origin
  } catch {
    finalOrigin = new URL(targetUrl).origin
  }

  const [robotsRes, llmsRes] = await Promise.all([
    fetchPage(`${finalOrigin}/robots.txt`),
    fetchPage(`${finalOrigin}/llms.txt`),
  ])

  const robotsTxt = robotsRes.status === 200 && looksLikeText(robotsRes.body) ? robotsRes.body : ''
  const llmsTxt = llmsRes.status === 200 && looksLikeText(llmsRes.body) ? llmsRes.body : ''
  const llmsStatusEffective = llmsTxt ? llmsRes.status : 0

  const { headHtml, jsonLdBlocks, jsonLdJoined } = parseHtml(main.body)

  const probeRecords = {}
  const recordingFetch = async (url, opts) => {
    const r = await fetchPage(url, opts)
    const key = opts?.userAgent
      ? (/Claude/i.test(opts.userAgent) ? 'uaClaudeBot'
        : /GPT/i.test(opts.userAgent) ? 'uaGptBot'
        : 'uaCustom')
      : (url.endsWith('/sitemap.xml') ? 'sitemap'
        : url.endsWith('/llms-full.txt') ? 'llmsFull'
        : 'extra')
    probeRecords[key] = { status: r.status, finalUrl: r.finalUrl, bodyLength: (r.body || '').length, ms: r.ms }
    return r
  }

  const context = {
    baseUrl: finalOrigin,
    targetUrl: finalUrl,
    html: main.body || '',
    headHtml,
    jsonLdBlocks,
    jsonLdJoined,
    robotsTxt,
    llmsTxt,
    llmsStatus: llmsStatusEffective,
    mainStatus: main.status,
    responseHeaders: main.headers || {},
    fetchPage: recordingFetch,
  }

  const results = await runAllChecks(context)
  const score = computeScore(results)

  const failed = results
    .filter((r) => r.passed === false)
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))

  const summary = failed.length === 0
    ? 'Alle GEO- und SEO-Signale sind vorhanden. Die Website ist optimal für KI-Suche konfiguriert.'
    : await generateSummary(failed.map((r) => r.title), finalUrl)

  const issues = failed.slice(0, MAX_ISSUES).map((r) => ({
    title: r.title,
    severity: r.severity,
  }))

  // Generate autofix from the same context the checks ran on.
  const autofixFull = generateAutofix(context)
  const { _siteData, ...autofixPublic } = autofixFull

  const data = { score, summary, issues, autofix: autofixPublic }

  // Surface failed-check IDs for activity logging only. Never returned to client.
  const failedCheckIds = failed.map((r) => r.id)

  const debugPayload = debugMode
    ? {
        requestedUrl: targetUrl,
        finalUrl,
        finalOrigin,
        fetches: {
          main: { status: main.status, finalUrl: main.finalUrl, bodyLength: (main.body || '').length, ms: main.ms, error: main.error },
          robots: { status: robotsRes.status, finalUrl: robotsRes.finalUrl, bodyLength: (robotsRes.body || '').length, ms: robotsRes.ms, error: robotsRes.error },
          llms: { status: llmsRes.status, finalUrl: llmsRes.finalUrl, bodyLength: (llmsRes.body || '').length, ms: llmsRes.ms, error: llmsRes.error },
          ...probeRecords,
        },
        checks: results.map((r) => ({ id: r.id, passed: r.passed, severity: r.severity })),
        siteData: _siteData,
      }
    : null

  return { data, debugPayload, mainStatus: main.status, _siteData, failedCheckIds }
}

// Strips actionable content from the full pipeline output before sending to
// unauthenticated visitors. The full data stays in the cache so admin and
// future paid flows can still read it.
function lineCount(s) {
  return (s || '').trim().split('\n').filter(Boolean).length
}

function publicLabelFor(file) {
  switch (file?.mode) {
    case 'new':     return 'neue Datei'
    case 'replace': return 'bestehende Datei ersetzen'
    case 'diff':    return `${lineCount(file.content)} Zeilen ergänzen`
    case 'enhance': return 'erweitern'
    default:        return ''
  }
}

export function toPublicResponse(data) {
  const issues = data?.issues || []
  const issueCounts = issues.reduce(
    (acc, i) => { acc[i.severity] = (acc[i.severity] || 0) + 1; return acc },
    { high: 0, medium: 0, low: 0 }
  )

  const body = {
    score: data.score,
    summary: data.summary,
    issueCounts,
  }

  // Score-10 sites get nothing to fix — omit the teaser entirely.
  const af = data.autofix
  if (af && issues.length > 0) {
    body.autofix = {
      llmsTxt:   { mode: af.llmsTxt.mode,   label: publicLabelFor(af.llmsTxt) },
      robotsTxt: { mode: af.robotsTxt.mode, label: publicLabelFor(af.robotsTxt) },
      jsonLd:    { mode: af.jsonLd.mode,    label: publicLabelFor(af.jsonLd) },
    }
  }
  return body
}
