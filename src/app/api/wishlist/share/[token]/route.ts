import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { token } = await context.params
  if (!token) {
    return jsonError('Missing share token.', 400)
  }

  const { data, error } = await supabase.rpc('get_shared_wishlist', { p_token: token })
  if (error || !data) {
    console.error('Wishlist share fetch failed:', error?.message)
    return jsonError('Shared wishlist not found.', 404)
  }

  const response = jsonOk({ data })
  applyCookies(response)
  return response
}
