'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { USER_MENU_ITEMS } from '@/lib/user/menu-items'
import UserNavIcon from '@/components/user-backend/UserNavIcon'
import { useUserI18n } from '@/lib/i18n/useUserI18n'
import { translateMenuLabel } from '@/lib/i18n/messages'
import { getBimojiCharacter } from './characters.mjs'
import CharacterSelectModal from './CharacterSelectModal'
import NotificationsRail from './NotificationsRail'
import StickySidebar from '@/components/user-backend/StickySidebar'

const normalizeLabel = (label) => {
  if (label === 'Your profile') return 'Edit Profile'
  if (label === 'Your orders') return 'Orders'
  return label
}

const handleFromEmail = (email) => {
  const [local] = String(email || '').split('@')
  return local ? local.toLowerCase() : 'ocprimes-user'
}

export default function BimojiAccountDashboard({
  displayName,
  email,
  location,
  shopHref = '/account/shop-access',
  showShopAction = false,
  bimojiCharacterId = '',
}) {
  const router = useRouter()
  const { locale, t } = useUserI18n()
  const [characterId, setCharacterId] = useState(bimojiCharacterId)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const autoOpenedRef = useRef(false)
  const character = getBimojiCharacter(characterId)

  const normalizedLocation =
    location === 'Location not set' ? t('home.locationNotSet', 'Location not set') : location

  // First visit (or no character yet): invite the user to pick one.
  useEffect(() => {
    if (character || autoOpenedRef.current) return undefined
    autoOpenedRef.current = true
    const timer = setTimeout(() => setIsPickerOpen(true), 450)
    return () => clearTimeout(timer)
  }, [character])

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    router.refresh()
    router.push('/login')
  }

  const quickActions = [
    { label: t('home.message', 'Message'), href: '/account/messages', iconLabel: 'Messages' },
    { label: translateMenuLabel('Wishlist', locale.language), href: '/account/wishlist', iconLabel: 'Wishlist' },
    { label: t('home.orders', 'Orders'), href: '/account/orders', iconLabel: 'Your orders' },
    ...(showShopAction
      ? [{ label: t('home.shop', 'Shop'), href: shopHref, iconLabel: 'Followed stores' }]
      : []),
  ]

  const pickCharacterLabel = character ? 'Switch look' : 'Pick character'

  return (
    <div className='mx-auto w-full max-w-3xl pb-10 lg:max-w-6xl lg:px-6 lg:pt-3'>
      <div className='lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-6'>
        <div className='min-w-0'>
      {/* Hero scene */}
      <section className='relative'>
        <div className='relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-400 sm:aspect-[16/9] lg:aspect-[2/1] lg:rounded-[28px] lg:shadow-[0_24px_60px_rgba(15,23,42,0.18)]'>
          {character ? (
            <Image
              src={character.scene}
              alt={`${character.name} profile scene`}
              fill
              priority
              sizes='(max-width: 768px) 100vw, (max-width: 1024px) 768px, 800px'
              className='object-cover object-top'
              placeholder='blur'
            />
          ) : (
            <div className='absolute inset-0 flex flex-col items-center justify-center gap-3 text-white'>
              <span className='inline-flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-white/70 bg-white/10 text-4xl font-black'>
                ?
              </span>
              <button
                type='button'
                onClick={() => setIsPickerOpen(true)}
                className='rounded-full bg-white px-5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-900 shadow-lg transition hover:scale-[1.03]'
              >
                Choose your character
              </button>
            </div>
          )}
          <div className='pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white via-white/40 to-transparent lg:h-28' />

          {/* Floating actions */}
          <div className='absolute right-3 top-3 flex items-center gap-2 lg:right-4 lg:top-4'>
            <Link
              href='/account/notifications'
              aria-label='Notifications'
              title='Notifications'
              className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/35 text-white backdrop-blur-md transition hover:bg-slate-950/55 active:scale-95'
            >
              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9' />
              </svg>
            </Link>
            {character ? (
              <button
                type='button'
                onClick={() => setIsPickerOpen(true)}
                aria-label='Switch character'
                title='Switch character'
                className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/35 text-white backdrop-blur-md transition hover:bg-slate-950/55 active:scale-95'
              >
                <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M16 3h5v5M8 21H3v-5M21 3l-7 7M3 21l7-7' />
                </svg>
              </button>
            ) : null}
            <Link
              href='/account/security'
              aria-label='Settings'
              title='Settings'
              className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/35 text-white backdrop-blur-md transition hover:bg-slate-950/55 active:scale-95'
            >
              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                <circle cx='12' cy='12' r='3' />
                <path strokeLinecap='round' strokeLinejoin='round' d='M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.98 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.98a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09c0 .68.4 1.3 1.03 1.56a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.26.63.88 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09c-.68 0-1.3.4-1.51 1.03Z' />
              </svg>
            </Link>
          </div>
        </div>

        {/* Identity card overlapping the hero */}
        <div className='relative z-10 -mt-12 px-4 lg:-mt-16 lg:px-6'>
          <div className='rounded-3xl border border-white/80 bg-white/85 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.14)] backdrop-blur-xl lg:p-6'>
            <div className='flex items-center gap-3.5 lg:gap-5'>
              <button
                type='button'
                onClick={() => setIsPickerOpen(true)}
                className='relative shrink-0 rounded-full transition hover:scale-[1.03] active:scale-95'
                aria-label={character ? 'Switch character' : 'Choose your character'}
              >
                {character ? (
                  <Image
                    src={character.avatar}
                    alt={`${character.name} avatar`}
                    width={96}
                    height={96}
                    sizes='(max-width: 1024px) 72px, 96px'
                    className='h-[72px] w-[72px] rounded-full border-[3px] border-white object-cover shadow-[0_10px_22px_rgba(15,23,42,0.25)] lg:h-24 lg:w-24'
                    placeholder='blur'
                  />
                ) : (
                  <span className='inline-flex h-[72px] w-[72px] items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-br from-indigo-500 to-sky-400 text-2xl font-black text-white shadow-[0_10px_22px_rgba(15,23,42,0.25)] lg:h-24 lg:w-24 lg:text-3xl'>
                    ?
                  </span>
                )}
                <span className='absolute -bottom-0.5 -right-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white lg:h-7 lg:w-7'>
                  <svg className='h-3 w-3' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' aria-hidden='true'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z' />
                  </svg>
                </span>
              </button>
              <div className='min-w-0 flex-1'>
                <p className='truncate text-xl font-bold tracking-tight text-slate-900 lg:text-2xl'>{displayName}</p>
                <p className='truncate text-xs font-medium text-slate-500 lg:text-sm'>@{handleFromEmail(email)}</p>
              </div>
              {/* Inline actions on desktop */}
              <div className='hidden shrink-0 items-center gap-2 lg:flex'>
                <Link
                  href='/account/profile'
                  className='rounded-full bg-slate-900 px-6 py-2.5 text-center text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-slate-700'
                >
                  {t('menu.editProfile', 'Edit Profile')}
                </Link>
                <button
                  type='button'
                  onClick={() => setIsPickerOpen(true)}
                  className='rounded-full border border-slate-300 bg-white px-6 py-2.5 text-center text-xs font-bold uppercase tracking-[0.12em] text-slate-800 transition hover:border-slate-500'
                >
                  {pickCharacterLabel}
                </button>
              </div>
            </div>

            <div className='mt-3 flex flex-wrap items-center gap-1.5'>
              <span className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600'>
                <svg className='h-3 w-3' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z' />
                  <circle cx='12' cy='10' r='3' />
                </svg>
                {normalizedLocation}
              </span>
              {character ? (
                <span className='inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-600'>
                  <svg className='h-3 w-3' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
                    <path d='m12 2 2.9 6.26L21 9.27l-5 4.6L17.3 21 12 17.6 6.7 21 8 13.87l-5-4.6 6.1-1.01L12 2Z' />
                  </svg>
                  {character.name}
                </span>
              ) : null}
              <span className='inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600'>
                OCPrimes
              </span>
            </div>

            {/* Stacked actions on mobile/tablet */}
            <div className='mt-3.5 grid grid-cols-2 gap-2 lg:hidden'>
              <Link
                href='/account/profile'
                className='rounded-full bg-slate-900 py-2.5 text-center text-xs font-bold uppercase tracking-[0.12em] text-white transition active:scale-[0.98]'
              >
                {t('menu.editProfile', 'Edit Profile')}
              </Link>
              <button
                type='button'
                onClick={() => setIsPickerOpen(true)}
                className='rounded-full border border-slate-300 bg-white py-2.5 text-center text-xs font-bold uppercase tracking-[0.12em] text-slate-800 transition active:scale-[0.98]'
              >
                {pickCharacterLabel}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className='mt-4 px-4 lg:mt-6 lg:px-0'>
        <div className={`grid gap-2 lg:gap-3 ${quickActions.length > 3 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {quickActions.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className='flex flex-col items-center gap-1.5 rounded-2xl border border-slate-100 bg-white py-3 shadow-[0_6px_16px_rgba(15,23,42,0.05)] transition active:scale-[0.97] lg:flex-row lg:justify-center lg:gap-2.5 lg:py-4 lg:hover:-translate-y-0.5 lg:hover:shadow-[0_14px_28px_rgba(15,23,42,0.10)]'
            >
              <span className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-700'>
                <UserNavIcon label={item.iconLabel} className='h-5 w-5' />
              </span>
              <span className='text-[11px] font-semibold text-slate-700 lg:text-sm'>{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Account center cards */}
      <section className='mt-5 px-4 lg:mt-7 lg:px-0'>
        <h2 className='px-1 text-sm font-bold uppercase tracking-[0.16em] text-slate-400'>
          {t('account.center', 'Account Center')}
        </h2>
        <div className='mt-2.5 grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3'>
          {USER_MENU_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_6px_16px_rgba(15,23,42,0.05)] transition active:scale-[0.98] lg:gap-3 lg:p-4 lg:hover:-translate-y-0.5 lg:hover:shadow-[0_14px_28px_rgba(15,23,42,0.10)] ${
                item.label === 'Notifications' ? 'lg:hidden' : ''
              }`}
            >
              <span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 lg:h-10 lg:w-10'>
                <UserNavIcon label={item.label} className='h-5 w-5' />
              </span>
              <span className='truncate text-[13px] font-semibold text-slate-800 lg:text-sm'>
                {normalizeLabel(item.label) === 'Edit Profile'
                  ? t('menu.editProfile', 'Edit Profile')
                  : normalizeLabel(item.label) === 'Orders'
                    ? t('home.orders', 'Orders')
                    : translateMenuLabel(normalizeLabel(item.label), locale.language)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className='mt-5 px-4 lg:mt-7 lg:px-0'>
        <button
          type='button'
          onClick={handleSignOut}
          className='w-full rounded-full border border-slate-200 bg-white py-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-rose-600 transition active:scale-[0.98] lg:mx-auto lg:block lg:max-w-xs lg:hover:border-rose-300 lg:hover:bg-rose-50'
        >
          {t('auth.logout', 'Logout')}
        </button>
      </section>
        </div>

        {/* Notifications rail (desktop only) */}
        <div className='hidden lg:block'>
          <StickySidebar topOffset={120} collapsedTopOffset={56} collapseAfter={20}>
            <NotificationsRail />
          </StickySidebar>
        </div>
      </div>

      <CharacterSelectModal
        open={isPickerOpen}
        initialCharacterId={characterId}
        onClose={() => setIsPickerOpen(false)}
        onSaved={(nextId) => {
          setCharacterId(nextId)
          setIsPickerOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}
