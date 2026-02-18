import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  normalizeOrderProtectionConfig,
  orderProtectionConfigSchema,
  ORDER_PROTECTION_DEFAULTS,
} from '@/lib/order-protection/config'

const toPersistedSettings = (config: {
  percentage: number
  minimumFee: number
  maximumFee: number
  claimWindowHours: number
}) => ({
  id: 1,
  protection_percentage: config.percentage,
  minimum_fee: config.minimumFee,
  maximum_fee: config.maximumFee,
  claim_window_hours: config.claimWindowHours,
})

export async function GET(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const { data, error } = await supabase
    .from('order_protection_settings')
    .select('protection_percentage, minimum_fee, maximum_fee, claim_window_hours')
    .eq('id', 1)
    .maybeSingle()

  if (error || !data) {
    const response = jsonOk(normalizeOrderProtectionConfig(ORDER_PROTECTION_DEFAULTS))
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

export async function PATCH(request: NextRequest) {
  const { supabase, applyCookies, user, isAdmin } = await requireAdmin(request)
  if (!isAdmin || !user) {
    return jsonError('Forbidden.', 403)
  }

  const body = await request.json().catch(() => null)
  const parsed = orderProtectionConfigSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid payload.', 400)
  }

  const config = normalizeOrderProtectionConfig(parsed.data)
  const { data, error } = await supabase
    .from('order_protection_settings')
    .upsert(
      {
        ...toPersistedSettings(config),
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: 'id' },
    )
    .select('protection_percentage, minimum_fee, maximum_fee, claim_window_hours')
    .single()

  if (error || !data) {
    return jsonError('Unable to save order protection settings.', 500)
  }

  const response = jsonOk(
    normalizeOrderProtectionConfig({
      percentage: data.protection_percentage,
      minimumFee: data.minimum_fee,
      maximumFee: data.maximum_fee,
      claimWindowHours: data.claim_window_hours,
    }),
  )
  applyCookies(response)
  return response
}
