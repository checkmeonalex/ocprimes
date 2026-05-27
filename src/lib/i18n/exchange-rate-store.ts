import { CURRENCY_OPTIONS, type CurrencyCode } from '@/lib/i18n/locale-config'
import {
  DEFAULT_UNIT_PER_USD,
  RATES_BASE_CURRENCY,
  sanitizeUnitPerUsdMap,
} from '@/lib/i18n/exchange-rates'

export const EXCHANGE_RATE_TABLE = 'exchange_rates'
export const CURRENCY_SETTINGS_TABLE = 'currency_settings'

export const SUPPORTED_CURRENCY_CODES = CURRENCY_OPTIONS.map((item) => item.code) as CurrencyCode[]

export type ExchangeRatesPayload = {
  baseCurrency: CurrencyCode
  unitPerUsd: Record<CurrencyCode, number>
  updatedAt: string
  source: string
  useLiveSync: boolean
}

export const buildDefaultExchangeRatesPayload = (): ExchangeRatesPayload => ({
  baseCurrency: RATES_BASE_CURRENCY,
  unitPerUsd: { ...DEFAULT_UNIT_PER_USD },
  updatedAt: new Date(0).toISOString(),
  source: 'default',
  useLiveSync: false,
})

export const normalizeRateRows = (
  rows: Array<{ currency_code?: string; unit_per_usd?: number; updated_at?: string; source?: string }> | null | undefined,
  useLiveSync = false,
): ExchangeRatesPayload => {
  const fallback = buildDefaultExchangeRatesPayload()
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ...fallback, useLiveSync }
  }

  const partial: Partial<Record<CurrencyCode, number>> = {}
  let newestUpdatedAt = fallback.updatedAt
  let source = fallback.source

  rows.forEach((row) => {
    const code = String(row?.currency_code || '').toUpperCase() as CurrencyCode
    const rate = Number(row?.unit_per_usd)
    if (SUPPORTED_CURRENCY_CODES.includes(code) && Number.isFinite(rate) && rate > 0) {
      partial[code] = rate
    }

    const maybeDate = row?.updated_at ? new Date(row.updated_at) : null
    if (maybeDate && !Number.isNaN(maybeDate.getTime()) && maybeDate.toISOString() > newestUpdatedAt) {
      newestUpdatedAt = maybeDate.toISOString()
      source = typeof row?.source === 'string' && row.source.trim() ? row.source : source
    }
  })

  return {
    baseCurrency: RATES_BASE_CURRENCY,
    unitPerUsd: sanitizeUnitPerUsdMap(partial),
    updatedAt: newestUpdatedAt,
    source,
    useLiveSync,
  }
}
