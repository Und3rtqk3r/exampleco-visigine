import { useState } from 'react'
import AutoFix from '../AutoFix/AutoFix.jsx'
import './Analyzer.css'

function IssueCounts({ counts }) {
  const total = (counts?.high || 0) + (counts?.medium || 0) + (counts?.low || 0)
  if (total === 0) return null
  const rows = [
    { key: 'high',   label: 'Kritisch', count: counts.high   || 0 },
    { key: 'medium', label: 'Mittel',   count: counts.medium || 0 },
    { key: 'low',    label: 'Gering',   count: counts.low    || 0 },
  ].filter((r) => r.count > 0)

  return (
    <div className="result-counts">
      <h4 className="issues-title">Schwachstellen</h4>
      <div className="counts-list">
        {rows.map((r) => (
          <div key={r.key} className={`count-pill count-pill--${r.key}`}>
            <span className="count-pill__label">{r.label}</span>
            <span className="count-pill__num">{r.count}</span>
            <span className="count-pill__suffix">
              {r.count === 1 ? 'Problem' : 'Probleme'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Analyzer() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function analyze(e) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    setLoading(true)
    setResult(null)
    setError(null)

    if (/^http:\/\//i.test(trimmed)) {
      setError('HTTP wird nicht unterstützt. Bitte eine HTTPS-URL verwenden.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Analyse fehlgeschlagen. Bitte erneut versuchen.')
      } else {
        setResult(data)
      }
    } catch {
      setError('Analyse fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="analyzer" className="analyzer">
      <div className="container">
        <div className="section-header reveal" style={{ maxWidth: '100%' }}>
          <span className="section-label">
            <span className="label-bar" />
            Live-Analyse
          </span>
          <h2 className="section-title">
            Deinen GEO-Score<br />jetzt prüfen
          </h2>
          <p className="section-sub" style={{ maxWidth: '480px' }}>
            Gib deine Website-URL ein. Die KI analysiert sofort alle GEO- und SEO-Signale
            und liefert konkrete Maßnahmen.
          </p>
        </div>

        <form className="analyzer__form reveal" onSubmit={analyze}>
          <div className="form-row">
            <input
              type="text"
              className="form-input"
              placeholder="deine-website.de"
              value={url}
              onChange={e => setUrl(e.target.value)}
              autoComplete="url"
            />
            <button
              type="submit"
              className="btn-primary form-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="btn-spinner">
                  <span />Analysiere…
                </span>
              ) : 'Analysieren'}
            </button>
          </div>
        </form>

        {error && (
          <div className="analyzer__error reveal visible">
            <span className="error-icon">!</span>
            {error}
          </div>
        )}

        {result && (
          <div className="analyzer__result reveal visible">
            <div className="result-header">
              <div className="score-ring">
                <svg viewBox="0 0 80 80" className="score-svg">
                  <circle cx="40" cy="40" r="34" />
                  <circle
                    cx="40" cy="40" r="34"
                    className="score-arc"
                    strokeDasharray={`${(result.score / 10) * 213.6} 213.6`}
                  />
                </svg>
                <div className="score-label">
                  <span className="score-num">{result.score}</span>
                  <span className="score-of">/10</span>
                </div>
              </div>
              <div className="result-summary">
                <h3>GEO-Score: <em>{result.score >= 7 ? 'Gut' : result.score >= 4 ? 'Mittelmäßig' : 'Kritisch'}</em></h3>
                <p>{result.summary}</p>
              </div>
            </div>

            {result.issueCounts && (
              <IssueCounts counts={result.issueCounts} />
            )}

            {result.autofix && (
              <AutoFix data={result.autofix} />
            )}

            <div className="result-cta">
              <p>Alle Maßnahmen und konkrete Umsetzung — im Pro-Paket.</p>
              <a href="#pricing" className="btn-primary">Jetzt beheben lassen</a>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
