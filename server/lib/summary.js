const SUMMARY_PROMPT = `You are a GEO/SEO auditor. The following checks were run on a website. Some FAILED.
Write a summary in German: 1-2 sentences describing what is missing and why it matters for AI visibility.
Be specific about which signals are missing. Do not invent checks — only describe the ones listed.
Return ONLY the summary text, no JSON, no markdown.`

function fallback(failedTitles) {
  return `${failedTitles.length} GEO/SEO-Signale fehlen. Behebe die aufgelisteten Probleme für bessere KI-Sichtbarkeit.`
}

export async function generateSummary(failedTitles, targetUrl) {
  const apiKey = process.env.MISTRAL_KEY
  if (!apiKey || failedTitles.length === 0) return fallback(failedTitles)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        max_tokens: 150,
        messages: [
          { role: 'system', content: SUMMARY_PROMPT },
          { role: 'user', content: `Website: ${targetUrl}\nFehlende Signale: ${failedTitles.join(', ')}` },
        ],
      }),
    })
    if (!res.ok) return fallback(failedTitles)
    const data = await res.json()
    const text = (data?.choices?.[0]?.message?.content || '').trim()
    return text || fallback(failedTitles)
  } catch {
    return fallback(failedTitles)
  } finally {
    clearTimeout(timer)
  }
}
