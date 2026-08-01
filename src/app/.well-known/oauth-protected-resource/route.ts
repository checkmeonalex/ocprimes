import { OAUTH_ISSUER, MCP_RESOURCE_PATH } from '@/lib/mcp/oauth-config'

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({
    resource: `${OAUTH_ISSUER}${MCP_RESOURCE_PATH}`,
    authorization_servers: [OAUTH_ISSUER],
    scopes_supported: ['mcp'],
  })
}
