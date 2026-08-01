import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const isPrivateIPv4 = (ip: string) => {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true
  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true // link-local incl. cloud metadata (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 0) return true
  return false
}

const isPrivateIPv6 = (ip: string) => {
  const normalized = ip.toLowerCase()
  if (normalized === '::1') return true // loopback
  if (normalized.startsWith('fe80:')) return true // link-local
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true // unique local
  if (normalized.startsWith('::ffff:')) {
    // IPv4-mapped IPv6 — check the embedded IPv4 address too.
    const mapped = normalized.split(':').pop() || ''
    if (isIP(mapped) === 4) return isPrivateIPv4(mapped)
  }
  return false
}

const isPrivateIp = (ip: string) => {
  const version = isIP(ip)
  if (version === 4) return isPrivateIPv4(ip)
  if (version === 6) return isPrivateIPv6(ip)
  return true // unknown shape — refuse rather than guess
}

/**
 * Guards against SSRF when fetching an admin-supplied image URL server-side:
 * only plain https URLs to a hostname that resolves to a public IP. Resolves
 * DNS itself (rather than trusting the URL's hostname) so a DNS-rebinding
 * hostname pointing at an internal IP is still caught.
 */
export async function isSafeExternalUrl(
  rawUrl: string,
): Promise<{ safe: true } | { safe: false; reason: string }> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { safe: false, reason: 'Malformed URL.' }
  }

  if (url.protocol !== 'https:') {
    return { safe: false, reason: 'Only https:// URLs are allowed.' }
  }
  if (url.username || url.password) {
    return { safe: false, reason: 'URLs with embedded credentials are not allowed.' }
  }

  const hostname = url.hostname
  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      return { safe: false, reason: 'That address is not reachable.' }
    }
    return { safe: true }
  }

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return { safe: false, reason: 'That address is not reachable.' }
  }

  try {
    const records = await lookup(hostname, { all: true })
    if (!records.length) {
      return { safe: false, reason: 'Could not resolve that hostname.' }
    }
    if (records.some((record) => isPrivateIp(record.address))) {
      return { safe: false, reason: 'That address is not reachable.' }
    }
    return { safe: true }
  } catch {
    return { safe: false, reason: 'Could not resolve that hostname.' }
  }
}
