// Extracts user-facing siteData from the analyze context for the three generators.
// Every field is optional; generators fall back to German `[Bitte ergänzen: ...]` placeholders.

// Kept in sync with checks/ai-bots.js. Order matters — used as canonical
// ordering for generated robots.txt.
export const AI_BOTS = [
  'GPTBot', 'ClaudeBot', 'OAI-SearchBot', 'PerplexityBot', 'Bingbot',
  'Google-Extended', 'GoogleOther', 'Applebot-Extended', 'Meta-ExternalAgent',
  'CCBot', 'Bytespider', 'DuckAssistBot', 'ChatGPT-User',
]

const SEPARATORS = /\s+[–|—\-·•|]\s+/
const PLACEHOLDER_EMAILS = new Set([
  'name@example.com', 'test@test.de', 'test@example.com',
  'mail@example.com', 'info@example.com',
])
const PLACEHOLDER_PHONES = new Set(['+49 0', '+49000', '0000000', '1234567'])

function cleanTitle(title) {
  if (!title) return null
  const parts = title.split(SEPARATORS).map((s) => s.trim()).filter(Boolean)
  if (!parts.length) return null
  const longest = parts.reduce((a, b) => (a.length >= b.length ? a : b))
  return longest.length >= 3 ? longest : null
}

function decodeEntities(s) {
  if (!s) return s
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

function metaContent(headHtml, attr, value) {
  const re = new RegExp(
    `<meta[^>]*${attr}=["']${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*content=["']([^"']*)["']`,
    'i'
  )
  const m = headHtml.match(re)
  if (m) return decodeEntities(m[1].trim())
  // Try attribute order swapped.
  const re2 = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`,
    'i'
  )
  const m2 = headHtml.match(re2)
  return m2 ? decodeEntities(m2[1].trim()) : null
}

function linkHref(headHtml, rel) {
  const re = new RegExp(`<link[^>]*rel=["']${rel}["'][^>]*href=["']([^"']+)["']`, 'i')
  const m = headHtml.match(re)
  if (m) return m[1].trim()
  const re2 = new RegExp(`<link[^>]*href=["']([^"']+)["'][^>]*rel=["']${rel}["']`, 'i')
  const m2 = headHtml.match(re2)
  return m2 ? m2[1].trim() : null
}

function parseJsonLdBlocks(blocks) {
  const parsed = []
  for (const block of blocks || []) {
    try {
      const v = JSON.parse(block)
      if (Array.isArray(v)) parsed.push(...v)
      else parsed.push(v)
    } catch {
      // skip malformed
    }
  }
  // Flatten @graph members so consumers can iterate flat list.
  const flat = []
  for (const node of parsed) {
    if (node && typeof node === 'object' && Array.isArray(node['@graph'])) {
      flat.push(...node['@graph'])
    } else if (node) {
      flat.push(node)
    }
  }
  return flat
}

function pickType(node) {
  const t = node?.['@type']
  if (Array.isArray(t)) return t[0]
  return t
}

function findNode(nodes, types) {
  const set = new Set(types)
  return nodes.find((n) => set.has(pickType(n))) || null
}

function firstEmail(html) {
  const m = (html || '').match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i)
  if (!m) return null
  const email = m[1].toLowerCase()
  return PLACEHOLDER_EMAILS.has(email) ? null : email
}

function firstPhone(html) {
  const m = (html || '').match(/tel:(\+?[0-9 \-()]{6,})/i)
  if (!m) return null
  const phone = m[1].trim()
  return PLACEHOLDER_PHONES.has(phone) ? null : phone
}

function detectExistingAiBots(robotsTxt) {
  if (!robotsTxt) return []
  return AI_BOTS.filter((bot) => robotsTxt.includes(bot))
}

export function extractSiteData(context) {
  const { headHtml = '', html = '', jsonLdBlocks = [], robotsTxt = '', llmsTxt = '', baseUrl = '' } = context
  const nodes = parseJsonLdBlocks(jsonLdBlocks)
  const org = findNode(nodes, ['Organization', 'LocalBusiness', 'Corporation', 'NewsMediaOrganization'])
  const website = findNode(nodes, ['WebSite'])

  const ogSiteName = metaContent(headHtml, 'property', 'og:site_name')
  const ogTitle = metaContent(headHtml, 'property', 'og:title')
  const ogDesc = metaContent(headHtml, 'property', 'og:description')
  const ogLocale = metaContent(headHtml, 'property', 'og:locale')
  const metaDesc = metaContent(headHtml, 'name', 'description')

  const titleRaw = (headHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim()
  const titleClean = cleanTitle(decodeEntities(titleRaw))

  const langMatch = html.match(/<html[^>]*\slang=["']([^"']+)["']/i)
  const language = (langMatch?.[1] || ogLocale || 'de').split(/[-_]/)[0].toLowerCase()

  const canonical = linkHref(headHtml, 'canonical')
  const url = canonical || baseUrl || ''
  const hostname = (() => {
    try { return new URL(url).hostname } catch { return '' }
  })()

  const name =
    ogSiteName ||
    (typeof org?.name === 'string' ? org.name : null) ||
    (typeof website?.name === 'string' ? website.name : null) ||
    titleClean ||
    hostname ||
    null

  const description =
    metaDesc ||
    ogDesc ||
    (typeof org?.description === 'string' ? org.description : null) ||
    null

  const email = firstEmail(html) || (typeof org?.email === 'string' ? org.email : null) || null

  const phone =
    firstPhone(html) ||
    (typeof org?.telephone === 'string' ? org.telephone : null) ||
    null

  let address = null
  const addrRaw = org?.address
  if (addrRaw && typeof addrRaw === 'object') {
    address = {
      streetAddress: addrRaw.streetAddress || null,
      postalCode: addrRaw.postalCode || null,
      addressLocality: addrRaw.addressLocality || null,
      addressCountry: addrRaw.addressCountry || null,
    }
  }

  let sameAs = []
  if (Array.isArray(org?.sameAs)) {
    sameAs = org.sameAs.filter((s) => typeof s === 'string' && /^https?:\/\//.test(s))
  }

  return {
    name,
    description,
    url,
    language,
    hostname,
    email,
    phone,
    address,
    sameAs,
    existingRobots: robotsTxt || '',
    existingAiBots: detectExistingAiBots(robotsTxt),
    hasLlmsTxt: Boolean(llmsTxt && llmsTxt.length > 0),
    hasOrgJsonLd: Boolean(org),
  }
}
