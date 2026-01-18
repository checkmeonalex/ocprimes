import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { error } = await supabase.auth.signOut()

  if (error) {
    return jsonError('Unable to sign out.', 500)
  }

  const response = jsonOk({ success: true })
  applyCookies(response)
  return response
}
