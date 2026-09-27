// Reserved for iteration 4b. Backend-only for now — no UI surfaces this yet.
// No auth, 5/hour/IP rate limit. Runs a single (query × provider) against one
// real-or-mock provider and returns the result. Nothing is persisted.
import { Router } from 'express'
import { validateUrl, runAnalysisPipeline } from '../lib/pipeline.js'
import { getProviders } from '../lib/providers/index.js'
import { detectMention } from '../lib/monitoring/detect-mention.js'
import { generateQueries } from '../lib/monitoring/generate-queries.js'

const router = Router()

router.post('/', async (req, res) => {
  const url = req.body?.url
  let queryText = (req.body?.query || '').trim()

  const v = validateUrl(url)
  if (v.error) return res.status(v.error.http).json({ error: v.error.msg })

  // If no query supplied, generate one quickly. We pull siteData from a fresh
  // analyze pass so the generated query is on-brand.
  let clientLike
  try {
    const out = await runAnalysisPipeline(v.targetUrl, { debugMode: false })
    if (out.error) return res.status(out.error.http).json({ error: out.error.msg })
    const sd = out._siteData || {}
    clientLike = {
      name: sd.name || v.host,
      hostname: v.host,
      brand_aliases: '[]',
    }
    if (!queryText) {
      const { queries } = await generateQueries({
        name: clientLike.name,
        description: sd.description,
        url: v.targetUrl,
        hostname: v.host,
      })
      queryText = queries?.[0] || `Welche Anbieter gibt es für ${clientLike.name}?`
    }
  } catch (err) {
    console.error('[demo-monitoring]', err?.message || err)
    return res.status(500).json({ error: 'Ein interner Fehler ist aufgetreten.' })
  }

  const providers = getProviders()
  const provider = providers.openai
  const result = await provider.query(queryText, { brandHint: clientLike.name })
  const mention = result.error
    ? { mentioned: false, position: null, snippet: null }
    : detectMention(result.content, clientLike)

  const truncated = (result.content || '').slice(0, 500)
  res.json({
    provider: result.provider,
    query: queryText,
    response: truncated,
    truncated: (result.content || '').length > 500,
    mentioned: mention.mentioned,
    snippet: mention.snippet,
    error: result.error || null,
  })
})

export default router
