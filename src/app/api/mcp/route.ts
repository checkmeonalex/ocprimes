import type { NextRequest } from 'next/server'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createOcprimesMcpServer } from '@/lib/mcp/server'
import { isMcpAdminRequest } from '@/lib/auth/mcp-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const unauthorized = () =>
  new Response(JSON.stringify({ error: 'Unauthorized.' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })

async function handle(request: NextRequest) {
  if (!isMcpAdminRequest(request)) {
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
