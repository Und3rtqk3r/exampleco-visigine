// Group D — head / meta / open graph / twitter / canonical / lang.
export function runMetaChecks({ html, headHtml }) {
  const hh = headHtml || ''
  const full = html || ''

  const descMatch = hh.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
  const descContent = descMatch ? descMatch[1].trim() : ''

  const titleMatch = hh.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const titleText = titleMatch ? titleMatch[1].trim() : ''

  return [
    {
      id: 'meta.canonical',
      title: 'Canonical-Tag fehlt',
      severity: 'low',
      passed: /rel=["']canonical["']/i.test(hh),
    },
    {
      id: 'meta.og-title',
      title: 'og:title fehlt',
      severity: 'low',
      passed: /property=["']og:title["']/i.test(hh),
    },
    {
      id: 'meta.og-image',
      title: 'og:image fehlt',
      severity: 'low',
      passed: /property=["']og:image["']/i.test(hh),
    },
    {
      id: 'meta.og-description',
      title: 'og:description fehlt',
      severity: 'low',
      passed: /property=["']og:description["']/i.test(hh),
    },
    {
      id: 'meta.og-type',
      title: 'og:type fehlt',
      severity: 'low',
      passed: /property=["']og:type["']/i.test(hh),
    },
    {
      id: 'meta.twitter-card',
      title: 'twitter:card fehlt',
      severity: 'low',
      passed: /name=["']twitter:card["']/i.test(hh),
    },
    {
      id: 'meta.description',
      title: 'Meta-Description fehlt oder zu kurz',
      severity: 'medium',
      passed: descContent.length >= 50,
    },
    {
      id: 'meta.title-length',
      title: 'Title fehlt oder ungeeignete Länge',
      severity: 'medium',
      passed: titleText.length >= 20 && titleText.length <= 70,
    },
    {
      id: 'meta.lang-attribute',
      title: '<html lang="..."> Attribut fehlt',
      severity: 'medium',
      passed: /<html[^>]*\slang=/i.test(full),
    },
  ]
}
