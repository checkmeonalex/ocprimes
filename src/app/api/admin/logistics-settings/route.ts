import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import {
  getDefaultEtaKeyForDeliveryType,
  getEtaPreset,
  type LogisticsEtaKey,
  LOGISTICS_ETA_PRESETS,
  logisticsRatesPatchSchema,
  normalizeEtaKey,
  normalizeLogisticsState,
  isValidNigerianCityForState,
} from '@/lib/logistics/config'
import {
  readLogisticsRatesByState,
  upsertLogisticsRatesForState,
} from '@/lib/logistics/repository'
import {
  pickupLocationsPatchSchema,
  readPickupLocations,
  upsertPickupLocations,
} from '@/lib/logistics/pickup'
import {
  DEFAULT_WORLDWIDE_ETA_KEY,
  normalizeWorldwideEtaKey,
  normalizeWorldwideFixedPriceUsd,
  readWorldwideLogisticsSettings,
  upsertWorldwideLogisticsSettings,
} from '@/lib/logistics/worldwide'
import { getNigerianCityOptions, NIGERIAN_STATES } from '@/lib/location/nigeria-address'

const querySchema = z.object({
  state: z.string().trim().optional().default(''),
  scope: z.enum(['nigeria', 'worldwide', 'pickup']).optional().default('nigeria'),
})

const worldwidePatchSchema = z.object({
  scope: z.literal('worldwide'),
  fixedPriceUsd: z
    .union([z.number(), z.string()])
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value) && value >= 0 && value <= 100000, {
      message: 'Worldwide fee is out of range.',
    }),
  etaKey: z.string().trim().optional(),
})

const toStateRates = (
  state: string,
  rows: Array<{
    city: string
    state: string
    standardPrice: number
    expressPrice: number
    standardEtaKey: LogisticsEtaKey
    expressEtaKey: LogisticsEtaKey
    standardEtaHours: number
    expressEtaHours: number
    standardCheckoutEstimate: string
    expressCheckoutEstimate: string
  }>,
) => {
  const byCity = new Map(rows.map((row) => [row.city.toLowerCase(), row]))
  return getNigerianCityOptions(state).map((city) => {
    const saved = byCity.get(String(city || '').toLowerCase())
    const standardEtaKey = saved?.standardEtaKey || getDefaultEtaKeyForDeliveryType('standard')
    const expressEtaKey = saved?.expressEtaKey || getDefaultEtaKeyForDeliveryType('express')
    const standardPreset = getEtaPreset(standardEtaKey)
    const expressPreset = getEtaPreset(expressEtaKey)
    return {
      city,
      state,
      standardPrice: saved ? Number(saved.standardPrice || 0) : 0,
      expressPrice: saved ? Number(saved.expressPrice || 0) : 0,
      standardEtaKey: saved ? normalizeEtaKey(saved.standardEtaKey) : standardEtaKey,
      expressEtaKey: saved ? normalizeEtaKey(saved.expressEtaKey) : expressEtaKey,
      standardEtaHours: saved
        ? Number(saved.standardEtaHours || standardPreset.etaHours)
        : standardPreset.etaHours,
      expressEtaHours: saved
        ? Number(saved.expressEtaHours || expressPreset.etaHours)
        : expressPreset.etaHours,
      standardCheckoutEstimate:
        saved?.standardCheckoutEstimate || standardPreset.checkoutEstimate,
      expressCheckoutEstimate:
        saved?.expressCheckoutEstimate || expressPreset.checkoutEstimate,
    }
  })
}

export async function GET(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parsed.success) {
    return jsonError('Invalid logistics query.', 400)
  }

  const selectedState =
    normalizeLogisticsState(parsed.data.state) || normalizeLogisticsState(NIGERIAN_STATES[0])
  if (!selectedState) {
    return jsonError('No Nigerian states available.', 500)
  }

  const [existing, worldwideSettings, pickupLocations] = await Promise.all([
    readLogisticsRatesByState(supabase, selectedState),
    readWorldwideLogisticsSettings(supabase),
    readPickupLocations(supabase),
  ])
  const response = jsonOk({
    scope: parsed.data.scope,
    states: NIGERIAN_STATES,
    etaPresets: LOGISTICS_ETA_PRESETS.map((entry) => ({
      key: entry.key,
      deliveryType: entry.deliveryType,
      adminLabel: entry.adminLabel,
      checkoutEstimate: entry.checkoutEstimate,
      etaHours: entry.etaHours,
    })),
    worldwideSettings,
    pickupLocations,
    state: selectedState,
    rates: toStateRates(selectedState, existing),
  })
  applyCookies(response)
  return response
}

export async function PATCH(request: NextRequest) {
  const { applyCookies, user, isAdmin } = await requireAdmin(request)
  if (!isAdmin || !user) {
    return jsonError('Forbidden.', 403)
  }

  const body = await request.json().catch(() => null)
  const bodyScope = String((body as { scope?: unknown })?.scope || '').trim().toLowerCase()

  if (bodyScope === 'worldwide') {
    const worldwideParsed = worldwidePatchSchema.safeParse(body)
    if (!worldwideParsed.success) {
      return jsonError(worldwideParsed.error.issues[0]?.message || 'Invalid payload.', 400)
    }
    try {
      const adminDb = createAdminSupabaseClient()
      const saved = await upsertWorldwideLogisticsSettings(
        adminDb,
        user.id,
        normalizeWorldwideFixedPriceUsd(worldwideParsed.data.fixedPriceUsd),
        normalizeWorldwideEtaKey(worldwideParsed.data.etaKey || DEFAULT_WORLDWIDE_ETA_KEY),
      )
      const response = jsonOk({
        scope: 'worldwide',
        worldwideSettings: saved,
      })
      applyCookies(response)
      return response
    } catch (error) {
      const response = jsonError(
        error instanceof Error ? error.message : 'Unable to save worldwide logistics settings.',
        500,
      )
      applyCookies(response)
      return response
    }
  }

  if (bodyScope === 'pickup') {
    const pickupParsed = pickupLocationsPatchSchema.safeParse(body)
    if (!pickupParsed.success) {
      return jsonError(pickupParsed.error.issues[0]?.message || 'Invalid payload.', 400)
    }
    try {
      const adminDb = createAdminSupabaseClient()
      const saved = await upsertPickupLocations(adminDb, user.id, pickupParsed.data.locations)
      const response = jsonOk({
        scope: 'pickup',
        pickupLocations: saved,
      })
      applyCookies(response)
      return response
    } catch (error) {
      const response = jsonError(
        error instanceof Error ? error.message : 'Unable to save pickup locations.',
        500,
      )
      applyCookies(response)
      return response
    }
  }

  const parsed = logisticsRatesPatchSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid payload.', 400)
  }

  const canonicalState = normalizeLogisticsState(parsed.data.state)
  if (!canonicalState) {
    return jsonError('Invalid state.', 400)
  }

  for (const rate of parsed.data.rates) {
    if (!isValidNigerianCityForState(canonicalState, rate.city)) {
      return jsonError(`Invalid city for ${canonicalState}: ${rate.city}`, 400)
    }
  }

  try {
    const adminDb = createAdminSupabaseClient()
    await upsertLogisticsRatesForState(
      adminDb,
      user.id,
      canonicalState,
      parsed.data.rates.map((rate) => ({
        city: rate.city,
        standardPrice: Number(rate.standardPrice || 0),
        expressPrice: Number(rate.expressPrice || 0),
        standardEtaKey: normalizeEtaKey(rate.standardEtaKey),
        expressEtaKey: normalizeEtaKey(rate.expressEtaKey),
      })),
    )

    const existing = await readLogisticsRatesByState(adminDb, canonicalState)
    const response = jsonOk({
      scope: 'nigeria',
      state: canonicalState,
      rates: toStateRates(canonicalState, existing),
    })
    applyCookies(response)
    return response
  } catch (error) {
    const response = jsonError(
      error instanceof Error ? error.message : 'Unable to save logistics settings.',
      500,
    )
    applyCookies(response)
    return response
  }
}
