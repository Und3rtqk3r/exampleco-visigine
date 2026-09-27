// Group A — AI bots referenced in robots.txt. Substring match is intentional:
// canonical bot tokens are case-sensitive and stable.
const BOTS = [
  { id: 'ai-bots.gptbot',             token: 'GPTBot',             severity: 'high',   title: 'GPTBot nicht in robots.txt' },
  { id: 'ai-bots.claudebot',          token: 'ClaudeBot',          severity: 'high',   title: 'ClaudeBot nicht in robots.txt' },
  { id: 'ai-bots.oai-searchbot',      token: 'OAI-SearchBot',      severity: 'high',   title: 'OAI-SearchBot nicht in robots.txt' },
  { id: 'ai-bots.perplexitybot',      token: 'PerplexityBot',      severity: 'high',   title: 'PerplexityBot nicht in robots.txt' },
  { id: 'ai-bots.bingbot',            token: 'Bingbot',            severity: 'high',   title: 'Bingbot nicht in robots.txt' },
  { id: 'ai-bots.google-extended',    token: 'Google-Extended',    severity: 'medium', title: 'Google-Extended nicht in robots.txt' },
  { id: 'ai-bots.googleother',        token: 'GoogleOther',        severity: 'medium', title: 'GoogleOther nicht in robots.txt' },
  { id: 'ai-bots.applebot-extended',  token: 'Applebot-Extended',  severity: 'medium', title: 'Applebot-Extended nicht in robots.txt' },
  { id: 'ai-bots.meta-externalagent', token: 'Meta-ExternalAgent', severity: 'medium', title: 'Meta-ExternalAgent nicht in robots.txt' },
  { id: 'ai-bots.ccbot',              token: 'CCBot',              severity: 'medium', title: 'CCBot (Common Crawl) nicht in robots.txt' },
  { id: 'ai-bots.bytespider',         token: 'Bytespider',         severity: 'low',    title: 'Bytespider nicht in robots.txt' },
  { id: 'ai-bots.duckassistbot',      token: 'DuckAssistBot',      severity: 'low',    title: 'DuckAssistBot nicht in robots.txt' },
  { id: 'ai-bots.chatgpt-user',       token: 'ChatGPT-User',       severity: 'low',    title: 'ChatGPT-User nicht in robots.txt' },
]

export function runAiBotsChecks({ robotsTxt }) {
  const rb = robotsTxt || ''
  return BOTS.map(({ id, token, severity, title }) => ({
    id,
    title,
    severity,
    passed: rb.includes(token),
  }))
}
