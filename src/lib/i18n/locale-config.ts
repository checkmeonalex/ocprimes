export const DEFAULT_COUNTRY = 'Nigeria'
export const INTERNATIONAL_COUNTRY = 'International'
export const LOCALE_COUNTRY_OPTIONS = [DEFAULT_COUNTRY, INTERNATIONAL_COUNTRY] as const

export const LANGUAGE_OPTIONS = [
  { code: 'EN', label: 'English' },
  { code: 'AR', label: 'Arabic' },
  { code: 'FR', label: 'French' },
] as const

export const CURRENCY_OPTIONS = [
  { code: 'NGN', symbol: '₦', label: 'Naira' },
  { code: 'EGP', symbol: 'E£', label: 'Egyptian Pound' },
  { code: 'GHS', symbol: 'GH₵', label: 'Ghanaian Cedi' },
  { code: 'XOF', symbol: 'CFA', label: 'West African CFA Franc' },
  { code: 'DZD', symbol: 'DA', label: 'Algerian Dinar' },
  { code: 'MAD', symbol: 'MAD', label: 'Moroccan Dirham' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'GBP', symbol: '£', label: 'Pound Sterling' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
] as const

export type LanguageCode = (typeof LANGUAGE_OPTIONS)[number]['code']
export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]['code']
export type LocaleCountry = (typeof LOCALE_COUNTRY_OPTIONS)[number]

export const COUNTRY_DEFAULT_PREFS: Record<LocaleCountry, { language: LanguageCode; currency: CurrencyCode }> = {
  Nigeria: { language: 'EN', currency: 'NGN' },
  International: { language: 'EN', currency: 'USD' },
}

export const USD_CURRENCY_CODE: CurrencyCode = 'USD'

const SUPPORTED_LANGUAGE_SET = new Set<string>(LANGUAGE_OPTIONS.map((item) => item.code))
const SUPPORTED_CURRENCY_SET = new Set<string>(CURRENCY_OPTIONS.map((item) => item.code))
const SUPPORTED_COUNTRY_SET = new Set<string>(LOCALE_COUNTRY_OPTIONS)

export const normalizeCountry = (country?: string | null) => {
  const next = typeof country === 'string' ? country.trim() : ''
  if (!next || !SUPPORTED_COUNTRY_SET.has(next)) return DEFAULT_COUNTRY
  return next as LocaleCountry
}

export const normalizeLanguage = (language?: string | null) => {
  const next = typeof language === 'string' ? language.trim().toUpperCase() : ''
  if (SUPPORTED_LANGUAGE_SET.has(next)) return next as LanguageCode
  return COUNTRY_DEFAULT_PREFS[DEFAULT_COUNTRY].language
}

export const getCountryLocaleDefaults = (country?: string | null) => {
  const normalizedCountry = normalizeCountry(country)
  return COUNTRY_DEFAULT_PREFS[normalizedCountry]
}

export const getAllowedCurrencyCodes = (country?: string | null) => {
  const normalizedCountry = normalizeCountry(country)
  if (normalizedCountry === INTERNATIONAL_COUNTRY) return [USD_CURRENCY_CODE] as CurrencyCode[]
  return [COUNTRY_DEFAULT_PREFS[DEFAULT_COUNTRY].currency] as CurrencyCode[]
}

export const normalizeCurrency = (currency?: string | null, country?: string | null) => {
  const next = typeof currency === 'string' ? currency.trim().toUpperCase() : ''
  const allowed = getAllowedCurrencyCodes(country)
  if (SUPPORTED_CURRENCY_SET.has(next) && allowed.includes(next as CurrencyCode)) {
    return next as CurrencyCode
  }
  return getCountryLocaleDefaults(country).currency
}

export const getCurrencyMeta = (currency: CurrencyCode) => {
  return CURRENCY_OPTIONS.find((item) => item.code === currency) || CURRENCY_OPTIONS[0]
}

export const LANGUAGE_TO_INTL_LOCALE: Record<LanguageCode, string> = {
  EN: 'en-US',
  AR: 'ar',
  FR: 'fr-FR',
}
