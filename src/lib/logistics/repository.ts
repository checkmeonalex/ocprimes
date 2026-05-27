import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import {
  getDefaultEtaKeyForDeliveryType,
  getEtaPreset,
  type LogisticsDeliveryType,
  type LogisticsEtaKey,
  LOGISTICS_TABLE,
  normalizeDeliveryType,
  normalizeEtaKey,
  normalizeLogisticsCity,
  normalizeLogisticsState,
  toLegacyEtaKey,
} from '@/lib/logistics/config'

const SELECT_EXTENDED_FIELDS =
  'city, state, price, eta_key, eta_hours, standard_price, express_price, eta_standard_key, eta_standard_hours, eta_express_key, eta_express_hours'
const SELECT_LEGACY_FIELDS = 'city, state, price, eta_key, eta_hours'

const normalizePrice = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.round(parsed * 100) / 100
}

const isMissingColumnError = (error: PostgrestError | null) => {
  if (!error) return false
  const code = String(error.code || '').trim()
  const message = String(error.message || '').toLowerCase()
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    (message.includes('column') && message.includes('does not exist')) ||
    (message.includes('could not find') && message.includes('column')) ||
    message.includes('schema cache')
  )
}

const isEtaKeyConstraintError = (error: PostgrestError | null) => {
  if (!error) return false
  const code = String(error.code || '').trim()
  const message = String(error.message || '').toLowerCase()
  return (
    code === '23514' &&
    (message.includes('eta_standard_key') || message.includes('eta_express_key'))
  )
}

const inferStandardEtaKeyFromHours = (hours: unknown): LogisticsEtaKey => {
  const numeric = Number(hours)
  if (Number.isFinite(numeric) && numeric <= 36) return 'standard_1_2_days'
  if (Number.isFinite(numeric) && numeric >= 96) return 'standard_2_5_days'
  return 'standard_1_3_days'
}

const inferExpressEtaKeyFromHours = (hours: unknown): LogisticsEtaKey => {
  const numeric = Number(hours)
  if (Number.isFinite(numeric) && numeric >= 48) return 'express_1_3_days'
  return 'express_2_24_hours'
}

export type LogisticsRateRecord = {
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
}

export type LogisticsQuoteRecord = {
  city: string
  state: string
  deliveryType: LogisticsDeliveryType
  price: number
  etaKey: LogisticsEtaKey
  etaHours: number
  checkoutEstimate: string
}

const toRateRecord = (state: string, row: any): LogisticsRateRecord => {
  const canonicalState = normalizeLogisticsState(state) || String(state || '').trim()
  const city = normalizeLogisticsCity(canonicalState, row?.city || '')

  const legacyEtaKey = String(row?.eta_key || '').trim().toLowerCase()
  const rawStandardKey = String(row?.eta_standard_key || '').trim().toLowerCase()
  const rawExpressKey = String(row?.eta_express_key || '').trim().toLowerCase()

  const standardEtaHoursValue =
    Number(row?.eta_standard_hours) > 0 ? Number(row.eta_standard_hours) : Number(row?.eta_hours)
  const expressEtaHoursValue =
    Number(row?.eta_express_hours) > 0 ? Number(row.eta_express_hours) : undefined

  const standardEtaKey =
    rawStandardKey === 'standard'
      ? inferStandardEtaKeyFromHours(standardEtaHoursValue)
      : normalizeEtaKey(
          rawStandardKey ||
            (legacyEtaKey === 'next_day' || legacyEtaKey === 'three_days'
              ? legacyEtaKey
              : 'standard_1_3_days'),
        )
  const expressEtaKey =
    rawExpressKey === 'express'
      ? inferExpressEtaKeyFromHours(expressEtaHoursValue)
      : normalizeEtaKey(
          rawExpressKey || (legacyEtaKey === 'same_day' ? legacyEtaKey : 'express_2_24_hours'),
        )

  const standardEtaPreset = getEtaPreset(standardEtaKey)
  const expressEtaPreset = getEtaPreset(expressEtaKey)

  return {
    city,
    state: canonicalState,
    standardPrice: normalizePrice(row?.standard_price ?? row?.price),
    expressPrice: normalizePrice(row?.express_price ?? row?.price),
    standardEtaKey,
    expressEtaKey,
    standardEtaHours:
      Number(row?.eta_standard_hours) > 0
        ? Number(row.eta_standard_hours)
        : Number(row?.eta_hours) > 0
          ? Number(row.eta_hours)
          : standardEtaPreset.etaHours,
    expressEtaHours:
      Number(row?.eta_express_hours) > 0
        ? Number(row.eta_express_hours)
        : expressEtaPreset.etaHours,
    standardCheckoutEstimate: standardEtaPreset.checkoutEstimate,
    expressCheckoutEstimate: expressEtaPreset.checkoutEstimate,
  }
}

const selectRatesByState = async (supabase: SupabaseClient, canonicalState: string) => {
  const extendedResult = await supabase
    .from(LOGISTICS_TABLE)
    .select(SELECT_EXTENDED_FIELDS)
    .eq('state', canonicalState)
    .order('city', { ascending: true })

  if (extendedResult.error && isMissingColumnError(extendedResult.error)) {
    return supabase
      .from(LOGISTICS_TABLE)
      .select(SELECT_LEGACY_FIELDS)
      .eq('state', canonicalState)
      .order('city', { ascending: true })
  }

  return extendedResult
}

const selectRateByStateCity = async (
  supabase: SupabaseClient,
  canonicalState: string,
  canonicalCity: string,
) => {
  const extendedResult = await supabase
    .from(LOGISTICS_TABLE)
    .select(SELECT_EXTENDED_FIELDS)
    .eq('state', canonicalState)
    .eq('city', canonicalCity)
    .maybeSingle()

  if (extendedResult.error && isMissingColumnError(extendedResult.error)) {
    return supabase
      .from(LOGISTICS_TABLE)
      .select(SELECT_LEGACY_FIELDS)
      .eq('state', canonicalState)
      .eq('city', canonicalCity)
      .maybeSingle()
  }

  return extendedResult
}

export const readLogisticsRatesByState = async (supabase: SupabaseClient, state: string) => {
  const canonicalState = normalizeLogisticsState(state)
  if (!canonicalState) return []

  const { data, error } = await selectRatesByState(supabase, canonicalState)
  if (error || !Array.isArray(data)) return []

  return data.map((row) => toRateRecord(canonicalState, row)).filter((row) => row.city)
}

export const readLogisticsRateByStateCity = async (
  supabase: SupabaseClient,
  state: string,
  city: string,
  deliveryType: LogisticsDeliveryType = 'standard',
): Promise<LogisticsQuoteRecord | null> => {
  const canonicalState = normalizeLogisticsState(state)
  const canonicalCity = normalizeLogisticsCity(canonicalState, city)
  if (!canonicalState || !canonicalCity) return null

  const { data, error } = await selectRateByStateCity(supabase, canonicalState, canonicalCity)
  if (error || !data) return null

  const normalizedDeliveryType = normalizeDeliveryType(deliveryType)
  const rate = toRateRecord(canonicalState, data)

  if (normalizedDeliveryType === 'express') {
    return {
      city: rate.city,
      state: rate.state,
      deliveryType: normalizedDeliveryType,
      price: rate.expressPrice,
      etaKey: rate.expressEtaKey,
      etaHours: rate.expressEtaHours,
      checkoutEstimate: rate.expressCheckoutEstimate,
    }
  }

  return {
    city: rate.city,
    state: rate.state,
    deliveryType: normalizedDeliveryType,
    price: rate.standardPrice,
    etaKey: rate.standardEtaKey,
    etaHours: rate.standardEtaHours,
    checkoutEstimate: rate.standardCheckoutEstimate,
  }
}

export const upsertLogisticsRatesForState = async (
  supabase: SupabaseClient,
  userId: string,
  state: string,
  rates: Array<{
    city: string
    standardPrice: number
    expressPrice: number
    standardEtaKey: LogisticsEtaKey
    expressEtaKey: LogisticsEtaKey
  }>,
) => {
  const canonicalState = normalizeLogisticsState(state)
  if (!canonicalState) {
    throw new Error('Invalid state.')
  }

  const safeRows = rates
    .map((entry) => {
      const canonicalCity = normalizeLogisticsCity(canonicalState, entry.city)
      if (!canonicalCity) return null

      const standardEtaPreset = getEtaPreset(
        entry.standardEtaKey || getDefaultEtaKeyForDeliveryType('standard'),
      )
      const expressEtaPreset = getEtaPreset(
        entry.expressEtaKey || getDefaultEtaKeyForDeliveryType('express'),
      )

      return {
        state: canonicalState,
        city: canonicalCity,
        // Legacy columns kept in sync for backward compatibility.
        price: normalizePrice(entry.standardPrice),
        eta_key: toLegacyEtaKey(standardEtaPreset.key, 'standard'),
        eta_hours: standardEtaPreset.etaHours,
        // New dual-mode columns.
        standard_price: normalizePrice(entry.standardPrice),
        express_price: normalizePrice(entry.expressPrice),
        eta_standard_key: standardEtaPreset.key,
        eta_standard_hours: standardEtaPreset.etaHours,
        eta_express_key: expressEtaPreset.key,
        eta_express_hours: expressEtaPreset.etaHours,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>

  if (safeRows.length === 0) {
    throw new Error('No valid city rates to save.')
  }

  let upsertResult = await supabase
    .from(LOGISTICS_TABLE)
    .upsert(safeRows, { onConflict: 'state,city' })

  if (upsertResult.error && isEtaKeyConstraintError(upsertResult.error)) {
    const compatibilityRows = safeRows.map((entry) => {
      const standardKey = String(entry.eta_standard_key || '').trim().toLowerCase()
      const expressKey = String(entry.eta_express_key || '').trim().toLowerCase()
      return {
        ...entry,
        eta_standard_key: standardKey.startsWith('standard_') ? 'standard' : 'express',
        eta_express_key: expressKey.startsWith('express_') ? 'express' : 'standard',
      }
    })

    upsertResult = await supabase
      .from(LOGISTICS_TABLE)
      .upsert(compatibilityRows, { onConflict: 'state,city' })
  }

  if (upsertResult.error && isMissingColumnError(upsertResult.error)) {
    const legacyRows = safeRows.map((entry) => ({
      state: entry.state,
      city: entry.city,
      price: entry.price,
      eta_key: entry.eta_key,
      eta_hours: entry.eta_hours,
      updated_at: entry.updated_at,
      updated_by: entry.updated_by,
    }))

    upsertResult = await supabase
      .from(LOGISTICS_TABLE)
      .upsert(legacyRows, { onConflict: 'state,city' })
  }

  if (upsertResult.error) {
    const code = String(upsertResult.error.code || '').trim()
    const message = String(upsertResult.error.message || '').trim()
    const details = String((upsertResult.error as any)?.details || '').trim()
    throw new Error(
      ['Unable to save logistics rates.', code, message, details].filter(Boolean).join(' '),
    )
  }
}
