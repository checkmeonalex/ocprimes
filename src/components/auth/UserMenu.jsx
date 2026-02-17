'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuthUser } from '@/lib/auth/useAuthUser.ts'
import { USER_MENU_ITEMS } from '@/lib/user/menu-items'
import { ACCEPTED_COUNTRIES } from '@/lib/user/accepted-countries'
import CountryFlagIcon from '@/components/common/CountryFlagIcon'
import { useUserI18n } from '@/lib/i18n/useUserI18n'
import {
  DEFAULT_COUNTRY,
  getAllowedCurrencyCodes,
  getCountryLocaleDefaults,
} from '@/lib/i18n/locale-config'
import { translateMenuLabel } from '@/lib/i18n/messages'

const getDisplayName = (email) => {
  if (!email) return 'Guest'
  const [local] = email.split('@')
  return local || email
}

const getProfileInitials = (value) => {
  const normalized = String(value || '').trim()
  if (!normalized) return 'GU'
  const words = normalized.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase()
  }
  const lettersOnly = normalized.replace(/[^a-zA-Z0-9]/g, '')
  return lettersOnly.slice(0, 2).toUpperCase() || 'GU'
}

const PROFILE_BADGE_COLORS = [
  '#0f766e',
  '#0369a1',
  '#b45309',
  '#7c3aed',
  '#be123c',
  '#1d4ed8',
  '#166534',
  '#9a3412',
]

const getProfileBadgeColor = (seed) => {
  const normalized = String(seed || '').trim().toLowerCase()
  if (!normalized) return PROFILE_BADGE_COLORS[0]
  let hash = 0
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0
  }
  return PROFILE_BADGE_COLORS[hash % PROFILE_BADGE_COLORS.length]
}

const renderMenuItemIcon = (label) => {
  const iconProps = {
    className: 'h-[18px] w-[18px]',
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  }

  if (label === 'Notifications') {
    return (
      <svg {...iconProps}>
        <path
          d='M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V10a6 6 0 1 0-12 0v4.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    )
  }

  if (label === 'Your orders') {
    return (
      <svg {...iconProps}>
        <rect x='4' y='5' width='16' height='14' rx='2' stroke='currentColor' strokeWidth='1.5' />
        <path d='M8 9h8M8 13h5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
      </svg>
    )
  }
  if (label === 'Wishlist') {
    return (
      <svg {...iconProps}>
        <path
          d='M12 20s-5.5-3.7-7.4-6.7C2.3 9.7 4.4 5.5 8 5.5c1.8 0 3 .9 4 2.2 1-1.3 2.2-2.2 4-2.2 3.6 0 5.7 4.2 3.4 7.8C17.5 16.3 12 20 12 20z'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    )
  }
  if (label === 'Your reviews') {
    return (
      <svg {...iconProps}>
        <path d='M4 6.5h16v9H9l-5 3v-12z' stroke='currentColor' strokeWidth='1.5' strokeLinejoin='round' />
        <path d='m11 10 1 2 2.2.3-1.6 1.6.4 2.1L11 15l-2 .9.4-2.1-1.6-1.6 2.2-.3 1-2z' stroke='currentColor' strokeWidth='1.2' />
      </svg>
    )
  }
  if (label === 'Your profile') {
    return (
      <svg {...iconProps}>
        <circle cx='12' cy='8' r='3.5' stroke='currentColor' strokeWidth='1.5' />
        <path d='M5 19c1.8-3 4-4.5 7-4.5s5.2 1.5 7 4.5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
      </svg>
    )
  }
  if (label === 'Coupons & offers') {
    return (
      <svg {...iconProps}>
        <path d='M4.5 8a2 2 0 0 0 0 4v4h15v-4a2 2 0 0 0 0-4V4h-15v4z' stroke='currentColor' strokeWidth='1.5' />
        <path d='M12 4v12' stroke='currentColor' strokeWidth='1.5' strokeDasharray='2 2' />
      </svg>
    )
  }
  if (label === 'Followed stores') {
    return (
      <svg {...iconProps}>
        <path d='M4 9h16l-1.2 10H5.2L4 9zM6 9l1-4h10l1 4' stroke='currentColor' strokeWidth='1.5' strokeLinejoin='round' />
      </svg>
    )
  }
  if (label === 'Addresses') {
    return (
      <svg {...iconProps}>
        <path d='M12 20s6-6.6 6-10a6 6 0 1 0-12 0c0 3.4 6 10 6 10z' stroke='currentColor' strokeWidth='1.5' />
        <circle cx='12' cy='10' r='2.2' stroke='currentColor' strokeWidth='1.5' />
      </svg>
    )
  }
  if (label === 'Account & security') {
    return (
      <svg {...iconProps}>
        <path d='M12 4 5 7v5c0 4.5 3.1 7 7 8 3.9-1 7-3.5 7-8V7l-7-3z' stroke='currentColor' strokeWidth='1.5' />
        <path d='M10.5 11.5v-1a1.5 1.5 0 1 1 3 0v1M10 11.5h4v3h-4z' stroke='currentColor' strokeWidth='1.5' />
      </svg>
    )
  }

  return (
    <svg {...iconProps}>
      <path d='M7 7h10M7 12h10M7 17h10' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
    </svg>
  )
}

export default function UserMenu({ variant = 'default' }) {
  const router = useRouter()
  const { user, isLoading } = useAuthUser()
  const { locale, setLocale, t, languageOptions, currencyOptions } = useUserI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [isLocaleMenuOpen, setIsLocaleMenuOpen] = useState(false)
  const [localeCountry, setLocaleCountry] = useState(locale.country || DEFAULT_COUNTRY)
  const [localeLanguage, setLocaleLanguage] = useState(locale.language)
  const [localeCurrency, setLocaleCurrency] = useState(locale.currency)
  const [isLocaleSaving, setIsLocaleSaving] = useState(false)
  const [localeError, setLocaleError] = useState('')
  const [localeSuccess, setLocaleSuccess] = useState('')
  const [profileDraft, setProfileDraft] = useState(null)
  const [requestMessage, setRequestMessage] = useState('')
  const [isRequesting, setIsRequesting] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
        setIsLocaleMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    setIsOpen(false)
    setIsLocaleMenuOpen(false)
    router.refresh()
    router.push('/login')
  }

  const handleRequestAdmin = async () => {
    if (isRequesting) return
    setIsRequesting(true)
    setRequestMessage('')
    try {
      const response = await fetch('/api/auth/request-admin', { method: 'POST' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setRequestMessage(payload?.error || 'Unable to submit request.')
        return
      }
      setRequestMessage('Request submitted for admin approval.')
    } catch {
      setRequestMessage('Unable to submit request.')
    } finally {
      setIsRequesting(false)
    }
  }

  const displayName = getDisplayName(user?.email)
  const profileInitials = getProfileInitials(displayName)
  const profileBadgeColor = getProfileBadgeColor(displayName)
  const isSignedIn = Boolean(user)
  const isCompactChip = variant === 'compactChip'
  const avatarUrl = typeof user?.user_metadata?.avatar_url === 'string'
    ? user.user_metadata.avatar_url.trim()
    : ''
  const defaultCountryPrefs = useMemo(() => getCountryLocaleDefaults(localeCountry), [localeCountry])
  const localCurrencyCode = defaultCountryPrefs.currency
  const allowedCurrencyCodes = useMemo(() => getAllowedCurrencyCodes(localeCountry), [localeCountry])
  const allowedCurrencyOptions = useMemo(
    () => currencyOptions.filter((option) => allowedCurrencyCodes.includes(option.code)),
    [allowedCurrencyCodes, currencyOptions],
  )
  const currencyMeta =
    currencyOptions.find((option) => option.code === localeCurrency) ||
    currencyOptions[0]
  const accountLocale = `${localeLanguage} (${currencyMeta.symbol})`

  useEffect(() => {
    setLocaleCountry(locale.country || DEFAULT_COUNTRY)
    setLocaleLanguage(locale.language)
    setLocaleCurrency(locale.currency)
  }, [locale.country, locale.currency, locale.language])

  useEffect(() => {
    if (allowedCurrencyCodes.includes(localeCurrency)) return
    setLocaleCurrency(localCurrencyCode)
  }, [allowedCurrencyCodes, localeCurrency, localCurrencyCode])

  const openLocaleMenu = async () => {
    setLocaleError('')
    setLocaleSuccess('')
    setIsLocaleMenuOpen(true)
    if (!user) return
    try {
      const response = await fetch('/api/user/profile')
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Unable to load shipping settings.')
      }
      const payload = await response.json()
      const profile = payload?.profile || {}
      setProfileDraft(profile)
      const profileCountry =
        profile?.deliveryAddress?.country ||
        profile?.country ||
        DEFAULT_COUNTRY
      const normalizedCountry = ACCEPTED_COUNTRIES.includes(profileCountry)
        ? profileCountry
        : DEFAULT_COUNTRY
      const defaultPrefs = getCountryLocaleDefaults(normalizedCountry)
      const profileCurrency = profile?.currency || defaultPrefs.currency
      const allowedCurrencyByCountry = getAllowedCurrencyCodes(normalizedCountry)
      const normalizedCurrency = allowedCurrencyByCountry.includes(profileCurrency)
        ? profileCurrency
        : defaultPrefs.currency
      setLocaleCountry(normalizedCountry)
      setLocaleLanguage(profile?.language || defaultPrefs.language)
      setLocaleCurrency(normalizedCurrency)
    } catch (err) {
      setLocaleError(err?.message || 'Unable to load shipping settings.')
    }
  }

  const handleSaveLocaleSettings = async () => {
    if (!user) return
    if (!profileDraft?.firstName?.trim()) {
      setLocaleError('Set your first name in profile before updating shipping country.')
      return
    }
    setIsLocaleSaving(true)
    setLocaleError('')
    setLocaleSuccess('')
    try {
      const existingAddresses = Array.isArray(profileDraft?.addresses)
        ? profileDraft.addresses
        : []
      const hasDefaultAddress = existingAddresses.some((item) => item?.isDefault)
      const updatedAddresses = existingAddresses.map((item, index) => {
        const isDefaultAddress = hasDefaultAddress ? Boolean(item?.isDefault) : index === 0
        return isDefaultAddress
          ? { ...item, country: localeCountry }
          : item
      })
      const updatedDeliveryAddress = {
        ...(profileDraft?.deliveryAddress || {}),
        country: localeCountry,
      }
      const nextProfile = {
        ...profileDraft,
        country: localeCountry,
        language: localeLanguage,
        currency: localeCurrency,
        deliveryAddress: updatedDeliveryAddress,
        addresses: updatedAddresses,
      }
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextProfile),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save shipping settings.')
      }
      const savedProfile = payload?.profile || nextProfile
      setProfileDraft(savedProfile)
      setLocale({
        country: localeCountry,
        language: localeLanguage,
        currency: localeCurrency,
      })
      setLocaleSuccess(t('locale.preferencesUpdated', 'Preferences updated.'))
      setIsLocaleMenuOpen(false)
      setLocaleError('')
      setLocaleSuccess('')
    } catch (err) {
      setLocaleError(err?.message || 'Unable to save shipping settings.')
    } finally {
      setIsLocaleSaving(false)
    }
  }

  return (
    <div
      className='relative'
      ref={menuRef}
    >
      <button
        type='button'
        onClick={() =>
          setIsOpen((prev) => {
            const next = !prev
            if (!next) setIsLocaleMenuOpen(false)
            return next
          })
        }
        className={
          isSignedIn
            ? isCompactChip
              ? 'inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-[#eef0f2] px-2 py-1'
              : 'flex items-center space-x-2'
            : 'flex items-center space-x-3 rounded-md px-3 py-2 text-gray-900'
        }
        aria-expanded={isOpen}
        aria-haspopup='menu'
      >
        {isSignedIn ? (
          isCompactChip ? (
            <>
              <span className='inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-200'>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <span
                    className='inline-flex h-full w-full items-center justify-center text-[11px] font-semibold uppercase tracking-[0.03em] text-white'
                    style={{ backgroundColor: profileBadgeColor }}
                    aria-hidden='true'
                  >
                    {profileInitials}
                  </span>
                )}
              </span>
              <svg
                viewBox='0 0 20 20'
                className='h-4 w-4 text-slate-500'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                aria-hidden='true'
              >
                <path d='m6 8 4 4 4-4' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </>
          ) : (
            <>
              <div className='w-8 h-8 bg-pink-400 rounded-full flex items-center justify-center overflow-hidden'>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <span
                    className='inline-flex h-full w-full items-center justify-center text-[11px] font-semibold uppercase tracking-[0.03em] text-white'
                    style={{ backgroundColor: profileBadgeColor }}
                    aria-hidden='true'
                  >
                    {profileInitials}
                  </span>
                )}
              </div>
              <span className='flex flex-col leading-none text-gray-700'>
                <span className='text-xs font-medium'>
                  {isLoading ? 'Hi' : `Hi ${displayName}`}
                </span>
                <span className='text-sm font-semibold'>{t('account.yourAccount', 'Your account')}</span>
              </span>
            </>
          )
        ) : (
          <>
            <svg
              className='h-5 w-5'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'
            >
              <path
                d='M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Z'
                stroke='currentColor'
                strokeWidth='1.5'
              />
              <path
                d='M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
              />
            </svg>
            <span className='flex flex-col leading-none'>
              <span className='text-xs font-medium'>{t('auth.signIn', 'Sign in')}</span>
              <span className='text-sm font-semibold'>{t('account.title', 'Account')}</span>
            </span>
          </>
        )}
      </button>

      {isOpen && (
        <div
          className='absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg'
          role='menu'
        >
          {user ? (
            <>
              <div className='-mx-3 flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-5 py-2'>
                <div className='flex min-w-0 items-center gap-3'>
                  <div className='w-9 h-9 bg-pink-400 rounded-full flex items-center justify-center overflow-hidden'>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className='h-full w-full object-cover'
                      />
                    ) : (
                      <span
                        className='inline-flex h-full w-full items-center justify-center text-[11px] font-semibold uppercase tracking-[0.03em] text-white'
                        style={{ backgroundColor: profileBadgeColor }}
                        aria-hidden='true'
                      >
                        {profileInitials}
                      </span>
                    )}
                  </div>
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-semibold text-gray-900'>
                      {displayName}
                    </p>
                    <p className='truncate text-xs text-gray-500'>{user.email}</p>
                  </div>
                </div>
                <div className='relative shrink-0 text-right'>
                  <button
                    type='button'
                    onClick={() => {
                      if (isLocaleMenuOpen) {
                        setIsLocaleMenuOpen(false)
                        setLocaleError('')
                        setLocaleSuccess('')
                      } else {
                        void openLocaleMenu()
                      }
                    }}
                    className='rounded-md px-1.5 py-1 transition hover:bg-gray-50'
                    aria-haspopup='menu'
                    aria-expanded={isLocaleMenuOpen}
                    aria-label='Open country and currency menu'
                  >
                    <span className='inline-flex items-center gap-1 text-[11px] font-normal text-gray-800'>
                      <span className='inline-flex h-3.5 w-5 items-center justify-center overflow-hidden rounded-sm border border-gray-200 bg-white'>
                        <CountryFlagIcon country={localeCountry} className='h-full w-full' />
                      </span>
                      {accountLocale}
                    </span>
                    <p className='mt-0.5 text-[10px] text-gray-500'>{localeCountry}</p>
                  </button>
                </div>
              </div>
              {isLocaleMenuOpen ? (
                <div className='mt-2 space-y-3 rounded-xl border border-gray-200 bg-gray-50/70 p-3'>
                  <div>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500'>
                      {t('locale.shipTo', 'Ship to')}
                    </p>
                    <div className='relative mt-1'>
                      <span className='pointer-events-none absolute left-3 top-1/2 inline-flex h-4 w-5 -translate-y-1/2 items-center justify-center overflow-hidden rounded-sm border border-gray-200 bg-white'>
                        <CountryFlagIcon country={localeCountry} className='h-full w-full' />
                      </span>
                      <select
                        value={localeCountry}
                        onChange={(event) => setLocaleCountry(event.target.value)}
                        className='h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-10 pr-10 text-sm text-gray-800 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10'
                      >
                        {ACCEPTED_COUNTRIES.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                      <svg
                        className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500'
                        viewBox='0 0 20 20'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='1.7'
                        aria-hidden='true'
                      >
                        <path strokeLinecap='round' strokeLinejoin='round' d='m6 8 4 4 4-4' />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500'>
                      {t('locale.language', 'Language')}
                    </p>
                    <div className='relative mt-1'>
                      <select
                        value={localeLanguage}
                        onChange={(event) => setLocaleLanguage(event.target.value)}
                        className='h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-10 text-sm text-gray-800 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10'
                      >
                        {languageOptions.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <svg
                        className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500'
                        viewBox='0 0 20 20'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='1.7'
                        aria-hidden='true'
                      >
                        <path strokeLinecap='round' strokeLinejoin='round' d='m6 8 4 4 4-4' />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500'>
                      {t('locale.currency', 'Currency')}
                    </p>
                    <div className='relative mt-1'>
                      <select
                        value={localeCurrency}
                        onChange={(event) => setLocaleCurrency(event.target.value)}
                        className='h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-10 text-sm text-gray-800 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10'
                      >
                        {allowedCurrencyOptions.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.code} ({option.symbol} {option.label})
                          </option>
                        ))}
                      </select>
                      <svg
                        className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500'
                        viewBox='0 0 20 20'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='1.7'
                        aria-hidden='true'
                      >
                        <path strokeLinecap='round' strokeLinejoin='round' d='m6 8 4 4 4-4' />
                      </svg>
                    </div>
                  </div>
                  {localeError ? (
                    <p className='text-xs text-rose-600'>{localeError}</p>
                  ) : null}
                  {localeSuccess ? (
                    <p className='text-xs text-emerald-600'>{localeSuccess}</p>
                  ) : null}
                  <div className='flex items-center gap-2 pt-1'>
                    <button
                      type='button'
                      onClick={() => {
                        setIsLocaleMenuOpen(false)
                        setLocaleError('')
                        setLocaleSuccess('')
                      }}
                      className='flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700'
                    >
                      {t('locale.back', 'Back')}
                    </button>
                    <button
                      type='button'
                      onClick={handleSaveLocaleSettings}
                      disabled={isLocaleSaving}
                      className='flex-1 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60'
                    >
                      {isLocaleSaving ? t('locale.saving', 'Saving...') : t('locale.save', 'Save')}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className='mt-1 max-h-[54vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent'
                  style={{ scrollbarWidth: 'thin' }}
                >
                  <div className='space-y-1'>
                    {USER_MENU_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className='w-full flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50'
                      >
                        <span className='inline-flex h-6 w-6 items-center justify-center text-gray-500'>
                          {renderMenuItemIcon(item.label)}
                        </span>
                        {translateMenuLabel(item.label, localeLanguage)}
                      </Link>
                    ))}
                  </div>
                  {requestMessage ? (
                    <p className='px-2 text-xs text-gray-500'>{requestMessage}</p>
                  ) : null}
                  <button
                    onClick={handleRequestAdmin}
                    disabled={isRequesting}
                    className='mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 disabled:opacity-60'
                  >
                    {isRequesting
                      ? t('auth.submitting', 'Submitting...')
                      : t('auth.requestAdmin', 'Request admin access')}
                  </button>
                  <button
                    onClick={handleLogout}
                    className='mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300'
                  >
                    {t('auth.logout', 'Logout')}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className='space-y-2'>
              <p className='text-sm text-gray-600 px-2'>{t('auth.notSignedIn', 'You are not signed in.')}</p>
              <Link
                href='/login'
                className='block w-full rounded-xl bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white'
              >
                {t('auth.signIn', 'Sign in')}
              </Link>
              <Link
                href='/signup'
                className='block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-700'
              >
                {t('auth.createAccount', 'Create account')}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
