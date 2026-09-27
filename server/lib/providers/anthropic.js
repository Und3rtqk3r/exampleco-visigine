// Anthropic Messages API. Cheapest current Haiku model.
const ENDPOINT = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'
const TIMEOUT_MS = 30_000
const SYSTEM_PROMPT =
  'You are a helpful AI search assistant. Answer the user\'s question concisely, in German if the question is in German. Recommend specific companies, services, or products when relevant.'

// Approximate per-1M token rates in USD for Haiku 4.5.
const COST = { inputPer1M: 1.00, outputPer1M: 5.00 }

async function once(prompt, signal) {
  return fetch(ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
}

export async function query(prompt) {
  const t0 = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    let res = await once(prompt, controller.signal)
    if (res.status >= 500) {
      res = await once(prompt, controller.signal)
    }
    if (!res.ok) {
      return { provider: 'anthropic', content: '', ms: Date.now() - t0, costUsd: 0, error: `ANTHROPIC_${res.status}` }
    }
    const data = await res.json()
    // Claude returns content as an array of blocks. Concatenate `text` blocks.
    const blocks = Array.isArray(data?.content) ? data.content : []
    const content = blocks.map((b) => b?.text || '').join('')
    const inTok = data?.usage?.input_tokens || 0
    const outTok = data?.usage?.output_tokens || 0
    const costUsd = (inTok * COST.inputPer1M + outTok * COST.outputPer1M) / 1_000_000
    return { provider: 'anthropic', content, ms: Date.now() - t0, costUsd, error: null }
  } catch (e) {
    const code = e?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK'
    return { provider: 'anthropic', content: '', ms: Date.now() - t0, costUsd: 0, error: code }
  } finally {
    clearTimeout(timer)
  }
}
