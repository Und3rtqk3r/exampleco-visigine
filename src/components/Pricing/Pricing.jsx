import './Pricing.css'

const PLANS = [
  {
    name: 'Starter',
    price: '49',
    period: 'einmalig',
    desc: 'Für den ersten Eindruck. Schnellcheck mit GEO-Score und den wichtigsten Schwachstellen.',
    features: [
      'GEO-Score (1–10)',
      '5 wichtigste Schwachstellen',
      'Basis-Empfehlungen',
      'PDF-Zusammenfassung',
    ],
    cta: 'Jetzt buchen',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '149',
    period: 'einmalig',
    badge: 'Beliebt',
    desc: 'Vollständiger Bericht + direkte Umsetzung aller technischen Maßnahmen.',
    features: [
      'Vollständige GEO-Analyse (40+ Kriterien)',
      'SEO-Technische Prüfung',
      'JSON-LD, llms.txt, robots.txt',
      'Sitemap-Optimierung',
      'Meta-Daten Überarbeitung',
      'Detaillierter PDF-Bericht',
      'Umsetzung innerhalb 48h',
    ],
    cta: 'Jetzt buchen',
    highlight: true,
  },
  {
    name: 'Monitor',
    price: '49',
    period: 'monatlich',
    desc: 'Laufende KI-Sichtbarkeit im Blick — monatliches Tracking & Wettbewerbs-Radar.',
    features: [
      'Monatlicher GEO-Score-Check',
      'KI-Empfehlungs-Tracking',
      'Wettbewerbs-Vergleich (3 Mitbewerber)',
      'Change-Alerts bei Score-Abfall',
      'Quartalsbericht',
    ],
    cta: 'Monitor starten',
    highlight: false,
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="pricing">
      <div className="container">
        <div className="section-header reveal" style={{ maxWidth: '100%', textAlign: 'center', alignItems: 'center' }}>
          <span className="section-label" style={{ justifyContent: 'center' }}>
            <span className="label-bar" />
            Transparente Preise
          </span>
          <h2 className="section-title">
            Einmal zahlen. Dauerhaft sichtbar.
          </h2>
          <p className="section-sub" style={{ maxWidth: '500px', margin: '0 auto' }}>
            Keine versteckten Kosten. Keine Abofallt. Du wählst, was du brauchst.
          </p>
        </div>

        <div className="pricing__grid">
          {PLANS.map((p, i) => (
            <div
              key={i}
              className={`pricing-card reveal${p.highlight ? ' pricing-card--highlight' : ''}`}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              {p.badge && <div className="pricing-card__badge">{p.badge}</div>}
              <div className="pricing-card__name">{p.name}</div>
              <div className="pricing-card__price">
                <span className="price-curr">€</span>
                <span className="price-num">{p.price}</span>
                <span className="price-period">/ {p.period}</span>
              </div>
              <p className="pricing-card__desc">{p.desc}</p>
              <ul className="pricing-card__features">
                {p.features.map((f, j) => (
                  <li key={j}>
                    <span className="feat-check">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="https://termine.example-company.example"
                target="_blank"
                rel="noopener noreferrer"
                className={p.highlight ? 'btn-primary' : 'btn-ghost'}
                style={{ marginTop: 'auto', textAlign: 'center', display: 'block' }}
              >
                {p.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="pricing__note reveal">
          Alle Preise zzgl. MwSt. · Für individuelle Projekte &amp; Agenturen —
          <a href="mailto:hello@example-company.example"> Anfrage senden</a>
        </p>
      </div>
    </section>
  )
}
