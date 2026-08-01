import {
  OAUTH_ISSUER,
  OAUTH_AUTHORIZE_PATH,
  OAUTH_TOKEN_PATH,
  OAUTH_REGISTER_PATH,
} from '@/lib/mcp/oauth-config'

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({
    issuer: OAUTH_ISSUER,
    authorization_endpoint: `${OAUTH_ISSUER}${OAUTH_AUTHORIZE_PATH}`,
    token_endpoint: `${OAUTH_ISSUER}${OAUTH_TOKEN_PATH}`,
    registration_endpoint: `${OAUTH_ISSUER}${OAUTH_REGISTER_PATH}`,
    scopes_supported: ['mcp'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
  })
}
