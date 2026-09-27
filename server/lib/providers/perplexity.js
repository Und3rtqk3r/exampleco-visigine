// Perplexity is the highest-priority provider — it is an actual AI search
// engine, where real users go for recommendations. OpenAI-compatible schema.
const ENDPOINT = 'https://api.perplexity.ai/chat/completions'
const MODEL = 'sonar'
const TIMEOUT_MS = 30_000
const SYSTEM_PROMPT =
  'You are a helpful AI search assistant. Answer the user\'s question concisely, in German if the question is in German. Recommend specific companies, services, or products when relevant.'

// Approximate per-1M token rates in USD for `sonar`.
const COST = { inputPer1M: 1.00, outputPer1M: 1.00 }

async function once(prompt, signal) {
  return fetch(ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.PERPLEXITY_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 600,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
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
      return { provider: 'perplexity', content: '', ms: Date.now() - t0, costUsd: 0, error: `PERPLEXITY_${res.status}` }
    }
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content || ''
    const inTok = data?.usage?.prompt_tokens || 0
    const outTok = data?.usage?.completion_tokens || 0
    // Fall back to a character-based rough estimate if usage is absent.
    let costUsd
    if (inTok || outTok) {
      costUsd = (inTok * COST.inputPer1M + outTok * COST.outputPer1M) / 1_000_000
    } else {
      const approxIn = Math.ceil((prompt.length + SYSTEM_PROMPT.length) / 4)
      const approxOut = Math.ceil(content.length / 4)
      costUsd = (approxIn * COST.inputPer1M + approxOut * COST.outputPer1M) / 1_000_000
    }
    return { provider: 'perplexity', content, ms: Date.now() - t0, costUsd, error: null }
  } catch (e) {
    const code = e?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK'
    return { provider: 'perplexity', content: '', ms: Date.now() - t0, costUsd: 0, error: code }
  } finally {
    clearTimeout(timer)
  }
}
