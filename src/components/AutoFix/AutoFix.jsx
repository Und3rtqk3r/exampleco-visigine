import './AutoFix.css'

// Locked teaser. Shows that personalized files exist and what kind of change
// each one is — without revealing any content. Unlock CTA anchors to #pricing.
const FILES = [
  { key: 'llmsTxt',   filename: 'llms.txt' },
  { key: 'robotsTxt', filename: 'robots.txt' },
  { key: 'jsonLd',    filename: 'jsonld.html' },
]

export default function AutoFix({ data }) {
  if (!data) return null

  return (
    <div className="autofix">
      <div className="autofix__header">
        <span className="section-label">
          <span className="label-bar" />
          Auto-Fix Paket
        </span>
        <h3 className="autofix__title">3 Dateien für deine Website generiert</h3>
        <p className="autofix__sub">
          Personalisiert mit deinem Firmennamen, deiner URL und deinen
          bestehenden Daten. Vollständige Dateien zum Download im Pro-Paket.
        </p>
      </div>

      <div className="autofix__files">
        {FILES.map(({ key, filename }) => {
          const f = data[key]
          if (!f) return null
          return (
            <div key={key} className="autofix__file">
              <div className="autofix__file-icon" aria-hidden="true">{'{ }'}</div>
              <div className="autofix__file-main">
                <span className="autofix__file-name">{filename}</span>
                <span className="autofix__file-meta">{f.label || ''}</span>
              </div>
              <span className="autofix__lock" aria-label="Gesperrt">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                  <path d="M8 1a3 3 0 0 0-3 3v3H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1V4a3 3 0 0 0-3-3Zm-1.5 3a1.5 1.5 0 0 1 3 0v3h-3V4Z" />
                </svg>
              </span>
            </div>
          )
        })}
      </div>

      <a href="#pricing" className="autofix__unlock-btn">
        Im Pro-Paket freischalten
      </a>
    </div>
  )
}
