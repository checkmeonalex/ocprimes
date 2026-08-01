import type { NextRequest } from 'next/server'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createOcprimesMcpServer } from '@/lib/mcp/server'
import { isMcpAdminRequest } from '@/lib/auth/mcp-token'
import { verifyOAuthAccessToken } from '@/lib/mcp/verify-oauth-token'
import { OAUTH_ISSUER } from '@/lib/mcp/oauth-config'

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
  if (!match) return false

  const verified = await verifyOAuthAccessToken(match[1])
  return Boolean(verified)
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
