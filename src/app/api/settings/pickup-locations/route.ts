import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { readPickupLocations } from '@/lib/logistics/pickup'

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  try {
    const locations = await readPickupLocations(supabase, { activeOnly: true })
    const response = jsonOk({ locations })
    applyCookies(response)
    return response
  } catch (error) {
    const response = jsonError(
      error instanceof Error ? error.message : 'Unable to load pickup locations.',
      500,
    )
    applyCookies(response)
    return response
  }
}
