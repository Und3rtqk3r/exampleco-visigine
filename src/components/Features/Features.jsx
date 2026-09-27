import './Features.css'

const FEATURES = [
  {
    icon: '◎',
    accent: 'amber',
    title: 'GEO-Score-Analyse',
    text: 'EXAMPLEVISI prüft deine Website auf alle relevanten GEO-Signale: llms.txt, JSON-LD, strukturierte Daten, robots.txt, Entitäts-Klarheit — und gibt dir einen Score von 1–10.',
  },
  {
    icon: '⟳',
    accent: 'teal',
    title: 'Automatischer Bericht',
    text: 'Innerhalb von 24 Stunden erhältst du einen detaillierten PDF-Bericht mit priorisierten Maßnahmen — sortiert nach Impact und Aufwand.',
  },
  {
    icon: '✦',
    accent: 'amber',
    title: 'Konkrete Umsetzung',
    text: 'Kein Selbermachen nötig: Optional setzt EXAMPLEVISI alle Maßnahmen direkt um — JSON-LD, llms.txt, Meta-Daten, robots.txt, Sitemap.',
  },
  {
    icon: '⚡',
    accent: 'teal',
    title: 'KI-Monitoring',
    text: 'Monatliches Tracking deiner Sichtbarkeit in ChatGPT, Gemini und Perplexity. Du siehst, ob dein Unternehmen empfohlen wird — und wofür.',
  },
  {
    icon: '◈',
    accent: 'amber',
    title: 'Wettbewerbs-Radar',
    text: 'Vergleich deiner GEO-Performance mit direkten Wettbewerbern in deiner Region und Branche. Erkenne Lücken, bevor sie ausgenutzt werden.',
  },
  {
    icon: '⬡',
    accent: 'teal',
    title: 'DSGVO-sicher',
    text: 'Alle Analysen laufen über europäische Server. Keine Weitergabe von Kundendaten. Vollständig DSGVO-konform — dokumentiert und auditierbar.',
  },
]

export default function Features() {
  return (
    <section id="features" className="features">
      <div className="container">
        <div className="section-header reveal">
          <span className="section-label">
            <span className="label-bar" />
            Was EXAMPLEVISI liefert
          </span>
          <h2 className="section-title">
            Vollständige GEO &amp; SEO<br />Optimierung aus einer Hand
          </h2>
          <p className="section-sub">
            Während klassisches SEO auf Google-Rankings zielt, entscheidet GEO darüber,
            ob KI-Systeme dein Unternehmen kennen, verstehen und weiterempfehlen.
          </p>
        </div>

        <div className="features__grid">
          {FEATURES.map((f, i) => (
            <div key={i} className={`feature-card feature-card--${f.accent} reveal`} style={{ transitionDelay: `${i * 0.08}s` }}>
              <div className="feature-card__icon">{f.icon}</div>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__text">{f.text}</p>
              <div className="feature-card__shimmer" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
