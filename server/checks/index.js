// Orchestrates all check groups. Async groups run in parallel; sync groups append.
import { runAiBotsChecks } from './ai-bots.js'
import { runLlmsChecks } from './llms-txt.js'
import { runJsonLdChecks } from './json-ld.js'
import { runMetaChecks } from './meta-tags.js'
import { runTechnicalChecks } from './technical.js'
import { runAiReachabilityChecks } from './ai-reachability.js'

export async function runAllChecks(context) {
  const [llms, technical, aiReach] = await Promise.all([
    runLlmsChecks(context),
    runTechnicalChecks(context),
    runAiReachabilityChecks(context),
  ])
  return [
    ...runAiBotsChecks(context),
    ...llms,
    ...runJsonLdChecks(context),
    ...runMetaChecks(context),
    ...technical,
    ...aiReach,
  ]
}
