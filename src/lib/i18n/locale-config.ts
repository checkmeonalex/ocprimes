import { ACCEPTED_COUNTRIES } from '@/lib/user/accepted-countries'

export const DEFAULT_COUNTRY = 'Nigeria'

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

export const COUNTRY_DEFAULT_PREFS: Record<
  (typeof ACCEPTED_COUNTRIES)[number],
  { language: LanguageCode; currency: CurrencyCode }
> = {
  Nigeria: { language: 'EN', currency: 'NGN' },
  Egypt: { language: 'AR', currency: 'EGP' },
  Ghana: { language: 'EN', currency: 'GHS' },
  'Ivory Coast': { language: 'FR', currency: 'XOF' },
  Algeria: { language: 'AR', currency: 'DZD' },
  Morocco: { language: 'AR', currency: 'MAD' },
  USA: { language: 'EN', currency: 'USD' },
  UK: { language: 'EN', currency: 'GBP' },
  UAE: { language: 'AR', currency: 'AED' },
  Canada: { language: 'EN', currency: 'CAD' },
}

export const USD_CURRENCY_CODE: CurrencyCode = 'USD'

const SUPPORTED_LANGUAGE_SET = new Set<string>(LANGUAGE_OPTIONS.map((item) => item.code))
const SUPPORTED_CURRENCY_SET = new Set<string>(CURRENCY_OPTIONS.map((item) => item.code))
const SUPPORTED_COUNTRY_SET = new Set<string>(ACCEPTED_COUNTRIES)

export const normalizeCountry = (country?: string | null) => {
  const next = typeof country === 'string' ? country.trim() : ''
  if (!next || !SUPPORTED_COUNTRY_SET.has(next)) return DEFAULT_COUNTRY
  return next as (typeof ACCEPTED_COUNTRIES)[number]
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
  const { currency: localCurrency } = getCountryLocaleDefaults(country)
  if (localCurrency === USD_CURRENCY_CODE) return [USD_CURRENCY_CODE] as CurrencyCode[]
  return [localCurrency, USD_CURRENCY_CODE] as CurrencyCode[]
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
