import { extractSiteData } from './extract.js'
import { generateLlmsTxt } from './llms-txt.js'
import { generateRobotsTxt } from './robots-txt.js'
import { generateJsonLd } from './json-ld.js'
import { buildReadme } from './readme.js'

// Returns an autofix bundle. `_siteData` is included for debug-mode payloads;
// analyze.js strips it from the public response.
export function generateAutofix(context) {
  const siteData = extractSiteData(context)
  return {
    llmsTxt: generateLlmsTxt(siteData),
    robotsTxt: generateRobotsTxt(siteData),
    jsonLd: generateJsonLd(siteData),
    _siteData: siteData,
  }
}

export { buildReadme, extractSiteData }
