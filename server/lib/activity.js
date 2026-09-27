// Rolling buffer of recent analyses, resets on restart.
// Metadata-only by design — no PII, no full response bodies, no extracted siteData.
const MAX_ENTRIES = 50
const log = []

export function recordAnalysis(entry) {
  log.unshift({
    ts: new Date().toISOString(),
    requestId: entry.requestId,
    host: entry.host || null,
    score: entry.score ?? null,
    issuesCount: entry.issuesCount ?? null,
    failedCheckIds: entry.failedCheckIds || [],
    cacheHit: Boolean(entry.cacheHit),
    ms: entry.ms ?? 0,
    status: entry.status === 'ok' ? 'ok' : 'err',
    code: entry.code || null,
    admin: Boolean(entry.admin),
  })
  if (log.length > MAX_ENTRIES) log.pop()
}

export function recentAnalyses() {
  return [...log]
}

export function computeStats() {
  const succeeded = log.filter((e) => e.status === 'ok' && typeof e.score === 'number')
  if (!succeeded.length) {
    return { total: log.length, succeeded: 0, avgScore: null, topFails: [], topHosts: [] }
  }
  const avgScore = succeeded.reduce((s, e) => s + e.score, 0) / succeeded.length

  const failCounts = {}
  for (const e of succeeded) {
    for (const id of e.failedCheckIds) failCounts[id] = (failCounts[id] || 0) + 1
  }
  const topFails = Object.entries(failCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ id, count }))

  const hostCounts = {}
  for (const e of log) {
    if (e.host) hostCounts[e.host] = (hostCounts[e.host] || 0) + 1
  }
  const topHosts = Object.entries(hostCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([host, count]) => ({ host, count }))

  return {
    total: log.length,
    succeeded: succeeded.length,
    avgScore: Number(avgScore.toFixed(1)),
    topFails,
    topHosts,
  }
}
