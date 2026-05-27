import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { getNowIso } from '@/lib/time/virtual-now'

export async function POST(request: NextRequest) {
  try {
    const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
    const { data: auth, error: authError } = await supabase.auth.getUser()

    if (authError || !auth.user?.id) {
      return jsonError('Unauthorized.', 401)
    }

    const nowIso = getNowIso()
    const { error } = await supabase.from('user_presence').upsert(
      {
        user_id: auth.user.id,
        last_seen_at: nowIso,
      },
      {
        onConflict: 'user_id',
      },
    )

    if (error) {
      return jsonError('Unable to update presence.', 500)
    }

    const response = jsonOk({ ok: true, lastSeenAt: nowIso })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('user presence post failed:', error)
    return jsonError('Presence service unavailable.', 503)
  }
}
