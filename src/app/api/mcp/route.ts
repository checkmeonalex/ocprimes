import type { NextRequest } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createOcprimesMcpServer } from '@/lib/mcp/server'
import { isMcpAdminRequest } from '@/lib/auth/mcp-token'
import { verifyOAuthAccessToken } from '@/lib/mcp/verify-oauth-token'
import { OAUTH_ISSUER } from '@/lib/mcp/oauth-config'

const safeCompare = (a: string, b: string) => {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * Query-param token fallback, only for /api/mcp. Exists solely because some
 * MCP clients (e.g. Qwen desktop, as of QwenLM/Qwen-Agent#681) silently drop
 * custom headers on streamable-http/SSE connections, so a client-supplied
 * Authorization header never reaches the server. This uses a SEPARATE token
 * (MCP_URL_TOKEN) from MCP_ADMIN_API_TOKEN so a URL leaking it (server logs,
 * browser history, proxies) doesn't expose the header-based credential used
 * by Claude Code/claude.ai. Only checked when no header auth is present.
 */
const isValidUrlToken = (request: NextRequest): boolean => {
  const secret = process.env.MCP_URL_TOKEN
  if (!secret) return false
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return false
  return safeCompare(token, secret)
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const unauthorized = () =>
  new Response(JSON.stringify({ error: 'Unauthorized.' }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': `Bearer resource_metadata="${OAUTH_ISSUER}/.well-known/oauth-protected-resource"`,
    },
  })

async function isAuthorized(request: NextRequest): Promise<boolean> {
  if (isMcpAdminRequest(request)) return true

  const header = request.headers.get('authorization') || ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  if (match) {
    const verified = await verifyOAuthAccessToken(match[1])
    if (verified) return true
  }

  return isValidUrlToken(request)
}

async function handle(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return unauthorized()
  }

  const server = createOcprimesMcpServer()
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: each request is independent (serverless-safe)
  })

  await server.connect(transport)
  return transport.handleRequest(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function DELETE(request: NextRequest) {
  return handle(request)
}
