// Generates a JSON-LD skeleton: Organization (or LocalBusiness if address/phone),
// WebSite, and FAQPage — three highest-impact AI signals.

const ph = (s) => `[Bitte ergänzen: ${s}]`

function buildOrganizationNode(siteData) {
  const { name, url, description, email, phone, address, sameAs = [] } = siteData
  const useLocalBusiness = Boolean(address || phone)

  const node = {
    '@type': useLocalBusiness ? 'LocalBusiness' : 'Organization',
    '@id': `${(url || ph('https://deine-domain.de')).replace(/\/+$/, '')}/#organization`,
    name: name || ph('Name deines Unternehmens'),
    url: url || ph('https://deine-domain.de'),
    description: description || ph('Ein-Satz-Beschreibung'),
  }

  if (email) node.email = email
  if (phone) node.telephone = phone

  node.address = {
    '@type': 'PostalAddress',
    addressCountry: address?.addressCountry || ph('DE/AT/CH'),
    addressLocality: address?.addressLocality || ph('Stadt'),
    postalCode: address?.postalCode || ph('PLZ'),
    streetAddress: address?.streetAddress || ph('Straße + Nr.'),
  }

  node.sameAs = sameAs.length > 0 ? sameAs : [ph('https://www.linkedin.com/company/...')]

  return node
}

function buildWebSiteNode(siteData) {
  const { name, url, language = 'de' } = siteData
  return {
    '@type': 'WebSite',
    '@id': `${(url || ph('https://deine-domain.de')).replace(/\/+$/, '')}/#website`,
    url: url || ph('https://deine-domain.de'),
    name: name || ph('Name deines Unternehmens'),
    inLanguage: `${language}-DE`,
    publisher: { '@id': `${(url || ph('https://deine-domain.de')).replace(/\/+$/, '')}/#organization` },
  }
}

function buildFaqNode() {
  return {
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: ph('häufige Frage'),
        acceptedAnswer: { '@type': 'Answer', text: ph('1-2 Sätze') },
      },
      {
        '@type': 'Question',
        name: ph('weitere Frage'),
        acceptedAnswer: { '@type': 'Answer', text: ph('1-2 Sätze') },
      },
    ],
  }
}

export function generateJsonLd(siteData) {
  const payload = {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationNode(siteData),
      buildWebSiteNode(siteData),
      buildFaqNode(),
    ],
  }
  const pretty = JSON.stringify(payload, null, 2)
  const content = `<script type="application/ld+json">\n${pretty}\n</script>\n`
  return {
    content,
    mode: siteData.hasOrgJsonLd ? 'enhance' : 'new',
  }
}
