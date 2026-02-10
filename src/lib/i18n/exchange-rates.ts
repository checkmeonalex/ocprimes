import type { CurrencyCode } from '@/lib/i18n/locale-config'

// Base assumption for storefront prices: NGN.
// Update these rates periodically to reflect market changes.
// unit_per_usd means: how many units of this currency equal 1 USD.
export const DEFAULT_UNIT_PER_USD: Record<CurrencyCode, number> = {
  USD: 1,
  NGN: 1600,
  EGP: 49,
  GHS: 15.5,
  XOF: 605,
  DZD: 135,
  MAD: 10,
  GBP: 0.79,
  AED: 3.67,
  CAD: 1.36,
}

export const STOREFRONT_BASE_CURRENCY: CurrencyCode = 'NGN'
export const RATES_BASE_CURRENCY: CurrencyCode = 'USD'

export const sanitizeUnitPerUsdMap = (candidate?: Partial<Record<CurrencyCode, number>> | null) => {
  const next: Record<CurrencyCode, number> = { ...DEFAULT_UNIT_PER_USD }
  if (!candidate) return next
  ;(Object.keys(DEFAULT_UNIT_PER_USD) as CurrencyCode[]).forEach((code) => {
    const value = Number(candidate[code])
    if (Number.isFinite(value) && value > 0) {
      next[code] = value
    }
  })
  next.USD = 1
  return next
}

const toUsd = (
  amount: number,
  sourceCurrency: CurrencyCode,
  unitPerUsd: Record<CurrencyCode, number>,
) => {
  const sourceUnitPerUsd = unitPerUsd[sourceCurrency]
  if (!Number.isFinite(sourceUnitPerUsd) || sourceUnitPerUsd <= 0) return amount
  return amount / sourceUnitPerUsd
}

const fromUsd = (
  amountUsd: number,
  targetCurrency: CurrencyCode,
  unitPerUsd: Record<CurrencyCode, number>,
) => {
  const targetUnitPerUsd = unitPerUsd[targetCurrency]
  if (!Number.isFinite(targetUnitPerUsd) || targetUnitPerUsd <= 0) return amountUsd
  return amountUsd * targetUnitPerUsd
}

export const convertCurrencyAmount = (
  amount: number,
  sourceCurrency: CurrencyCode,
  targetCurrency: CurrencyCode,
  unitPerUsdMap: Partial<Record<CurrencyCode, number>> = DEFAULT_UNIT_PER_USD,
) => {
  if (!Number.isFinite(amount)) return 0
  if (sourceCurrency === targetCurrency) return amount
  const rates = sanitizeUnitPerUsdMap(unitPerUsdMap)
  const amountUsd = toUsd(amount, sourceCurrency, rates)
  return fromUsd(amountUsd, targetCurrency, rates)
}

export const getExchangeRateLastUpdatedLabel = () => '2026-02-10'
