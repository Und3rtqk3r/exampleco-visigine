// Case-insensitive substring search for brand identifiers in LLM output.
// Returns the first match's position and a ~200-char surrounding snippet.
export function detectMention(text, client) {
  let aliases = []
  try { aliases = JSON.parse(client.brand_aliases || '[]') } catch { /* keep [] */ }

  const candidates = [
    client.name,
    client.hostname?.split('.')[0],
    ...aliases,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase().trim())
    .filter((s) => s.length >= 3)
    .filter((v, i, a) => a.indexOf(v) === i)

  if (!text || candidates.length === 0) {
    return { mentioned: false, position: null, snippet: null }
  }

  const lower = text.toLowerCase()
  let best = null
  for (const candidate of candidates) {
    const idx = lower.indexOf(candidate)
    if (idx >= 0 && (best === null || idx < best.position)) {
      best = { position: idx, candidate }
    }
  }
  if (!best) return { mentioned: false, position: null, snippet: null }

  const start = Math.max(0, best.position - 100)
  const end = Math.min(text.length, best.position + best.candidate.length + 100)
  let snippet = text.slice(start, end).trim()
  if (start > 0) snippet = '…' + snippet
  if (end < text.length) snippet = snippet + '…'

  return { mentioned: true, position: best.position, snippet }
}
