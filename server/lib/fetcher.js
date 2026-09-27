import { lookup } from 'node:dns/promises'
import net from 'node:net'

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// Blocks RFC 1918 private ranges, loopback, link-local, AWS metadata
// (169.254.0.0/16), multicast/reserved, and IPv6 equivalents.
function isPrivateOrLoopback(addr) {
  if (net.isIPv4(addr)) {
    const p = addr.split('.').map(Number)
    return (
      p[0] === 0 ||
      p[0] === 10 ||
      p[0] === 127 ||
      (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) ||
      p[0] >= 224
    )
  }
  if (net.isIPv6(addr)) {
    const a = addr.toLowerCase()
    return (
      a === '::' ||
      a === '::1' ||
      a.startsWith('fe80:') ||
      a.startsWith('fc') ||
      a.startsWith('fd') ||
      a.startsWith('::ffff:')
    )
  }
  return true
}

// Resolves hostname; throws { code: 'PRIVATE_HOST_BLOCKED' | 'ENOTFOUND' }.
// Skipped entirely when ALLOW_PRIVATE_HOSTS=1 (local dev).
async function assertPublicHost(hostname) {
  if (process.env.ALLOW_PRIVATE_HOSTS === '1') return
  let address
  try {
    ({ address } = await lookup(hostname))
  } catch (err) {
    const e = new Error('ENOTFOUND')
    e.code = 'ENOTFOUND'
    e.cause = err
    throw e
  }
  if (isPrivateOrLoopback(address)) {
    const e = new Error('PRIVATE_HOST_BLOCKED')
    e.code = 'PRIVATE_HOST_BLOCKED'
    throw e
  }
}

// Returns { status, headers, body, finalUrl, ms, error? } — never throws.
// `error` is a string code: 'PRIVATE_HOST_BLOCKED' | 'ENOTFOUND' | 'TIMEOUT' | 'TLS_INVALID' | 'NETWORK'.
export async function fetchPage(url, { userAgent, timeoutMs = 10000 } = {}) {
  const started = Date.now()
  let hostname
  try {
    hostname = new URL(url).hostname
  } catch {
    return { status: 0, headers: {}, body: '', finalUrl: url, ms: 0, error: 'INVALID_URL' }
  }

  try {
    await assertPublicHost(hostname)
  } catch (err) {
    return {
      status: 0,
      headers: {},
      body: '',
      finalUrl: url,
      ms: Date.now() - started,
      error: err.code || 'NETWORK',
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent || DEFAULT_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
    })
    const body = await res.text()
    const headers = {}
    res.headers.forEach((value, key) => { headers[key.toLowerCase()] = value })
    return {
      status: res.status,
      headers,
      body,
      finalUrl: res.url || url,
      ms: Date.now() - started,
    }
  } catch (err) {
    const causeCode = err?.cause?.code
    const causeMessage = err?.cause?.message || ''
    const TLS_CODES = new Set([
      'ERR_TLS_CERT_ALTNAME_INVALID',
      'CERT_HAS_EXPIRED',
      'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      'SELF_SIGNED_CERT_IN_CHAIN',
      'DEPTH_ZERO_SELF_SIGNED_CERT',
      'ERR_SSL_WRONG_VERSION_NUMBER',
    ])
    let code = 'NETWORK'
    if (err?.name === 'AbortError') code = 'TIMEOUT'
    else if (TLS_CODES.has(causeCode) || /certificate|altnames|self.?signed|TLS|SSL/i.test(causeMessage)) code = 'SSL_INVALID'
    else if (causeCode === 'ENOTFOUND' || causeCode === 'EAI_AGAIN') code = 'ENOTFOUND'
    else if (causeCode === 'ETIMEDOUT') code = 'TIMEOUT'
    return {
      status: 0,
      headers: {},
      body: '',
      finalUrl: url,
      ms: Date.now() - started,
      error: code,
    }
  } finally {
    clearTimeout(timer)
  }
}
