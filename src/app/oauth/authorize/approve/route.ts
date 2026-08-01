import type { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'
import { isValidCodeChallenge } from '@/lib/mcp/pkce'
import { AUTH_CODE_TTL_SECONDS } from '@/lib/mcp/oauth-config'

export const dynamic = 'force-dynamic'

const isSafeRedirectUri = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const clientId = String(form.get('client_id') || '')
  const redirectUri = String(form.get('redirect_uri') || '')
  const state = String(form.get('state') || '')
  const codeChallenge = String(form.get('code_challenge') || '')
  const resource = String(form.get('resource') || '')
  const scope = String(form.get('scope') || '')
  const decision = String(form.get('decision') || '')

  if (!clientId || !redirectUri || !isSafeRedirectUri(redirectUri) || !isValidCodeChallenge(codeChallenge)) {
    return new Response('Invalid request.', { status: 400 })
  }

  const db = createAdminSupabaseClient()
  const { data: client } = await db
    .from('mcp_oauth_clients')
    .select('client_id, redirect_uris')
    .eq('client_id', clientId)
    .maybeSingle()

  if (!client?.client_id || !Array.isArray(client.redirect_uris) || !client.redirect_uris.includes(redirectUri)) {
    return new Response('Unknown connector.', { status: 400 })
  }

  const deny = () => {
    const url = new URL(redirectUri)
    url.searchParams.set('error', 'access_denied')
    if (state) url.searchParams.set('state', state)
    return Response.redirect(url.toString(), 302)
  }

  if (decision !== 'allow') {
    return deny()
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  const user = error ? null : data?.user || null
  if (!user) {
    return new Response('Not signed in.', { status: 401 })
  }

  const roleInfo = await getUserRoleInfoSafe(supabase, user.id, user.email || '')
  if (!roleInfo.isAdmin) {
    return new Response('Forbidden.', { status: 403 })
  }

  const code = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000).toISOString()

  const { error: insertError } = await db.from('mcp_oauth_codes').insert({
    code,
    client_id: clientId,
    user_id: user.id,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    scopes: scope ? scope.split(' ').filter(Boolean) : [],
    resource: resource || null,
    expires_at: expiresAt,
  })

  if (insertError) {
    console.error('mcp oauth code issue failed:', insertError.message)
    return new Response('Server error.', { status: 500 })
  }

  const url = new URL(redirectUri)
  url.searchParams.set('code', code)
  if (state) url.searchParams.set('state', state)
  return Response.redirect(url.toString(), 302)
}
