import { supabase } from './supabase'

const baseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '')

if (!baseUrl) {
  throw new Error('Missing EXPO_PUBLIC_API_BASE_URL.')
}

// Every dashboard REST call goes through the SAME /api/admin/* routes the
// web app and the existing Alxora Workplace app use — auth is a real
// Supabase access token as a Bearer header, verified server-side via
// requireDashboardUser's mobile-app path (supabase.auth.getUser(token)).
// vendor_id/ownership scoping is enforced entirely server-side, same as
// the web dashboard — this client never needs to know or send it.
export async function apiRequest<T = any>(
  path: string,
  { method = 'GET', body }: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  if (!accessToken) throw new Error('Not signed in.')

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  let payload: any
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = { raw: text }
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with status ${response.status}`)
  }
  return payload
}
