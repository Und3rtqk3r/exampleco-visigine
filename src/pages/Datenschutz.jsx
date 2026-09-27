import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Legal.css'

export default function Datenschutz() {
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
        <h1>Datenschutzerklärung</h1>

        <h2>1. Datenschutz auf einen Blick</h2>
        <h3>Allgemeine Hinweise</h3>
        <p>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen oder unsere Dienste nutzen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.</p>

        <h3>Datenerfassung auf unserer Website</h3>
        <p>Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Die Kontaktdaten können Sie dem Abschnitt „Hinweis zur verantwortlichen Stelle" in dieser Datenschutzerklärung entnehmen. Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst.</p>

        <h2>2. Allgemeine Hinweise und Pflichtinformationen</h2>
        <h3>Hinweis zur verantwortlichen Stelle</h3>
        <p>
          Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:<br /><br />
          Example Company GmbH<br />
          Musterstraße 1<br />
          12345 Musterstadt<br />
          Deutschland<br /><br />
          Vertreten durch den Geschäftsführer: Max Mustermann<br />
          Telefon: +49 00 00000000<br />
          E-Mail: hello@example-company.example
        </p>

        <h3>Widerruf Ihrer Einwilligung zur Datenverarbeitung</h3>
        <p>Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich. Sie können eine bereits erteilte Einwilligung jederzeit widerrufen. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.</p>

        <h3>Recht auf Beschwerde bei der zuständigen Aufsichtsbehörde</h3>
        <p>Im Falle von Verstößen gegen die DSGVO steht den Betroffenen ein Beschwerderecht bei einer Aufsichtsbehörde zu.</p>

        <h3>Recht auf Auskunft, Löschung und Berichtigung</h3>
        <p>Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf Berichtigung oder Löschung dieser Daten.</p>

        <h3>SSL- bzw. TLS-Verschlüsselung</h3>
        <p>Diese Seite nutzt aus Sicherheitsgründen eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von „http://" auf „https://" wechselt.</p>

        <h2>3. Hosting &amp; Sicherheit</h2>
        <h3>Hosting bei Hetzner</h3>
        <p>Wir hosten unsere Website bei der Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen (Deutschland). Wenn Sie unsere Website besuchen, erfasst Hetzner verschiedene Logfiles inklusive Ihrer IP-Adresse. Wir haben einen Vertrag zur Auftragsverarbeitung (AVV) mit dem Anbieter geschlossen.</p>

        <h3>Cloudflare</h3>
        <p>Wir nutzen das Content Delivery Network (CDN) und Sicherheitsdienste von Cloudflare Inc., 101 Townsend St., San Francisco, CA 94107, USA. Cloudflare verarbeitet Verkehrsdaten zwischen Ihnen und unserer Website. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.</p>

        <h2>4. Analyse-Tools</h2>
        <h3>Einwilligungsmanagement mit Cookiebot</h3>
        <p>Unsere Website nutzt die Consent-Management-Technologie von Cookiebot (Usercentrics A/S, Havnegade 39, 1058 Kopenhagen, Dänemark). Rechtsgrundlage ist Art. 6 Abs. 1 lit. c DSGVO.</p>

        <h3>Google Tag Manager, Analytics &amp; Ads</h3>
        <p>Soweit Sie Ihre Einwilligung erteilt haben (Art. 6 Abs. 1 lit. a DSGVO), nutzen wir Dienste der Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland. Sie können Ihre Einwilligung jederzeit über unsere Cookie-Einstellungen widerrufen.</p>

        <h2>5. Soziale Medien</h2>
        <p>Wir verlinken auf unserer Website auf unsere Profile bei Facebook und Instagram. Es handelt sich hierbei um reine Verlinkungen. Es werden durch den bloßen Aufruf unserer Website keine Daten an diese Netzwerke übertragen.</p>
      </div>
    </div>
  )
}
