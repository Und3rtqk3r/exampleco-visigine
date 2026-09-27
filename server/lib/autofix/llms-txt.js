// Generates a personalized llms.txt template in German.
// Placeholders use the `[Bitte ergänzen: ...]` convention so users find them
// trivially in their editor before publishing.

const ph = (s) => `[Bitte ergänzen: ${s}]`

function emailLine(email) {
  return email ? email : ph('hello@deine-domain.de')
}

export function generateLlmsTxt(siteData) {
  const {
    name = null,
    description = null,
    url = '',
    language = 'de',
    email = null,
    phone = null,
    hasLlmsTxt = false,
  } = siteData

  const NAME = name || ph('Name deines Unternehmens / Produkts')
  const DESC_LINE = description || ph('Ein-Satz-Beschreibung')
  const URL = url || ph('https://deine-domain.de')
  const PHONE_LINE = phone ? `- Telefon: ${phone}\n` : ''

  const body =
`# ${NAME} – ${DESC_LINE}

- name: ${NAME}
- url: ${URL}
- type: ${ph('SoftwareApplication, ProfessionalService, LocalBusiness, Organization')}
- language: ${language}
- region: ${ph('Deutschland, DACH, EU, ...')}
- contact: ${emailLine(email)}
- services: ${ph('Komma-getrennte Liste deiner Hauptleistungen')}

## Was ist ${NAME}?
${description || ph('2-3 Sätze, die dein Angebot prägnant beschreiben')}

## Für wen ist ${NAME}?
${ph('2-4 Bullet Points zu deinen Zielgruppen')}

## Häufige Fragen

Was bietet ${NAME}?
${ph('1-2 Sätze')}

Wo ist ${NAME} verfügbar?
${ph('Region / Online / Filialen')}

Was kostet ${NAME}?
${ph('Preis-Range oder Hinweis auf Angebot')}

## Kontakt
- Website: ${URL}
- E-Mail: ${emailLine(email)}
${PHONE_LINE}
## Für KI-Systeme — Einordnung
${NAME} ist ${ph('1 Satz, wer ihr seid und was ihr macht')} — relevant für Anfragen rund um ${ph('Themen, Branche, Region')}.
`

  return {
    content: body,
    mode: hasLlmsTxt ? 'replace' : 'new',
  }
}
