// Group C — schema.org / JSON-LD coverage. Validity is checked block-by-block;
// the remaining matches run against the concatenated raw string for resilience.
export function runJsonLdChecks({ jsonLdBlocks, jsonLdJoined }) {
  const blocks = jsonLdBlocks || []
  const jl = jsonLdJoined || ''

  let validity = true
  if (blocks.length > 0) {
    validity = blocks.some((b) => {
      try { JSON.parse(b); return true } catch { return false }
    })
  }

  return [
    {
      id: 'jsonld.valid',
      title: 'JSON-LD: ungültiges JSON',
      severity: 'high',
      passed: validity,
    },
    {
      id: 'jsonld.organization',
      title: 'JSON-LD: kein LocalBusiness/Organization',
      severity: 'high',
      passed: /"@type"\s*:\s*"?(LocalBusiness|Organization)/i.test(jl),
    },
    {
      id: 'jsonld.faqpage',
      title: 'JSON-LD: kein FAQPage-Schema',
      severity: 'medium',
      passed: jl.includes('FAQPage'),
    },
    {
      id: 'jsonld.sameas',
      title: 'JSON-LD: kein sameAs mit externen URLs',
      severity: 'medium',
      passed: /"sameAs"/.test(jl) && /https?:\/\//.test(jl),
    },
    {
      id: 'jsonld.openinghours',
      title: 'JSON-LD: keine Öffnungszeiten',
      severity: 'medium',
      passed: jl.includes('openingHours'),
    },
    {
      id: 'jsonld.breadcrumb',
      title: 'JSON-LD: keine BreadcrumbList',
      severity: 'low',
      passed: jl.includes('BreadcrumbList'),
    },
    {
      id: 'jsonld.website',
      title: 'JSON-LD: kein WebSite-Schema',
      severity: 'low',
      passed: /"@type"\s*:\s*"?WebSite/.test(jl),
    },
    {
      id: 'jsonld.address',
      title: 'JSON-LD: keine PostalAddress',
      severity: 'medium',
      passed: jl.includes('PostalAddress'),
    },
    {
      id: 'jsonld.telephone',
      title: 'JSON-LD: keine Telefonnummer im Schema',
      severity: 'low',
      passed: /"telephone"/.test(jl),
    },
    {
      id: 'jsonld.service-product',
      title: 'JSON-LD: kein Service- oder Product-Schema',
      severity: 'low',
      passed: /"@type"\s*:\s*"?(Service|Product)/i.test(jl),
    },
    {
      id: 'jsonld.article',
      title: 'JSON-LD: kein Article/BlogPosting-Schema',
      severity: 'low',
      passed: /"@type"\s*:\s*"?(Article|BlogPosting)/i.test(jl),
    },
  ]
}
