import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { convertCurrencyAmount } from '@/lib/i18n/exchange-rates'
import { readExchangeRatesPayload } from '@/lib/i18n/exchange-rate-service'
import {
  getEtaPreset,
  normalizeEtaKey,
  type LogisticsEtaKey,
} from '@/lib/logistics/config'

export const WORLDWIDE_LOGISTICS_TABLE = 'admin_logistics_worldwide_settings'
export const DEFAULT_WORLDWIDE_FIXED_PRICE_USD = 15
export const DEFAULT_WORLDWIDE_ETA_KEY: LogisticsEtaKey = 'express_3_7_days'

const worldwidePatchSchema = z.object({
  fixedPriceUsd: z
    .union([z.number(), z.string()])
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value) && value >= 0 && value <= 100000, {
      message: 'Worldwide fee is out of range.',
    }),
  etaKey: z.string().trim().optional(),
})

const normalizeCountry = (value: unknown) => String(value || '').trim().toLowerCase()

export const isWorldwideCountry = (value: unknown) => {
  const normalized = normalizeCountry(value)
  return normalized === 'international' || normalized === 'worldwide'
}

export const normalizeWorldwideFixedPriceUsd = (value: unknown) => {
  const parsed = worldwidePatchSchema.safeParse({ fixedPriceUsd: value })
  if (!parsed.success) return DEFAULT_WORLDWIDE_FIXED_PRICE_USD
  return Number(parsed.data.fixedPriceUsd)
}

export const normalizeWorldwideEtaKey = (value: unknown): LogisticsEtaKey => {
  const normalized = normalizeEtaKey(value)
  const preset = getEtaPreset(normalized)
  return preset.deliveryType === 'express' ? preset.key : DEFAULT_WORLDWIDE_ETA_KEY
}

export const readWorldwideLogisticsSettings = async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from(WORLDWIDE_LOGISTICS_TABLE)
    .select('fixed_price_usd, eta_key')
    .eq('id', 1)
    .maybeSingle()

  if (error || !data) {
    const fallbackPreset = getEtaPreset(DEFAULT_WORLDWIDE_ETA_KEY)
    return {
      fixedPriceUsd: DEFAULT_WORLDWIDE_FIXED_PRICE_USD,
      etaKey: DEFAULT_WORLDWIDE_ETA_KEY,
      etaHours: fallbackPreset.etaHours,
      checkoutEstimate: fallbackPreset.checkoutEstimate,
    }
  }

  const etaKey = normalizeWorldwideEtaKey(data.eta_key)
  const etaPreset = getEtaPreset(etaKey)
  return {
    fixedPriceUsd: normalizeWorldwideFixedPriceUsd(data.fixed_price_usd),
    etaKey,
    etaHours: etaPreset.etaHours,
    checkoutEstimate: etaPreset.checkoutEstimate,
  }
}

export const upsertWorldwideLogisticsSettings = async (
  supabase: SupabaseClient,
  userId: string,
  fixedPriceUsd: number,
  etaKey: LogisticsEtaKey = DEFAULT_WORLDWIDE_ETA_KEY,
) => {
  const normalizedPrice = normalizeWorldwideFixedPriceUsd(fixedPriceUsd)
  const normalizedEtaKey = normalizeWorldwideEtaKey(etaKey)
  const { error } = await supabase.from(WORLDWIDE_LOGISTICS_TABLE).upsert(
    {
      id: 1,
      fixed_price_usd: normalizedPrice,
      eta_key: normalizedEtaKey,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    },
    { onConflict: 'id' },
  )

  if (error) {
    const code = String(error.code || '').trim()
    const message = String(error.message || '').trim()
    const details = String((error as { details?: unknown })?.details || '').trim()
    throw new Error(
      ['Unable to save worldwide logistics settings.', code, message, details]
        .filter(Boolean)
        .join(' '),
    )
  }

  const etaPreset = getEtaPreset(normalizedEtaKey)
  return {
    fixedPriceUsd: normalizedPrice,
    etaKey: normalizedEtaKey,
    etaHours: etaPreset.etaHours,
    checkoutEstimate: etaPreset.checkoutEstimate,
  }
}

export const resolveWorldwideFeeInNgn = async (
  supabase: SupabaseClient,
  fixedPriceUsd: number,
) => {
  const normalizedPrice = normalizeWorldwideFixedPriceUsd(fixedPriceUsd)
  const exchangePayload = await readExchangeRatesPayload(supabase)
  const feeNgn = convertCurrencyAmount(
    normalizedPrice,
    'USD',
    'NGN',
    exchangePayload.unitPerUsd,
  )
  return Math.max(0, Math.round(Number(feeNgn || 0) * 100) / 100)
}
