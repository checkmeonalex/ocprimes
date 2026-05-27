import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  CURRENCY_SETTINGS_TABLE,
  EXCHANGE_RATE_TABLE,
  SUPPORTED_CURRENCY_CODES,
} from '@/lib/i18n/exchange-rate-store'
import { readExchangeRatesPayload } from '@/lib/i18n/exchange-rate-service'

const API_BASE = process.env.EXCHANGE_RATE_API_BASE_URL || 'https://api.currencyapi.com/v3'
const API_KEY = process.env.EXCHANGE_RATE_API_KEY || ''

const readProviderRates = (payload: any) => {
  // currencyapi.com shape: { data: { USD: { code, value }, NGN: { ... } } }
  if (payload?.data && typeof payload.data === 'object') {
    const extracted: Record<string, number> = {}
    Object.entries(payload.data).forEach(([code, entry]) => {
      const value = Number((entry as any)?.value)
      if (Number.isFinite(value) && value > 0) {
        extracted[String(code).toUpperCase()] = value
      }
    })
    if (Object.keys(extracted).length > 0) return extracted
  }

  // Fallback for providers returning { rates: { USD: 1, ... } }
  if (payload?.rates && typeof payload.rates === 'object') {
    const extracted: Record<string, number> = {}
    Object.entries(payload.rates).forEach(([code, value]) => {
      const num = Number(value)
      if (Number.isFinite(num) && num > 0) {
        extracted[String(code).toUpperCase()] = num
      }
    })
    return extracted
  }

  return {}
}

export async function POST(request: NextRequest) {
  const { supabase, applyCookies, isAdmin, user } = await requireAdmin(request)

  if (!isAdmin || !user) {
    return jsonError('Forbidden.', 403)
  }

  const symbols = SUPPORTED_CURRENCY_CODES.join(',')
  const url = new URL(`${API_BASE.replace(/\/$/, '')}/latest`)
  url.searchParams.set('base_currency', 'USD')
  url.searchParams.set('currencies', symbols)
  if (API_KEY) {
    url.searchParams.set('apikey', API_KEY)
  }

  let liveRates: Record<string, number> = {}
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return jsonError(payload?.error?.message || payload?.error || 'Live sync request failed.', 502)
    }

    const hasSuccessFlag = payload?.success
    if (typeof hasSuccessFlag === 'boolean' && !hasSuccessFlag) {
      return jsonError(payload?.error?.message || payload?.error?.type || 'Live sync failed.', 502)
    }

    liveRates = readProviderRates(payload)
  } catch (error) {
    return jsonError('Unable to reach exchange rate provider.', 502)
  }

  const rows = SUPPORTED_CURRENCY_CODES.map((code) => ({
    currency_code: code,
    unit_per_usd: Number(liveRates?.[code]),
    source: 'live_sync',
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  })).filter((entry) => Number.isFinite(entry.unit_per_usd) && entry.unit_per_usd > 0)

  const missing = SUPPORTED_CURRENCY_CODES.filter(
    (code) => !rows.some((entry) => entry.currency_code === code),
  )

  if (missing.length) {
    return jsonError(`Live sync missing rates: ${missing.join(', ')}`, 502)
  }

  const { error: upsertRatesError } = await supabase
    .from(EXCHANGE_RATE_TABLE)
    .upsert(rows, { onConflict: 'currency_code' })

  if (upsertRatesError) {
    console.error('Live sync upsert failed:', upsertRatesError.message)
    return jsonError('Unable to save synced exchange rates.', 500)
  }

  const { error: settingsError } = await supabase
    .from(CURRENCY_SETTINGS_TABLE)
    .upsert(
      {
        id: 1,
        use_live_sync: true,
        provider: 'currencyapi.com',
        base_currency: 'USD',
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

  if (settingsError) {
    console.error('Live sync settings update failed:', settingsError.message)
    return jsonError('Unable to update live sync settings.', 500)
  }

  const payload = await readExchangeRatesPayload(supabase)
  const response = jsonOk(payload)
  applyCookies(response)
  return response
}
