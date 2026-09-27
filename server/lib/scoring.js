const WEIGHTS = { high: 3, medium: 2, low: 1 }

export function computeScore(results) {
  if (!Array.isArray(results) || results.length === 0) return 1
  let earned = 0
  let max = 0
  for (const r of results) {
    const w = WEIGHTS[r.severity] || 1
    max += w
    if (r.passed) earned += w
  }
  if (max === 0) return 1
  const raw = 1 + 9 * (earned / max)
  return Math.max(1, Math.min(10, Math.round(raw)))
}
