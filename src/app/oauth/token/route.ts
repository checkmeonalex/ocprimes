import type { NextRequest } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from '@/lib/mcp/oauth-config'

export const dynamic = 'force-dynamic'

const oauthError = (error: string, description?: string, status = 400) =>
  Response.json({ error, error_description: description }, { status })

const base64url = (input: Buffer) => input.toString('base64url')

const verifyPkce = (codeVerifier: string, codeChallenge: string) => {
  const computed = base64url(createHash('sha256').update(codeVerifier).digest())
  return computed === codeChallenge
}

const issueTokenSet = async (
  db: ReturnType<typeof createAdminSupabaseClient>,
  clientId: string,
  userId: string,
  scopes: string[],
  resource: string | null,
) => {
  const accessToken = `mcpat_${randomBytes(32).toString('base64url')}`
  const refreshToken = `mcprt_${randomBytes(32).toString('base64url')}`
  const now = Date.now()

  const { error } = await db.from('mcp_oauth_tokens').insert({
    access_token: accessToken,
    refresh_token: refreshToken,
    client_id: clientId,
    user_id: userId,
    scopes,
    resource,
    expires_at: new Date(now + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString(),
  })
  if (error) throw error

  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    scope: scopes.join(' ') || undefined,
  }
}

export async function POST(request: NextRequest) {
  let params: URLSearchParams
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/x-www-form-urlencoded')) {
    params = new URLSearchParams(await request.text())
  } else {
    return oauthError('invalid_request', 'Content-Type must be application/x-www-form-urlencoded')
  }

  const grantType = params.get('grant_type') || ''
  const db = createAdminSupabaseClient()

  if (grantType === 'authorization_code') {
    const code = params.get('code') || ''
    const codeVerifier = params.get('code_verifier') || ''
    const redirectUri = params.get('redirect_uri') || ''
    const clientId = params.get('client_id') || ''

    if (!code || !codeVerifier || !redirectUri || !clientId) {
      return oauthError('invalid_request')
    }

    const { data: authCode, error } = await db
      .from('mcp_oauth_codes')
      .select('*')
      .eq('code', code)
      .maybeSingle()

    if (error || !authCode) {
      return oauthError('invalid_grant', 'Unknown or already-used code.')
    }

    await db.from('mcp_oauth_codes').delete().eq('code', code)

    if (
      authCode.client_id !== clientId ||
      authCode.redirect_uri !== redirectUri ||
      new Date(authCode.expires_at).getTime() < Date.now()
    ) {
      return oauthError('invalid_grant')
    }

    if (!verifyPkce(codeVerifier, authCode.code_challenge)) {
      return oauthError('invalid_grant', 'PKCE verification failed.')
    }

    try {
      const tokenSet = await issueTokenSet(
        db,
        authCode.client_id,
        authCode.user_id,
        authCode.scopes || [],
        authCode.resource,
      )
      return Response.json(tokenSet)
    } catch (issueError) {
      console.error('mcp oauth token issue failed:', issueError)
      return oauthError('server_error', undefined, 500)
    }
  }

  if (grantType === 'refresh_token') {
    const refreshToken = params.get('refresh_token') || ''
    if (!refreshToken) return oauthError('invalid_request')

    const { data: existing, error } = await db
      .from('mcp_oauth_tokens')
      .select('*')
      .eq('refresh_token', refreshToken)
      .is('revoked_at', null)
      .maybeSingle()

    if (error || !existing) {
      return oauthError('invalid_grant', 'Unknown or revoked refresh token.')
    }

    await db.from('mcp_oauth_tokens').update({ revoked_at: new Date().toISOString() }).eq('access_token', existing.access_token)

    try {
      const tokenSet = await issueTokenSet(
        db,
        existing.client_id,
        existing.user_id,
        existing.scopes || [],
        existing.resource,
      )
      return Response.json(tokenSet)
    } catch (issueError) {
      console.error('mcp oauth token refresh failed:', issueError)
      return oauthError('server_error', undefined, 500)
    }
  }

  return oauthError('unsupported_grant_type')
}
