// Generate ~10 German search queries that simulate how a potential customer
// would ask an AI assistant. Brand name is intentionally excluded so the
// monitoring run can measure whether the AI surfaces the brand without bias.
const MISTRAL_ENDPOINT = 'https://api.mistral.ai/v1/chat/completions'
const MISTRAL_MODEL = 'mistral-large-latest'

function buildPrompt(siteData) {
  const name = siteData?.name || 'Unbekanntes Unternehmen'
  const description = siteData?.description || '[keine Beschreibung verfügbar]'
  const url = siteData?.url || siteData?.hostname || ''
  return (
`Du bist ein GEO-Analyst (Generative Engine Optimization). Generiere genau 10 deutschsprachige Suchanfragen, die ein echter Nutzer in einer KI-Suchmaschine wie ChatGPT, Perplexity oder Claude eingeben würde, um Unternehmen wie das untenstehende zu finden.

Kontext:
- Firma: ${name}
- Beschreibung: ${description}
- Domain: ${url}

Anforderungen:
- Genau 10 Anfragen, eine pro Zeile, nummeriert "1. ... 2. ... 3. ..."
- Mischung aus: Service-spezifischen Anfragen, Branchen-Anfragen, regionalen Anfragen (DACH falls passend), Vergleichs-/Empfehlungs-Anfragen
- ⚠ KEINE Erwähnung des Firmennamens "${name}" in den Anfragen — der Test prüft, ob die KI das Unternehmen ohne Bias nennt
- Realistisch formuliert, wie ein normaler Nutzer schreiben würde (nicht zu förmlich)
- Auf Deutsch, mit Du-Form oder neutral

Ausgabe: nur die nummerierte Liste, keine Erklärungen, keine Einleitung.`
  )
}

async function callMistral(prompt, { timeoutMs = 30000, maxTokens = 800 } = {}) {
  const apiKey = process.env.MISTRAL_KEY
  if (!apiKey) throw new Error('NO_MISTRAL_KEY')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(MISTRAL_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        max_tokens: maxTokens,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) throw new Error(`MISTRAL_${res.status}`)
    const data = await res.json()
    return data?.choices?.[0]?.message?.content || ''
  } finally {
    clearTimeout(timer)
  }
}

// Tolerates slight format drift: optional leading whitespace, number followed
// by `.` or `)`, optional trailing punctuation. Filters obvious noise.
function parseList(text) {
  return text.split('\n')
    .map((l) => l.trim())
    .map((l) => l.replace(/^\d+\s*[.)\-:]\s*/, ''))
    .map((l) => l.replace(/^[•\-*]\s*/, ''))
    .filter((l) => l.length >= 10 && l.length <= 300)
    .slice(0, 10)
}

export async function generateQueries(siteData) {
  const prompt = buildPrompt(siteData)
  let text
  try {
    text = await callMistral(prompt)
  } catch (err) {
    console.warn('[monitoring/generate-queries]', err?.message || err)
    return { queries: [], warning: 'GENERATION_FAILED' }
  }
  const queries = parseList(text)
  // Soft filter: drop any query that still contains the brand name (case-insensitive).
  const brandLower = (siteData?.name || '').toLowerCase().trim()
  const filtered = brandLower
    ? queries.filter((q) => !q.toLowerCase().includes(brandLower))
    : queries
  if (filtered.length < 5) {
    return { queries: filtered, warning: 'fewer than 10 generated' }
  }
  return { queries: filtered }
}
