const resolveIssuer = () => {
  const base = (
    process.env.MCP_OAUTH_ISSUER ||
    process.env.MCP_SELF_BASE_URL ||
    process.env.APP_BASE_URL ||
    'http://localhost:3000'
  ).replace(/\/+$/, '')
  return base
}

export const OAUTH_ISSUER = resolveIssuer()
export const OAUTH_AUTHORIZE_PATH = '/oauth/authorize'
export const OAUTH_TOKEN_PATH = '/oauth/token'
export const OAUTH_REGISTER_PATH = '/oauth/register'
export const MCP_RESOURCE_PATH = '/api/mcp'

export const AUTH_CODE_TTL_SECONDS = 300 // 5 minutes
export const ACCESS_TOKEN_TTL_SECONDS = 3600 // 1 hour
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 180 // 180 days
