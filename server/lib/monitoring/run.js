// One full run executes every active query against every available provider.
// Sequential within (query, provider) pairs to be polite with rate limits;
// total wall-clock ~= queries × providers × ~2s.
import { randomUUID } from 'node:crypto'
import { getProviders } from '../providers/index.js'
import { detectMention } from './detect-mention.js'
import * as repo from '../../db/repo.js'

const INTER_REQUEST_MS = 200

export class RunError extends Error {
  constructor(code, message) {
    super(message || code)
    this.code = code
  }
}

export async function runMonitoring(clientId) {
  const client = repo.getClient(clientId)
  if (!client) throw new RunError('CLIENT_NOT_FOUND')
  if (client.status === 'paused' || client.status === 'archived') {
    throw new RunError('CLIENT_NOT_ACTIVE')
  }
  const queries = repo.listActiveQueries(clientId)
  if (queries.length === 0) throw new RunError('NO_ACTIVE_QUERIES')

  const providers = getProviders()
  const providerKeys = Object.keys(providers)

  const summary = {
    runId: randomUUID().slice(0, 8),
    client_id: clientId,
    hostname: client.hostname,
    started_at: new Date().toISOString(),
    providers: providerKeys,
    queries: queries.length,
    totals: { runs: 0, mentions: 0, errors: 0, cost_usd: 0 },
  }

  const wallStart = Date.now()

  for (const query of queries) {
    for (const key of providerKeys) {
      const t0 = Date.now()
      let result
      try {
        result = await providers[key].query(query.text, { brandHint: client.name })
      } catch (e) {
        result = {
          provider: key,
          content: '',
          ms: Date.now() - t0,
          costUsd: 0,
          error: e?.code || e?.message || 'UNKNOWN',
        }
      }

      const mention = result.error
        ? { mentioned: false, position: null, snippet: null }
        : detectMention(result.content, client)

      repo.insertRun({
        client_id: clientId,
        query_id: query.id,
        provider: result.provider || key,
        mentioned: mention.mentioned,
        position: mention.position,
        snippet: mention.snippet,
        response_full: result.content || null,
        ms: result.ms || (Date.now() - t0),
        cost_usd: result.costUsd || 0,
        error: result.error || null,
      })

      summary.totals.runs++
      if (mention.mentioned) summary.totals.mentions++
      if (result.error) summary.totals.errors++
      summary.totals.cost_usd += result.costUsd || 0

      await new Promise((r) => setTimeout(r, INTER_REQUEST_MS))
    }
  }

  repo.touchClientRun(clientId)
  summary.finished_at = new Date().toISOString()
  summary.totals.cost_usd = Number(summary.totals.cost_usd.toFixed(6))

  const ms = Date.now() - wallStart
  console.log(
    `[monitoring] runId=${summary.runId} client=${client.hostname} queries=${queries.length} ` +
    `providers=${providerKeys.length} runs=${summary.totals.runs} ` +
    `mentions=${summary.totals.mentions} errors=${summary.totals.errors} ` +
    `cost_usd=${summary.totals.cost_usd} ms=${ms}`
  )
  summary.ms = ms
  return summary
}
