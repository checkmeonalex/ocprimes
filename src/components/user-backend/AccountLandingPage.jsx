'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { USER_MENU_ITEMS } from '@/lib/user/menu-items'
import UserNavIcon from '@/components/user-backend/UserNavIcon'
import { useUserI18n } from '@/lib/i18n/useUserI18n'
import { translateMenuLabel } from '@/lib/i18n/messages'

const getPrimaryActions = ({ shopHref }) => [
  { label: 'Message', href: '/UserBackend/messages', iconLabel: 'Message' },
  { label: 'Wishlist', href: '/UserBackend/wishlist', iconLabel: 'Wishlist' },
  { label: 'Orders', href: '/UserBackend/orders', iconLabel: 'Your orders' },
  { label: 'Shop', href: shopHref, iconLabel: 'Followed stores' },
]

const normalizeLabel = (label) => {
  if (label === 'Your profile') return 'Edit Profile'
  if (label === 'Your orders') return 'Orders'
  return label
}

const initialsFromName = (name) => {
  const safe = (name || '').trim()
  if (!safe) return 'U'
  const parts = safe.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || 'U'
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

export default function AccountLandingPage({
  displayName,
  email,
  location,
  isSignedIn = true,
  shopHref = '/backend/admin/dashboard',
}) {
  const router = useRouter()
  const { locale, t } = useUserI18n()
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false)
  const avatarMenuRef = useRef(null)
  const initials = initialsFromName(displayName)
  const primaryActions = getPrimaryActions({ shopHref })
  const normalizedLocation =
    location === 'Location not set'
      ? t('home.locationNotSet', 'Location not set')
      : location

  useEffect(() => {
    if (!isAvatarMenuOpen) return undefined

    const handlePointerDown = (event) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setIsAvatarMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsAvatarMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isAvatarMenuOpen])

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    setIsAvatarMenuOpen(false)
    router.refresh()
    router.push('/login')
  }

  return (
    <div className='mx-auto w-full max-w-3xl pb-8'>
      <section className='overflow-hidden border border-slate-200 bg-white shadow-sm'>
        <div className='relative overflow-hidden rounded-b-[36px] bg-[linear-gradient(132deg,#dff1ff_0%,#b9d9f2_44%,#93bede_100%)] px-5 pb-14 pt-6'>
          <div className='pointer-events-none absolute -left-14 -top-16 h-44 w-44 rounded-full bg-white/40 blur-2xl' />
          <div className='pointer-events-none absolute -right-10 top-6 h-36 w-36 rounded-full bg-sky-300/30 blur-2xl' />
          <div className='pointer-events-none absolute right-8 top-0 h-40 w-16 -rotate-12 rounded-full bg-white/22' />
          <div className='pointer-events-none absolute bottom-[-34px] left-1/2 h-20 w-[132%] -translate-x-1/2 rounded-[100%] bg-white/55' />
          <div className='relative flex items-center gap-4 rounded-2xl border border-white/55 bg-white/35 p-3'>
            <div className='relative' ref={avatarMenuRef}>
              <button
                type='button'
                onClick={() => setIsAvatarMenuOpen((prev) => !prev)}
                className='inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-base font-bold text-slate-800 shadow-sm ring-1 ring-slate-200'
                aria-haspopup='menu'
                aria-expanded={isAvatarMenuOpen}
                aria-label='Open profile menu'
              >
                {initials}
              </button>

              {isAvatarMenuOpen ? (
                <div className='absolute left-0 top-[calc(100%+0.75rem)] z-50 w-[18.5rem] rounded-[26px] border border-slate-200 bg-white p-3 text-slate-700 shadow-xl lg:hidden'>
                  <div className='flex items-center gap-2.5 border-b border-slate-100 pb-2.5'>
                    <button
                      type='button'
                      className='inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700'
                    >
                      Export
                      <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M12 3v12m0 0 4-4m-4 4-4-4M5 21h14' />
                      </svg>
                    </button>
                    <span className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600'>
                      <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M4 7h16M7 12h10M10 17h4' />
                      </svg>
                    </span>
                    <span className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600'>
                      <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5' />
                      </svg>
                    </span>
                    <span className='ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-xs font-semibold text-slate-800'>
                      {initials}
                    </span>
                  </div>

                  {isSignedIn ? (
                    <>
                      <div className='mt-2 space-y-1'>
                        <Link
                          href='/UserBackend/profile'
                          onClick={() => setIsAvatarMenuOpen(false)}
                          className='flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-base font-medium text-slate-800'
                        >
                          <UserNavIcon label='Your profile' className='h-5 w-5' />
                          {t('profile.title', 'Profile')}
                        </Link>
                        <Link
                          href='/UserBackend/shop-access'
                          onClick={() => setIsAvatarMenuOpen(false)}
                          className='flex items-center gap-3 rounded-xl px-3 py-2.5 text-base text-slate-700'
                        >
                          <svg className='h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                            <path strokeLinecap='round' strokeLinejoin='round' d='M6 19h12M6.5 7h11l-1 12h-9l-1-12ZM9 7V5a3 3 0 1 1 6 0v2' />
                          </svg>
                          Upgrade
                        </Link>
                        <Link
                          href='/UserBackend/account-security'
                          onClick={() => setIsAvatarMenuOpen(false)}
                          className='flex items-center gap-3 rounded-xl px-3 py-2.5 text-base text-slate-700'
                        >
                          <svg className='h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                            <path strokeLinecap='round' strokeLinejoin='round' d='M12 4 5 7v5c0 4.5 3.1 7 7 8 3.9-1 7-3.5 7-8V7l-7-3z' />
                          </svg>
                          Settings
                        </Link>
                        <Link
                          href='/UserBackend/notifications'
                          onClick={() => setIsAvatarMenuOpen(false)}
                          className='flex items-center gap-3 rounded-xl px-3 py-2.5 text-base text-slate-700'
                        >
                          <svg className='h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                            <path strokeLinecap='round' strokeLinejoin='round' d='M4 12a8 8 0 0 1 16 0v6H4v-6Z' />
                            <path strokeLinecap='round' strokeLinejoin='round' d='M9 18v.5a3 3 0 0 0 6 0V18' />
                          </svg>
                          Help Center
                        </Link>
                      </div>

                      <div className='mt-2 border-t border-slate-200 pt-2'>
                        <button
                          type='button'
                          onClick={handleSignOut}
                          className='flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-base text-slate-700'
                        >
                          <svg className='h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                            <path strokeLinecap='round' strokeLinejoin='round' d='M16 17l5-5-5-5M21 12H9M12 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6' />
                          </svg>
                          {t('auth.logout', 'Logout')}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className='mt-2 space-y-1'>
                      <Link
                        href='/login?next=/UserBackend'
                        onClick={() => setIsAvatarMenuOpen(false)}
                        className='flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-base font-medium text-slate-800'
                      >
                        <svg className='h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                          <path strokeLinecap='round' strokeLinejoin='round' d='M16 17l5-5-5-5M21 12H9M12 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6' />
                        </svg>
                        Login
                      </Link>
                      <Link
                        href='/signup'
                        onClick={() => setIsAvatarMenuOpen(false)}
                        className='flex items-center gap-3 rounded-xl px-3 py-2.5 text-base text-slate-700'
                      >
                        <svg className='h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                          <path strokeLinecap='round' strokeLinejoin='round' d='M12 5v14M5 12h14' />
                        </svg>
                        New customer
                      </Link>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className='min-w-0'>
              <p className='truncate text-2xl font-semibold text-slate-800'>{displayName}</p>
              <p className='truncate text-sm text-slate-600'>{normalizedLocation}</p>
              <p className='truncate text-xs text-slate-500'>{email}</p>
            </div>
          </div>
        </div>

        <div className='-mt-6 border-b border-slate-200 bg-white px-4 pb-4 pt-3'>
          <div className='grid grid-cols-4 gap-2'>
            {primaryActions.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className='rounded-2xl px-1 py-2 text-center transition-colors hover:bg-slate-50'
              >
                <span className='mx-auto inline-flex h-11 w-11 items-center justify-center text-slate-600'>
                  {item.label === 'Message' ? (
                    <svg
                      className='h-6 w-6'
                      viewBox='0 0 24 24'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                      aria-hidden='true'
                    >
                      <path d='M8 9H16' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
                      <path d='M8 12.5H13.5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
                      <path
                        d='M13.0867 21.3877L13.7321 21.7697L13.0867 21.3877ZM13.6288 20.4718L12.9833 20.0898L13.6288 20.4718ZM10.3712 20.4718L9.72579 20.8539H9.72579L10.3712 20.4718ZM10.9133 21.3877L11.5587 21.0057L10.9133 21.3877ZM1.25 10.5C1.25 10.9142 1.58579 11.25 2 11.25C2.41421 11.25 2.75 10.9142 2.75 10.5H1.25ZM3.07351 15.6264C2.915 15.2437 2.47627 15.062 2.09359 15.2205C1.71091 15.379 1.52918 15.8177 1.68769 16.2004L3.07351 15.6264ZM7.78958 18.9915L7.77666 19.7413L7.78958 18.9915ZM5.08658 18.6194L4.79957 19.3123H4.79957L5.08658 18.6194ZM21.6194 15.9134L22.3123 16.2004V16.2004L21.6194 15.9134ZM16.2104 18.9915L16.1975 18.2416L16.2104 18.9915ZM18.9134 18.6194L19.2004 19.3123H19.2004L18.9134 18.6194ZM19.6125 2.7368L19.2206 3.37628L19.6125 2.7368ZM21.2632 4.38751L21.9027 3.99563V3.99563L21.2632 4.38751ZM4.38751 2.7368L3.99563 2.09732V2.09732L4.38751 2.7368ZM2.7368 4.38751L2.09732 3.99563H2.09732L2.7368 4.38751ZM9.40279 19.2098L9.77986 18.5615L9.77986 18.5615L9.40279 19.2098ZM13.7321 21.7697L14.2742 20.8539L12.9833 20.0898L12.4412 21.0057L13.7321 21.7697ZM9.72579 20.8539L10.2679 21.7697L11.5587 21.0057L11.0166 20.0898L9.72579 20.8539ZM12.4412 21.0057C12.2485 21.3313 11.7515 21.3313 11.5587 21.0057L10.2679 21.7697C11.0415 23.0767 12.9585 23.0767 13.7321 21.7697L12.4412 21.0057ZM10.5 2.75H13.5V1.25H10.5V2.75ZM21.25 10.5V11.5H22.75V10.5H21.25ZM7.8025 18.2416C6.54706 18.2199 5.88923 18.1401 5.37359 17.9265L4.79957 19.3123C5.60454 19.6457 6.52138 19.7197 7.77666 19.7413L7.8025 18.2416ZM1.68769 16.2004C2.27128 17.6093 3.39066 18.7287 4.79957 19.3123L5.3736 17.9265C4.33223 17.4951 3.50486 16.6678 3.07351 15.6264L1.68769 16.2004ZM21.25 11.5C21.25 12.6751 21.2496 13.5189 21.2042 14.1847C21.1592 14.8438 21.0726 15.2736 20.9265 15.6264L22.3123 16.2004C22.5468 15.6344 22.6505 15.0223 22.7007 14.2868C22.7504 13.5581 22.75 12.6546 22.75 11.5H21.25ZM16.2233 19.7413C17.4786 19.7197 18.3955 19.6457 19.2004 19.3123L18.6264 17.9265C18.1108 18.1401 17.4529 18.2199 16.1975 18.2416L16.2233 19.7413ZM20.9265 15.6264C20.4951 16.6678 19.6678 17.4951 18.6264 17.9265L19.2004 19.3123C20.6093 18.7287 21.7287 17.6093 22.3123 16.2004L20.9265 15.6264ZM13.5 2.75C15.1512 2.75 16.337 2.75079 17.2619 2.83873C18.1757 2.92561 18.7571 3.09223 19.2206 3.37628L20.0044 2.09732C19.2655 1.64457 18.4274 1.44279 17.4039 1.34547C16.3915 1.24921 15.1222 1.25 13.5 1.25V2.75ZM22.75 10.5C22.75 8.87781 22.7508 7.6085 22.6545 6.59611C22.5572 5.57256 22.3554 4.73445 21.9027 3.99563L20.6237 4.77938C20.9078 5.24291 21.0744 5.82434 21.1613 6.73809C21.2492 7.663 21.25 8.84876 21.25 10.5H22.75ZM19.2206 3.37628C19.7925 3.72672 20.2733 4.20752 20.6237 4.77938L21.9027 3.99563C21.4286 3.22194 20.7781 2.57144 20.0044 2.09732L19.2206 3.37628ZM10.5 1.25C8.87781 1.25 7.6085 1.24921 6.59611 1.34547C5.57256 1.44279 4.73445 1.64457 3.99563 2.09732L4.77938 3.37628C5.24291 3.09223 5.82434 2.92561 6.73809 2.83873C7.663 2.75079 8.84876 2.75 10.5 2.75V1.25ZM2.75 10.5C2.75 8.84876 2.75079 7.663 2.83873 6.73809C2.92561 5.82434 3.09223 5.24291 3.37628 4.77938L2.09732 3.99563C1.64457 4.73445 1.44279 5.57256 1.34547 6.59611C1.24921 7.6085 1.25 8.87781 1.25 10.5H2.75ZM3.99563 2.09732C3.22194 2.57144 2.57144 3.22194 2.09732 3.99563L3.37628 4.77938C3.72672 4.20752 4.20752 3.72672 4.77938 3.37628L3.99563 2.09732ZM11.0166 20.0898C10.8136 19.7468 10.6354 19.4441 10.4621 19.2063C10.2795 18.9559 10.0702 18.7304 9.77986 18.5615L9.02572 19.8582C9.07313 19.8857 9.13772 19.936 9.24985 20.0898C9.37122 20.2564 9.50835 20.4865 9.72579 20.8539L11.0166 20.0898ZM7.77666 19.7413C8.21575 19.7489 8.49387 19.7545 8.70588 19.7779C8.90399 19.7999 8.98078 19.832 9.02572 19.8582L9.77986 18.5615C9.4871 18.3912 9.18246 18.3215 8.87097 18.287C8.57339 18.2541 8.21375 18.2487 7.8025 18.2416L7.77666 19.7413ZM14.2742 20.8539C14.4916 20.4865 14.6287 20.2564 14.7501 20.0898C14.8622 19.936 14.9268 19.8857 14.9742 19.8582L14.2201 18.5615C13.9298 18.7304 13.7204 18.9559 13.5379 19.2063C13.3646 19.4441 13.1864 19.7468 12.9833 20.0898L14.2742 20.8539ZM16.1975 18.2416C15.7862 18.2487 15.4266 18.2541 15.129 18.287C14.8175 18.3215 14.5129 18.3912 14.2201 18.5615L14.9742 19.8582C15.0192 19.832 15.096 19.7999 15.2941 19.7779C15.5061 19.7545 15.7842 19.7489 16.2233 19.7413L16.1975 18.2416Z'
                        fill='currentColor'
                      />
                    </svg>
                  ) : item.label === 'Shop' ? (
                    <svg
                      className='h-6 w-6'
                      viewBox='-2.4 -2.4 28.80 28.80'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                      aria-hidden='true'
                    >
                      <path d='M22 22H2' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'></path>
                      <path opacity='0.5' d='M20 22V11' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'></path>
                      <path opacity='0.5' d='M4 22V11' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'></path>
                      <path d='M16.5278 2H7.47214C6.26932 2 5.66791 2 5.18461 2.2987C4.7013 2.5974 4.43234 3.13531 3.89443 4.21114L2.49081 7.75929C2.16652 8.57905 1.88279 9.54525 2.42867 10.2375C2.79489 10.7019 3.36257 11 3.99991 11C5.10448 11 5.99991 10.1046 5.99991 9C5.99991 10.1046 6.89534 11 7.99991 11C9.10448 11 9.99991 10.1046 9.99991 9C9.99991 10.1046 10.8953 11 11.9999 11C13.1045 11 13.9999 10.1046 13.9999 9C13.9999 10.1046 14.8953 11 15.9999 11C17.1045 11 17.9999 10.1046 17.9999 9C17.9999 10.1046 18.8953 11 19.9999 11C20.6373 11 21.205 10.7019 21.5712 10.2375C22.1171 9.54525 21.8334 8.57905 21.5091 7.75929L20.1055 4.21114C19.5676 3.13531 19.2986 2.5974 18.8153 2.2987C18.332 2 17.7306 2 16.5278 2Z' stroke='currentColor' strokeWidth='1.5' strokeLinejoin='round'></path>
                      <path opacity='0.5' d='M9.5 21.5V18.5C9.5 17.5654 9.5 17.0981 9.70096 16.75C9.83261 16.522 10.022 16.3326 10.25 16.201C10.5981 16 11.0654 16 12 16C12.9346 16 13.4019 16 13.75 16.201C13.978 16.3326 14.1674 16.522 14.299 16.75C14.5 17.0981 14.5 17.5654 14.5 18.5V21.5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'></path>
                    </svg>
                  ) : (
                    <UserNavIcon label={item.iconLabel} className='h-6 w-6' />
                  )}
                </span>
                <span className='mt-2 block text-xs font-semibold text-slate-700'>
                  {item.label === 'Message'
                    ? t('home.message', 'Message')
                    : item.label === 'Orders'
                      ? t('home.orders', 'Orders')
                      : item.label === 'Shop'
                        ? t('home.shop', 'Shop')
                        : translateMenuLabel(item.label, locale.language)}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className='px-5 py-4'>
          <h2 className='text-2xl font-semibold text-slate-800'>{t('account.center', 'Account Center')}</h2>
          <div className='mt-2 divide-y divide-slate-200'>
            {USER_MENU_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className='flex items-center justify-between gap-3 py-4 text-slate-700 hover:text-slate-900'
              >
                <span className='flex min-w-0 items-center gap-3'>
                  <span className='inline-flex h-9 w-9 items-center justify-center text-slate-500'>
                    <UserNavIcon label={item.label} className='h-6 w-6' />
                  </span>
                  <span className='truncate text-base font-medium sm:text-lg'>
                    {normalizeLabel(item.label) === 'Edit Profile'
                      ? t('menu.editProfile', 'Edit Profile')
                      : normalizeLabel(item.label) === 'Orders'
                        ? t('home.orders', 'Orders')
                        : translateMenuLabel(normalizeLabel(item.label), locale.language)}
                  </span>
                </span>
                <svg
                  className='h-5 w-5 text-slate-400'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.8'
                  aria-hidden='true'
                >
                  <path strokeLinecap='round' strokeLinejoin='round' d='m9 6 6 6-6 6' />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
