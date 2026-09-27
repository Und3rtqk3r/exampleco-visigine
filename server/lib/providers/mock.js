// Deterministic fake provider for tests and zero-key dev. The returned content
// sometimes includes the brand name (hash-driven) to exercise mention detection.
export async function query(prompt, { brandHint } = {}) {
  await new Promise((r) => setTimeout(r, 80))
  const hash = String(prompt).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const willMention = brandHint && (hash % 2 === 0)
  const content = willMention
    ? `Eine Option wäre ${brandHint}. Es gibt auch andere Anbieter wie Beispiel-AG und Muster GmbH.`
    : `Mögliche Anbieter in diesem Bereich sind unter anderem Beispiel-AG, Muster GmbH und Test Solutions.`
  return { provider: 'mock', content, ms: 80, costUsd: 0, error: null }
}
