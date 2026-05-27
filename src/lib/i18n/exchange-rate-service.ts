import type { SupabaseClient } from '@supabase/supabase-js'
import { buildDefaultExchangeRatesPayload, CURRENCY_SETTINGS_TABLE, EXCHANGE_RATE_TABLE, normalizeRateRows } from '@/lib/i18n/exchange-rate-store'

export async function readExchangeRatesPayload(supabase: SupabaseClient) {
  const fallback = buildDefaultExchangeRatesPayload()

  const [{ data: rateRows, error: ratesError }, { data: settingsRow, error: settingsError }] = await Promise.all([
    supabase
      .from(EXCHANGE_RATE_TABLE)
      .select('currency_code, unit_per_usd, updated_at, source')
      .order('currency_code', { ascending: true }),
    supabase
      .from(CURRENCY_SETTINGS_TABLE)
      .select('use_live_sync')
      .eq('id', 1)
      .maybeSingle(),
  ])

  if (ratesError) {
    console.error('Exchange rates read failed:', ratesError.message)
  }

  if (settingsError) {
    console.error('Currency settings read failed:', settingsError.message)
  }

  if (ratesError && settingsError) {
    return fallback
  }

  const useLiveSync = Boolean(settingsRow?.use_live_sync)
  return normalizeRateRows(rateRows || [], useLiveSync)
}
