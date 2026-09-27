import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer({ minimal = false }) {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      {!minimal && (
        <div className="container footer__inner">
          <div className="footer__brand">
            <div className="footer__logo-wrap">
              <img src="/exampleco-logo.png" alt="ExampleCo" className="footer__logo-img" />
              <span className="footer__logo-name">VISI<em>GINE</em></span>
            </div>
            <p className="footer__tagline">
              GEO + SEO Automatisierung<br />
              fur KI-suchende Unternehmen.
            </p>
            <span className="footer__by">Ein Service der Example Company GmbH</span>
          </div>

          <nav className="footer__nav" aria-label="Footer Navigation">
            <div className="footer__col">
              <span className="footer__col-title">Produkt</span>
              <a href="#features">Features</a>
              <a href="#how-it-works">So funktioniert's</a>
              <a href="#pricing">Preise</a>
            </div>
            <div className="footer__col">
              <span className="footer__col-title">Kontakt</span>
              <a href="mailto:hello@example-company.example">hello@example-company.example</a>
            </div>
            <div className="footer__col">
              <span className="footer__col-title">Rechtliches</span>
              <Link to="/impressum">Impressum</Link>
              <Link to="/datenschutz">Datenschutz</Link>
            </div>
          </nav>
        </div>
      )}

      <div className="footer__bottom">
        <div className="container footer__bottom-inner">
          <span>&copy; {year} Example Company GmbH · EXAMPLEVISI · Alle Rechte vorbehalten</span>
          {minimal && (
            <div className="footer__legal-links">
              <Link to="/impressum">Impressum</Link>
              <Link to="/datenschutz">Datenschutz</Link>
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
