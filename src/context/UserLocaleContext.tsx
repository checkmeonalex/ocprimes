'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  USER_LOCALE_EVENT,
  USER_LOCALE_STORAGE_KEY,
  applyLocaleToDocument,
} from '@/lib/user/locale-runtime'
import {
  CURRENCY_OPTIONS,
  DEFAULT_COUNTRY,
  LANGUAGE_OPTIONS,
  LANGUAGE_TO_INTL_LOCALE,
  getCurrencyMeta,
  getAllowedCurrencyCodes,
  getCountryLocaleDefaults,
  normalizeCountry,
  normalizeCurrency,
  normalizeLanguage,
  type CurrencyCode,
  type LanguageCode,
} from '@/lib/i18n/locale-config'
import {
  DEFAULT_UNIT_PER_USD,
  convertCurrencyAmount,
  STOREFRONT_BASE_CURRENCY,
  sanitizeUnitPerUsdMap,
} from '@/lib/i18n/exchange-rates'
import { translateMessage, type MessageKey } from '@/lib/i18n/messages'

type UserLocale = {
  country: string
  language: LanguageCode
  currency: CurrencyCode
}

type UserLocaleContextValue = {
  locale: UserLocale
  setLocale: (
    next: Partial<UserLocale>,
    options?: { persist?: boolean; broadcast?: boolean },
  ) => UserLocale
  t: (key: MessageKey, fallback?: string) => string
  formatMoney: (
    value: unknown,
    options?: Intl.NumberFormatOptions & { sourceCurrency?: CurrencyCode },
  ) => string
  languageOptions: typeof LANGUAGE_OPTIONS
  currencyOptions: typeof CURRENCY_OPTIONS
  allowedCurrencyCodes: CurrencyCode[]
}

const baseDefaults = getCountryLocaleDefaults(DEFAULT_COUNTRY)
const DEFAULT_LOCALE: UserLocale = {
  country: DEFAULT_COUNTRY,
  language: baseDefaults.language,
  currency: baseDefaults.currency,
}

const UserLocaleContext = createContext<UserLocaleContextValue | null>(null)
const EXCHANGE_RATES_STORAGE_KEY = 'ocp_exchange_rates'

const parseStoredLocale = (value: string | null): Partial<UserLocale> => {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object') return {}
    return {
      country: typeof parsed.country === 'string' ? parsed.country : undefined,
      language: typeof parsed.language === 'string' ? (parsed.language as LanguageCode) : undefined,
      currency: typeof parsed.currency === 'string' ? (parsed.currency as CurrencyCode) : undefined,
    }
  } catch {
    return {}
  }
}

const resolveLocale = (input: Partial<UserLocale>): UserLocale => {
  const country = normalizeCountry(input.country || DEFAULT_COUNTRY)
  const defaults = getCountryLocaleDefaults(country)
  const language = normalizeLanguage(input.language || defaults.language)
  const currency = normalizeCurrency(input.currency || defaults.currency, country)
  return { country, language, currency }
}

export function UserLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<UserLocale>(DEFAULT_LOCALE)
  const [unitPerUsd, setUnitPerUsd] =
    useState<Record<CurrencyCode, number>>(DEFAULT_UNIT_PER_USD)

  const setLocale = useCallback(
    (
      next: Partial<UserLocale>,
      options: { persist?: boolean; broadcast?: boolean } = {},
    ) => {
      const { persist = true, broadcast = true } = options
      const merged = resolveLocale({ ...locale, ...next })
      setLocaleState(merged)
      applyLocaleToDocument({ language: merged.language })

      if (persist) {
        try {
          window.localStorage.setItem(USER_LOCALE_STORAGE_KEY, JSON.stringify(merged))
        } catch {
          // ignore storage errors
        }
      }

      if (broadcast) {
        window.dispatchEvent(new CustomEvent(USER_LOCALE_EVENT, { detail: merged }))
      }

      return merged
    },
    [locale],
  )

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(EXCHANGE_RATES_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      const normalized = sanitizeUnitPerUsdMap(parsed?.unitPerUsd)
      setUnitPerUsd(normalized)
    } catch {
      // ignore malformed cache
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    const loadExchangeRates = async () => {
      try {
        const response = await fetch('/api/exchange-rates', { method: 'GET' })
        if (!response.ok) return
        const payload = await response.json().catch(() => null)
        const normalized = sanitizeUnitPerUsdMap(payload?.unitPerUsd)
        if (isCancelled) return
        setUnitPerUsd(normalized)
        try {
          window.localStorage.setItem(
            EXCHANGE_RATES_STORAGE_KEY,
            JSON.stringify({
              unitPerUsd: normalized,
              updatedAt: payload?.updatedAt || '',
            }),
          )
        } catch {
          // ignore storage errors
        }
      } catch {
        // ignore network failures and keep fallback
      }
    }

    void loadExchangeRates()
    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    const stored = parseStoredLocale(window.localStorage.getItem(USER_LOCALE_STORAGE_KEY))
    const next = resolveLocale(stored)
    setLocaleState(next)
    applyLocaleToDocument({ language: next.language })

    const handleLocaleEvent = (event: Event) => {
      const detail = (event as CustomEvent<Partial<UserLocale>>).detail || {}
      const resolved = resolveLocale(detail)
      setLocaleState(resolved)
      applyLocaleToDocument({ language: resolved.language })
      try {
        window.localStorage.setItem(USER_LOCALE_STORAGE_KEY, JSON.stringify(resolved))
      } catch {
        // ignore storage errors
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== USER_LOCALE_STORAGE_KEY) return
      const parsed = parseStoredLocale(event.newValue)
      const resolved = resolveLocale(parsed)
      setLocaleState(resolved)
      applyLocaleToDocument({ language: resolved.language })
    }

    window.addEventListener(USER_LOCALE_EVENT, handleLocaleEvent)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(USER_LOCALE_EVENT, handleLocaleEvent)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    const syncFromProfile = async () => {
      try {
        const response = await fetch('/api/user/profile', { method: 'GET' })
        if (!response.ok) return
        const payload = await response.json().catch(() => null)
        const profile = payload?.profile || {}

        const resolved = resolveLocale({
          country: profile.country,
          language: profile.language,
          currency: profile.currency,
        })

        if (isCancelled) return
        setLocaleState(resolved)
        applyLocaleToDocument({ language: resolved.language })
        try {
          window.localStorage.setItem(USER_LOCALE_STORAGE_KEY, JSON.stringify(resolved))
        } catch {
          // ignore storage errors
        }
      } catch {
        // ignore auth/network failures
      }
    }

    void syncFromProfile()

    return () => {
      isCancelled = true
    }
  }, [])

  const t = useCallback(
    (key: MessageKey, fallback?: string) => translateMessage(locale.language, key, fallback),
    [locale.language],
  )

  const formatMoney = useCallback(
    (
      value: unknown,
      options: Intl.NumberFormatOptions & { sourceCurrency?: CurrencyCode } = {},
    ) => {
      const amount = Number(value)
      const safeAmount = Number.isFinite(amount) ? amount : 0
      const sourceCurrency = options.sourceCurrency || STOREFRONT_BASE_CURRENCY
      const convertedAmount = convertCurrencyAmount(
        safeAmount,
        sourceCurrency,
        locale.currency,
        unitPerUsd,
      )
      const localeTag = LANGUAGE_TO_INTL_LOCALE[locale.language] || 'en-US'
      const symbol = getCurrencyMeta(locale.currency).symbol || locale.currency
      const decimals = Number.isInteger(convertedAmount) ? 0 : 2
      const withSpace = !['$', '£', '€', 'C$'].includes(symbol)
      const { sourceCurrency: _unusedSourceCurrency, ...intlOptions } = options
      try {
        const numberPart = new Intl.NumberFormat(localeTag, {
          style: 'decimal',
          minimumFractionDigits: options.minimumFractionDigits ?? decimals,
          maximumFractionDigits: options.maximumFractionDigits ?? decimals,
          ...intlOptions,
        }).format(convertedAmount)
        return withSpace ? `${symbol} ${numberPart}` : `${symbol}${numberPart}`
      } catch {
        const fallback =
          decimals === 0
            ? String(Math.trunc(convertedAmount))
            : convertedAmount.toFixed(2)
        return withSpace ? `${symbol} ${fallback}` : `${symbol}${fallback}`
      }
    },
    [locale.currency, locale.language, unitPerUsd],
  )

  const allowedCurrencyCodes = useMemo(
    () => getAllowedCurrencyCodes(locale.country),
    [locale.country],
  )

  const value = useMemo<UserLocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      formatMoney,
      languageOptions: LANGUAGE_OPTIONS,
      currencyOptions: CURRENCY_OPTIONS,
      allowedCurrencyCodes,
    }),
    [allowedCurrencyCodes, formatMoney, locale, setLocale, t],
  )

  return <UserLocaleContext.Provider value={value}>{children}</UserLocaleContext.Provider>
}

export const useUserLocaleContext = () => {
  const context = useContext(UserLocaleContext)
  if (!context) {
    throw new Error('useUserLocaleContext must be used within UserLocaleProvider')
  }
  return context
}
