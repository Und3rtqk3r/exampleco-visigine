// Group E — technical signals: sitemap, HSTS, viewport, H1.
export async function runTechnicalChecks({ baseUrl, html, headHtml, robotsTxt, responseHeaders, fetchPage }) {
  const rb = robotsTxt || ''
  const hh = headHtml || ''
  const full = html || ''
  const headers = responseHeaders || {}

  let sitemapReachable = false
  try {
    const sm = await fetchPage(`${baseUrl}/sitemap.xml`)
    const body = (sm.body || '').trimStart()
    sitemapReachable =
      sm.status === 200 &&
      (body.startsWith('<?xml') || body.startsWith('<urlset') || body.startsWith('<sitemapindex'))
  } catch {
    sitemapReachable = false
  }

  return [
    {
      id: 'tech.sitemap-referenced',
      title: 'Sitemap in robots.txt nicht referenziert',
      severity: 'low',
      passed: /sitemap:/i.test(rb),
    },
    {
      id: 'tech.sitemap-reachable',
      title: 'Sitemap.xml nicht erreichbar',
      severity: 'medium',
      passed: sitemapReachable,
    },
    {
      id: 'tech.hsts',
      title: 'HSTS-Header fehlt',
      severity: 'low',
      passed: Boolean(headers['strict-transport-security']),
    },
    {
      id: 'tech.viewport',
      title: 'Viewport-Meta-Tag fehlt (Mobile)',
      severity: 'medium',
      passed: /name=["']viewport["']/i.test(hh),
    },
    {
      id: 'tech.h1',
      title: 'H1-Überschrift fehlt',
      severity: 'medium',
      passed: /<h1[\s>]/i.test(full),
    },
  ]
}
