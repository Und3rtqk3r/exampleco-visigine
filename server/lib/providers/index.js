// Registry. If a provider's API key is missing, fall back to mock but keep
// the original label (so the UI displays "openai (mock)" etc.).
import * as openai from './openai.js'
import * as perplexity from './perplexity.js'
import * as anthropic from './anthropic.js'
import * as mock from './mock.js'

function wrapAsMock(label) {
  return {
    query: async (prompt, opts) => {
      const r = await mock.query(prompt, opts)
      return { ...r, provider: `${label} (mock)` }
    },
  }
}

export function getProviders() {
  return {
    openai:     process.env.OPENAI_KEY     ? openai     : wrapAsMock('openai'),
    perplexity: process.env.PERPLEXITY_KEY ? perplexity : wrapAsMock('perplexity'),
    anthropic:  process.env.ANTHROPIC_KEY  ? anthropic  : wrapAsMock('anthropic'),
  }
}

// Returns labels for the UI: { openai: 'real' | 'mock', ... }.
export function getProviderModes() {
  return {
    openai:     process.env.OPENAI_KEY     ? 'real' : 'mock',
    perplexity: process.env.PERPLEXITY_KEY ? 'real' : 'mock',
    anthropic:  process.env.ANTHROPIC_KEY  ? 'real' : 'mock',
  }
}
