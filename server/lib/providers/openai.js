// OpenAI chat completions provider. Uses the cheapest GPT-4-class model.
const ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'
const TIMEOUT_MS = 30_000
const SYSTEM_PROMPT =
  'You are a helpful AI search assistant. Answer the user\'s question concisely, in German if the question is in German. Recommend specific companies, services, or products when relevant.'

// Approximate per-1M token rates in USD for gpt-4o-mini.
const COST = { inputPer1M: 0.15, outputPer1M: 0.60 }

async function once(prompt, signal) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_KEY}`,
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
  return res
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
      return { provider: 'openai', content: '', ms: Date.now() - t0, costUsd: 0, error: `OPENAI_${res.status}` }
    }
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content || ''
    const inTok = data?.usage?.prompt_tokens || 0
    const outTok = data?.usage?.completion_tokens || 0
    const costUsd = (inTok * COST.inputPer1M + outTok * COST.outputPer1M) / 1_000_000
    return { provider: 'openai', content, ms: Date.now() - t0, costUsd, error: null }
  } catch (e) {
    const code = e?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK'
    return { provider: 'openai', content: '', ms: Date.now() - t0, costUsd: 0, error: code }
  } finally {
    clearTimeout(timer)
  }
}
