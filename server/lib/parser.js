// Extracts the parts of the HTML response that downstream checks need.
export function parseHtml(html) {
  const safe = html || ''
  const headMatch = safe.match(/<head[\s\S]*?<\/head>/i)
  const headHtml = headMatch ? headMatch[0] : safe.slice(0, 4000)

  const jsonLdBlocks = [
    ...safe.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ]
    .map((m) => m[1].trim())
    .filter(Boolean)

  const jsonLdJoined = jsonLdBlocks.join('\n---\n')

  return { headHtml, jsonLdBlocks, jsonLdJoined }
}
