'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronRight, Globe } from 'lucide-react'
import CountryFlagIcon from '@/components/common/CountryFlagIcon'
import {
  CURRENCY_OPTIONS,
  LOCALE_COUNTRY_OPTIONS,
  getCurrencyMeta,
} from '@/lib/i18n/locale-config'
import { useUserI18n } from '@/lib/i18n/useUserI18n'

export function CurrencySymbolIcon({ symbol }) {
  return (
    <span className='inline-flex h-6 min-w-6 items-center justify-center text-base font-semibold text-gray-900'>
      {symbol}
    </span>
  )
}

export function PreferencePickerRow({ icon, label, value, isOpen, onToggle, children }) {
  return (
    <div className='border-t border-slate-100 first:border-t-0'>
      <button
        type='button'
        onClick={onToggle}
        className='flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] text-slate-700 transition-colors hover:bg-slate-50'
        aria-expanded={isOpen}
      >
        <span className='inline-flex h-11 w-11 items-center justify-center rounded-md text-gray-900'>
          {icon}
        </span>
        <span className='min-w-0 flex-1'>
          <span className='block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400'>
            {label}
          </span>
          <span className='mt-0.5 block truncate text-[15px] font-medium text-slate-800'>{value}</span>
        </span>
        <ChevronDown
          className={`h-[18px] w-[18px] text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          strokeWidth={1.8}
          aria-hidden='true'
        />
      </button>
      {isOpen ? <div className='bg-slate-50/80 px-4 py-2'>{children}</div> : null}
    </div>
  )
}

// Plain row (no inline expand) that opens a slide-in sub-panel elsewhere —
// used by the vendor Collections menu instead of the accordion style, to
// match that menu's existing drill-down navigation pattern.
export function PreferenceRowLink({ icon, label, value, onClick }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='flex min-h-12 w-full items-center gap-3 px-5 py-3.5 text-left text-sm transition hover:bg-gray-50'
    >
      <span className='inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-900'>
        {icon}
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block text-[10px] font-bold uppercase tracking-widest text-gray-400'>
          {label}
        </span>
        <span className='mt-0.5 block truncate text-sm font-semibold text-gray-800'>{value}</span>
      </span>
      <ChevronRight className='h-4 w-4 shrink-0 text-gray-400' strokeWidth={2} aria-hidden='true' />
    </button>
  )
}

export function PreferenceOption({ label, selected, onClick, leading = null }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] transition-colors ${
        selected ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white'
      }`}
    >
      <span className='inline-flex h-6 w-6 items-center justify-center'>{leading}</span>
      <span className='min-w-0 flex-1 truncate font-medium'>{label}</span>
      {selected ? <Check className='h-[18px] w-[18px] text-slate-900' strokeWidth={2} aria-hidden='true' /> : null}
    </button>
  )
}

// Shared locale state + derived labels/options for Language, Store Currency,
// and Country pickers — consumed by both the inline accordion (MobileSidebar)
// and the vendor Collections menu's slide-in panel variant.
export function usePreferenceData() {
  const { locale, languageOptions, setLocale } = useUserI18n()

  const languageLabel =
    languageOptions.find((item) => item.code === locale.language)?.label || locale.language
  const currencyMeta = getCurrencyMeta(locale.currency)
  const currencyLabel = `${currencyMeta.label} (${currencyMeta.code})`
  const currencyOptions = useMemo(
    () =>
      CURRENCY_OPTIONS.filter((option) => option.code === 'NGN' || option.code === 'USD').map(
        (option) => ({
          code: option.code,
          symbol: option.symbol,
          label: `${option.label} (${option.code})`,
        }),
      ),
    [],
  )

  return {
    locale,
    setLocale,
    languageOptions,
    languageLabel,
    currencyMeta,
    currencyLabel,
    currencyOptions,
    countryOptions: LOCALE_COUNTRY_OPTIONS,
  }
}

// Row list (Language / Store Currency / Country) with no inline expand —
// each row's onClick is left to the caller, which opens its own slide-in
// panel and renders the matching option list via renderPreferenceOptions().
export function PreferenceRowList({ sectionClassName = '', titleClassName = '', onOpenPreference }) {
  const { locale, languageLabel, currencyMeta, currencyLabel } = usePreferenceData()

  return (
    <section className={sectionClassName}>
      <div className={titleClassName}>Region and language</div>
      <div>
        <PreferenceRowLink
          icon={<Globe className='h-5 w-5' strokeWidth={1.8} aria-hidden='true' />}
          label='Language'
          value={languageLabel}
          onClick={() => onOpenPreference('language')}
        />
        <PreferenceRowLink
          icon={<CurrencySymbolIcon symbol={currencyMeta.symbol} />}
          label='Store Currency'
          value={currencyLabel}
          onClick={() => onOpenPreference('currency')}
        />
        <PreferenceRowLink
          icon={<CountryFlagIcon country={locale.country} className='h-5 w-6 rounded-[2px]' />}
          label='Country'
          value={locale.country}
          onClick={() => onOpenPreference('country')}
        />
      </div>
    </section>
  )
}

// Renders just the option list for one preference key ('language' |
// 'currency' | 'country') — used inside the vendor menu's slide-in panel.
export function PreferenceOptionsList({ preferenceKey, onSelected }) {
  const { locale, setLocale, languageOptions, currencyOptions, countryOptions } = usePreferenceData()

  if (preferenceKey === 'language') {
    return (
      <div className='space-y-1'>
        {languageOptions.map((option) => (
          <PreferenceOption
            key={option.code}
            label={option.label}
            selected={locale.language === option.code}
            onClick={() => {
              setLocale({ language: option.code })
              onSelected()
            }}
            leading={<Globe className='h-[18px] w-[18px] text-gray-900' strokeWidth={1.8} aria-hidden='true' />}
          />
        ))}
      </div>
    )
  }

  if (preferenceKey === 'currency') {
    return (
      <div className='space-y-1'>
        {currencyOptions.map((option) => (
          <PreferenceOption
            key={option.code}
            label={option.label}
            selected={locale.currency === option.code}
            onClick={() => {
              setLocale({ currency: option.code })
              onSelected()
            }}
            leading={<CurrencySymbolIcon symbol={option.symbol} />}
          />
        ))}
      </div>
    )
  }

  if (preferenceKey === 'country') {
    return (
      <div className='space-y-1'>
        {countryOptions.map((country) => (
          <PreferenceOption
            key={country}
            label={country}
            selected={locale.country === country}
            onClick={() => {
              setLocale({ country })
              onSelected()
            }}
            leading={<CountryFlagIcon country={country} className='h-4 w-6 rounded-[2px]' />}
          />
        ))}
      </div>
    )
  }

  return null
}

export const PREFERENCE_LABELS = {
  language: 'Language',
  currency: 'Store Currency',
  country: 'Country',
}

// Full Language / Store Currency / Country picker section, driven by the
// same useUserI18n state the main site's MobileSidebar uses — so vendor
// storefront menus stay in sync with the primary header's selector instead
// of showing a disconnected, hardcoded "USD / EN" label.
export default function PreferencePickerSection({ sectionClassName = '', titleClassName = '' }) {
  const {
    locale,
    setLocale,
    languageOptions,
    languageLabel,
    currencyMeta,
    currencyLabel,
    currencyOptions,
    countryOptions,
  } = usePreferenceData()
  const [activePreference, setActivePreference] = useState(null)

  return (
    <section className={sectionClassName}>
      <div className={titleClassName}>Region and language</div>
      <div>
        <PreferencePickerRow
          icon={<Globe className='h-5 w-5' strokeWidth={1.8} aria-hidden='true' />}
          label='Language'
          value={languageLabel}
          isOpen={activePreference === 'language'}
          onToggle={() =>
            setActivePreference((current) => (current === 'language' ? null : 'language'))
          }
        >
          <div className='space-y-1'>
            {languageOptions.map((option) => (
              <PreferenceOption
                key={option.code}
                label={option.label}
                selected={locale.language === option.code}
                onClick={() => {
                  setLocale({ language: option.code })
                  setActivePreference(null)
                }}
                leading={<Globe className='h-[18px] w-[18px] text-gray-900' strokeWidth={1.8} aria-hidden='true' />}
              />
            ))}
          </div>
        </PreferencePickerRow>
        <PreferencePickerRow
          icon={<CurrencySymbolIcon symbol={currencyMeta.symbol} />}
          label='Store Currency'
          value={currencyLabel}
          isOpen={activePreference === 'currency'}
          onToggle={() =>
            setActivePreference((current) => (current === 'currency' ? null : 'currency'))
          }
        >
          <div className='space-y-1'>
            {currencyOptions.map((option) => (
              <PreferenceOption
                key={option.code}
                label={option.label}
                selected={locale.currency === option.code}
                onClick={() => {
                  setLocale({ currency: option.code })
                  setActivePreference(null)
                }}
                leading={<CurrencySymbolIcon symbol={option.symbol} />}
              />
            ))}
          </div>
        </PreferencePickerRow>
        <PreferencePickerRow
          icon={<CountryFlagIcon country={locale.country} className='h-5 w-6 rounded-[2px]' />}
          label='Country'
          value={locale.country}
          isOpen={activePreference === 'country'}
          onToggle={() =>
            setActivePreference((current) => (current === 'country' ? null : 'country'))
          }
        >
          <div className='space-y-1'>
            {countryOptions.map((country) => (
              <PreferenceOption
                key={country}
                label={country}
                selected={locale.country === country}
                onClick={() => {
                  setLocale({ country })
                  setActivePreference(null)
                }}
                leading={<CountryFlagIcon country={country} className='h-4 w-6 rounded-[2px]' />}
              />
            ))}
          </div>
        </PreferencePickerRow>
      </div>
    </section>
  )
}
