import './HowItWorks.css'

const STEPS = [
  {
    num: '01',
    title: 'URL eingeben',
    text: 'Du gibst deine Website-URL ein. Keine Registrierung, kein Zugang zu deinem CMS oder Server nötig.',
  },
  {
    num: '02',
    title: 'Automatische Analyse',
    text: 'EXAMPLEVISI crawlt deine Website und prüft über 40 GEO- und SEO-Kriterien — von JSON-LD bis robots.txt bis zur Qualität deiner Inhalte.',
  },
  {
    num: '03',
    title: 'Bericht & Score',
    text: 'Du erhältst deinen GEO-Score (1–10) und einen vollständigen Bericht mit priorisierten Handlungsempfehlungen.',
  },
  {
    num: '04',
    title: 'Umsetzung (optional)',
    text: 'Auf Wunsch setzt EXAMPLEVISI alle technischen Maßnahmen direkt um. Du gibst frei, wir liefern.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="how">
      <div className="container how__inner">
        <div className="section-header reveal">
          <span className="section-label">
            <span className="label-bar" />
            Der Prozess
          </span>
          <h2 className="section-title">
            Von der URL zum<br />optimierten Auftritt
          </h2>
          <p className="section-sub">
            EXAMPLEVISI arbeitet vollautomatisch. Vier Schritte — von der Analyse bis zur fertigen Umsetzung.
          </p>
        </div>

        <div className="how__steps">
          {STEPS.map((s, i) => (
            <div key={i} className="how-step reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className="how-step__num">{s.num}</div>
              <div className="how-step__content">
                <h3 className="how-step__title">{s.title}</h3>
                <p className="how-step__text">{s.text}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="how-step__connector" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>

        <div className="how__cta reveal">
          <a href="#pricing" className="btn-primary">Jetzt Analyse starten</a>
        </div>
      </div>
    </section>
  )
}
