import type { NextRequest } from 'next/server'
import { jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import {
  normalizeOrderProtectionConfig,
  ORDER_PROTECTION_DEFAULTS,
} from '@/lib/order-protection/config'

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)

  const { data, error } = await supabase
    .from('order_protection_settings')
    .select('protection_percentage, minimum_fee, maximum_fee, claim_window_hours')
    .eq('id', 1)
    .maybeSingle()

  if (error || !data) {
    const fallback = normalizeOrderProtectionConfig(ORDER_PROTECTION_DEFAULTS)
    const response = jsonOk(fallback)
    applyCookies(response)
    return response
  }

  const config = normalizeOrderProtectionConfig({
    percentage: data.protection_percentage,
    minimumFee: data.minimum_fee,
    maximumFee: data.maximum_fee,
    claimWindowHours: data.claim_window_hours,
  })

  const response = jsonOk(config)
  applyCookies(response)
  return response
}
