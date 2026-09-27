import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Legal.css'

export default function Impressum() {
  useEffect(() => {
    window.scrollTo(0, 0)
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => document.head.removeChild(meta)
  }, [])

  return (
    <div className="legal">
      <div className="container">
        <Link to="/" className="legal__back">← Zurück</Link>
        <h1>Impressum</h1>

        <h2>Angaben gemäß § 5 TMG</h2>
        <p>
          Example Company GmbH<br />
          Musterstraße 1<br />
          12345 Musterstadt<br />
          Deutschland
        </p>

        <h2>Vertreten durch</h2>
        <p>Geschäftsführer: Max Mustermann</p>

        <h2>Kontakt</h2>
        <p>
          Telefon: +49 00 00000000<br />
          E-Mail: hello@example-company.example<br />
          Website: www.example-company.example
        </p>

        <h2>Registereintrag</h2>
        <p>
          Eintragung im Handelsregister.<br />
          Registergericht: Amtsgericht Musterstadt<br />
          Registernummer: HRB 00000
        </p>

        <h2>Umsatzsteuer-ID</h2>
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
          DE000000000
        </p>
      </div>
    </div>
  )
}
