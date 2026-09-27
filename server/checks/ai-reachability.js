// Group F — probe the target with AI bot user agents to detect WAF/CDN blocking.
const BLOCKED_STATUSES = new Set([403, 429, 451, 503, 0])

const PROBES = [
  {
    id: 'ai-reach.claudebot',
    title: 'ClaudeBot wird blockiert (Cloudflare oder Firewall)',
    userAgent: 'ClaudeBot/1.0 (+https://www.anthropic.com)',
  },
  {
    id: 'ai-reach.gptbot',
    title: 'GPTBot wird blockiert (Cloudflare oder Firewall)',
    userAgent: 'GPTBot/1.0 (+https://openai.com/gptbot)',
  },
]

export async function runAiReachabilityChecks({ targetUrl, mainStatus, fetchPage }) {
  // If the baseline fetch already failed, the probes would be misleading —
  // mark both as failed but skip the network calls.
  if (mainStatus !== 200) {
    return PROBES.map((p) => ({
      id: p.id,
      title: p.title,
      severity: 'high',
      passed: false,
    }))
  }

  const probeResults = await Promise.all(
    PROBES.map((p) => fetchPage(targetUrl, { userAgent: p.userAgent }))
  )

  return PROBES.map((p, i) => {
    const status = probeResults[i].status
    const blocked = BLOCKED_STATUSES.has(status)
    return {
      id: p.id,
      title: p.title,
      severity: 'high',
      passed: !blocked,
    }
  })
}
