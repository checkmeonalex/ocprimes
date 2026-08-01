import { createAdminSupabaseClient } from '@/lib/supabase/admin'

/**
 * Verifies an OAuth-issued MCP access token (see /oauth/token). Distinct from
 * the static MCP_ADMIN_API_TOKEN bearer check in src/lib/auth/mcp-token.ts,
 * which is edge-safe and used by middleware; this one needs a DB lookup so it
 * only runs inside the /api/mcp route handler (Node runtime).
 */
export async function verifyOAuthAccessToken(token: string): Promise<{ userId: string } | null> {
  if (!token.startsWith('mcpat_')) return null

  const db = createAdminSupabaseClient()
  const { data, error } = await db
    .from('mcp_oauth_tokens')
    .select('user_id, expires_at, revoked_at')
    .eq('access_token', token)
    .maybeSingle()

  if (error || !data) return null
  if (data.revoked_at) return null
  if (new Date(data.expires_at).getTime() < Date.now()) return null

  return { userId: data.user_id }
}
