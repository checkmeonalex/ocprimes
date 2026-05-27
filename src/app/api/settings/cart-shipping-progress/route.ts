import type { NextRequest } from 'next/server'
import { jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import {
  CART_SHIPPING_PROGRESS_DEFAULTS,
  normalizeCartShippingProgressConfig,
} from '@/lib/cart/shipping-progress-config'

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)

  const { data, error } = await supabase
    .from('cart_shipping_progress_settings')
    .select('enabled, standard_free_shipping_threshold, express_free_shipping_threshold')
    .eq('id', 1)
    .maybeSingle()

  const config = error || !data
    ? normalizeCartShippingProgressConfig(CART_SHIPPING_PROGRESS_DEFAULTS)
    : normalizeCartShippingProgressConfig({
        enabled: data.enabled,
        standardFreeShippingThreshold: data.standard_free_shipping_threshold,
        expressFreeShippingThreshold: data.express_free_shipping_threshold,
      })

  const response = jsonOk(config)
  applyCookies(response)
  return response
}
