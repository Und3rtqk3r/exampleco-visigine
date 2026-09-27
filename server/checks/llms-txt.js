// Group B — llms.txt presence, structure, and accessibility.
export async function runLlmsChecks({ baseUrl, llmsTxt, llmsStatus, robotsTxt, fetchPage }) {
  const ll = llmsTxt || ''
  const rb = robotsTxt || ''
  const present = (llmsStatus === 200) && ll.length > 0

  const results = [
    {
      id: 'llms.present',
      title: 'llms.txt fehlt',
      severity: 'high',
      passed: present,
    },
    {
      id: 'llms.structured',
      title: 'llms.txt: keine strukturierten Metadaten',
      severity: 'high',
      passed: /^[-*]\s*\w+:/m.test(ll),
    },
    {
      id: 'llms.substantial',
      title: 'llms.txt zu kurz (unter 500 Zeichen)',
      severity: 'medium',
      passed: ll.length >= 500,
    },
    {
      id: 'llms.not-disallowed',
      title: 'llms.txt ist in robots.txt blockiert',
      severity: 'high',
      passed: !/Disallow:\s*\/llms\.txt/i.test(rb),
    },
  ]

  // llms-full.txt is fetched lazily; only report fail when the base file is reachable.
  let fullPassed = false
  try {
    const full = await fetchPage(`${baseUrl}/llms-full.txt`)
    fullPassed = full.status === 200 && (full.body || '').length > 0
  } catch {
    fullPassed = false
  }
  results.push({
    id: 'llms.full-version',
    title: 'llms-full.txt fehlt (erweiterte Version)',
    severity: 'low',
    passed: fullPassed,
  })

  return results
}
