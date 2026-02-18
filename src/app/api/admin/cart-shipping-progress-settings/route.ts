import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  cartShippingProgressConfigSchema,
  CART_SHIPPING_PROGRESS_DEFAULTS,
  normalizeCartShippingProgressConfig,
} from '@/lib/cart/shipping-progress-config'

export async function GET(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

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

export async function PATCH(request: NextRequest) {
  const { supabase, applyCookies, user, isAdmin } = await requireAdmin(request)
  if (!isAdmin || !user) {
    return jsonError('Forbidden.', 403)
  }

  const body = await request.json().catch(() => null)
  const parsed = cartShippingProgressConfigSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid payload.', 400)
  }

  const normalized = normalizeCartShippingProgressConfig(parsed.data)
  const { data, error } = await supabase
    .from('cart_shipping_progress_settings')
    .upsert(
      {
        id: 1,
        enabled: normalized.enabled,
        standard_free_shipping_threshold: normalized.standardFreeShippingThreshold,
        express_free_shipping_threshold: normalized.expressFreeShippingThreshold,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: 'id' },
    )
    .select('enabled, standard_free_shipping_threshold, express_free_shipping_threshold')
    .single()

  if (error || !data) {
    return jsonError('Unable to save cart shipping progress settings.', 500)
  }

  const response = jsonOk(
    normalizeCartShippingProgressConfig({
      enabled: data.enabled,
      standardFreeShippingThreshold: data.standard_free_shipping_threshold,
      expressFreeShippingThreshold: data.express_free_shipping_threshold,
    }),
  )
  applyCookies(response)
  return response
}
