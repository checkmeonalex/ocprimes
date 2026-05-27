import type { NextRequest } from 'next/server'
import { jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { readExchangeRatesPayload } from '@/lib/i18n/exchange-rate-service'

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const payload = await readExchangeRatesPayload(supabase)
  const response = jsonOk(payload)
  applyCookies(response)
  return response
}
