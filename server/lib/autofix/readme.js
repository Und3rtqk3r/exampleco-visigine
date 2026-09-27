// German plaintext README packaged with each ZIP download.
// Branches per-file by mode so the instructions match the user's situation.

function llmsSection(mode) {
  const intro = mode === 'replace'
    ? 'Ersetzt deine bestehende llms.txt.'
    : 'Du hast noch keine llms.txt — diese Datei ist neu.'
  return (
`────────────────────────────────────────────────────────────
1. llms.txt
────────────────────────────────────────────────────────────
${intro}

Wohin: Im Root-Verzeichnis deiner Website (gleiche Ebene wie /index.html).
Erreichbar als: https://deine-domain.de/llms.txt

Upload-Wege:
- FTP / SFTP: Datei nach /htdocs (oder /public_html) hochladen.
- cPanel / Plesk: Dateimanager → Root öffnen → Hochladen.
- WordPress: Plugin "WPCode" oder Theme-Editor → File Manager.

Wichtig: Alle Platzhalter [Bitte ergänzen: ...] vor dem Upload mit
deinen Inhalten ersetzen.
`)
}

function robotsSection(mode) {
  if (mode === 'new') {
    return (
`────────────────────────────────────────────────────────────
2. robots.txt
────────────────────────────────────────────────────────────
Du hast noch keine robots.txt — diese Datei ist komplett.

Wohin: Im Root-Verzeichnis deiner Website. Ersetzt eine eventuell
bestehende robots.txt komplett. Erreichbar als
https://deine-domain.de/robots.txt
`)
  }
  return (
`────────────────────────────────────────────────────────────
2. robots.txt
────────────────────────────────────────────────────────────
Deine bestehende robots.txt deckt nicht alle KI-Bots ab.

Wohin: Den Inhalt dieser Datei am Ende deiner bestehenden
robots.txt einfügen — vor der Sitemap-Zeile, falls vorhanden.
Bestehende Regeln NICHT überschreiben.
`)
}

function jsonLdSection(mode) {
  const intro = mode === 'enhance'
    ? 'Deine Seite hat bereits JSON-LD — diese Version erweitert die Coverage (FAQPage, WebSite, vollständige Organization).'
    : 'Du hast noch kein JSON-LD — dieser Block ist neu.'
  return (
`────────────────────────────────────────────────────────────
3. jsonld.html
────────────────────────────────────────────────────────────
${intro}

Wohin: Den gesamten <script>-Block in das <head> deiner Startseite
einfügen (idealerweise direkt nach den Meta-Tags).

WordPress: Theme-Datei header.php oder via SEO-Plugin
(Yoast / RankMath → Schema-Editor).

Hinweis: Validieren mit https://validator.schema.org/ vor dem
Live-Schalten.
`)
}

export function buildReadme(autofix) {
  const llmsMode = autofix?.llmsTxt?.mode || 'new'
  const robotsMode = autofix?.robotsTxt?.mode || 'new'
  const jsonLdMode = autofix?.jsonLd?.mode || 'new'

  return (
`EXAMPLEVISI Auto-Fix Paket
========================

Dieses Archiv enthält drei Dateien, die deine Website für KI-Suchsysteme
sichtbar machen. Bitte alle Platzhalter [Bitte ergänzen: ...] vor dem
Hochladen mit deinen Inhalten ersetzen.

${llmsSection(llmsMode)}
${robotsSection(robotsMode)}
${jsonLdSection(jsonLdMode)}
────────────────────────────────────────────────────────────
Validierung
────────────────────────────────────────────────────────────
Nach dem Hochladen erneut analysieren:
https://www.examplevisi.example#analyzer

────────────────────────────────────────────────────────────
Support
────────────────────────────────────────────────────────────
Fragen oder Hilfe bei der Umsetzung:
- E-Mail:  hello@example-company.example
- Termin:  https://termin.example-company.example

Vollständige Umsetzung gewünscht?
→ https://www.examplevisi.example#pricing
`)
}
