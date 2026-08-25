import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Short-lived, server-signed token that lets /api/mcp forward a SPECIFIC
 * verified caller's identity (resolved from their own mcpat_ OAuth token)
 * into the existing /api/admin/* REST routes, without minting a real
 * Supabase session per MCP call. Distinct from MCP_ADMIN_API_TOKEN (a
 * static shared secret that always grants synthetic admin) — this token is
 * minted fresh per request, is tied to one resolved user_id, and expires in
 * seconds. The signing secret (MCP_INTERNAL_SIGNING_SECRET) never leaves
 * the server and is never sent to the vendor or any external client.
 */
const TOKEN_TTL_MS = 30_000
const TOKEN_PREFIX = 'mcpuser_'

const getSecret = (): string | null => process.env.MCP_INTERNAL_SIGNING_SECRET || null

const sign = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest('base64url')

export function mintMcpUserToken(userId: string): string | null {
  const secret = getSecret()
  if (!secret || !userId) return null

  const expiresAt = Date.now() + TOKEN_TTL_MS
  const payload = `${userId}.${expiresAt}`
  const signature = sign(payload, secret)
  return `${TOKEN_PREFIX}${Buffer.from(payload).toString('base64url')}.${signature}`
}

export function verifyMcpUserToken(token: string): { userId: string } | null {
  const secret = getSecret()
  if (!secret || !token.startsWith(TOKEN_PREFIX)) return null

  const rest = token.slice(TOKEN_PREFIX.length)
  const separatorIndex = rest.lastIndexOf('.')
  if (separatorIndex < 0) return null

  const encodedPayload = rest.slice(0, separatorIndex)
  const signature = rest.slice(separatorIndex + 1)

  let payload: string
  try {
    payload = Buffer.from(encodedPayload, 'base64url').toString('utf8')
  } catch {
    return null
  }

  const expected = sign(payload, secret)
  const sigBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expected)
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null
  }

  const [userId, expiresAtRaw] = payload.split('.')
  const expiresAt = Number(expiresAtRaw)
  if (!userId || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return null

  return { userId }
}
