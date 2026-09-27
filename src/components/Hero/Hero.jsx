import './Hero.css'

export default function Hero() {
  return (
    <section className="hero">
      <div className="container hero__inner">
        <div className="hero__label reveal">
          <span className="label-bar" />
          B2B GEO + SEO Automatisierung
        </div>

        <h1 className="hero__headline reveal">
          Werde sichtbar,<br />
          wo KI antwortet.
        </h1>

        <p className="hero__sub reveal">
          EXAMPLEVISI analysiert deine Website vollautomatisch auf GEO- und SEO-Schwachstellen
          und liefert konkrete Maßnahmen — damit ChatGPT, Gemini, Grok und Perplexity
          dein Unternehmen empfehlen.
        </p>

        <div className="hero__actions reveal">
          <a href="#pricing" className="btn-primary">
            Kostenlose Analyse starten
          </a>
          <a href="#how-it-works" className="btn-ghost">
            Wie es funktioniert
          </a>
        </div>

        <div className="hero__stats reveal">
          <div className="stat">
            <span className="stat__num">3 ×</span>
            <span className="stat__label">mehr KI-Sichtbarkeit</span>
          </div>
          <div className="stat__divider" />
          <div className="stat">
            <span className="stat__num">&lt; 24h</span>
            <span className="stat__label">Analyse & Bericht</span>
          </div>
          <div className="stat__divider" />
          <div className="stat">
            <span className="stat__num">100 %</span>
            <span className="stat__label">DSGVO-konform</span>
          </div>
        </div>
      </div>

      {/* Ticker */}
      <div className="hero__ticker" aria-hidden="true">
        <div className="ticker__track">
          {Array(6).fill(null).map((_, i) => (
            <span key={i} className="ticker__inner">
              ChatGPT <em>◆</em> Gemini <em>◆</em> Perplexity <em>◆</em> Claude <em>◆</em>
              Grok <em>◆</em> Meta AI <em>◆</em> Bing Copilot <em>◆</em> DuckDuckGo AI <em>◆</em>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
