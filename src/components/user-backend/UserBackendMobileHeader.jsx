'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { USER_MENU_ITEMS } from '@/lib/user/menu-items'
import { useUserI18n } from '@/lib/i18n/useUserI18n'
import { translateMenuLabel } from '@/lib/i18n/messages'

const TITLE_BY_PATH = USER_MENU_ITEMS.reduce((acc, item) => {
  acc[item.href] = item.label
  return acc
}, {})
TITLE_BY_PATH['/UserBackend/shop-access'] = 'Shop Access'

const prettifyTitle = (title) => {
  if (title === 'Your profile') return 'Profile'
  if (title === 'Your orders') return 'Orders'
  if (title === 'Wishlist') return 'Saved Items'
  return title
}

export default function UserBackendMobileHeader() {
  const pathname = usePathname()
  const { locale, t } = useUserI18n()
  const isRootPage = pathname === '/UserBackend'
  const isOrderDetailsPage = /^\/UserBackend\/orders\/[^/]+$/.test(String(pathname || ''))
  const rawTitle = isRootPage ? 'Account' : isOrderDetailsPage ? 'Order' : TITLE_BY_PATH[pathname] || 'Account'
  const title = prettifyTitle(rawTitle)
  const translatedTitle = (() => {
    if (isRootPage) return t('account.title', 'Account')
    if (isOrderDetailsPage) return 'Order'
    if (title === 'Saved Items') return t('menu.savedItems', 'Saved Items')
    if (title === 'Profile') return t('menu.editProfile', 'Edit Profile')
    if (title === 'Orders') return t('home.orders', 'Orders')
    if (title === 'Shop Access') return t('menu.shopAccess', 'Shop Access')
    return translateMenuLabel(title, locale.language)
  })()

  return (
    <header className='fixed inset-x-0 top-0 z-[1200] border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)] lg:hidden'>
      <div className='mx-auto grid h-14 w-full max-w-3xl grid-cols-[2.5rem_1fr_2.5rem] items-center px-2'>
        <Link
          href={isRootPage ? '/' : '/UserBackend'}
          className='inline-flex h-10 w-10 items-center justify-center text-slate-600 transition hover:text-slate-900'
          aria-label={isRootPage ? 'Back to home' : 'Back to account'}
        >
          <svg
            className='h-6 w-6'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            aria-hidden='true'
          >
            <path strokeLinecap='round' strokeLinejoin='round' d='m15 18-6-6 6-6' />
          </svg>
        </Link>

        <h1 className='truncate px-2 text-center text-base font-semibold text-slate-900'>
          {translatedTitle}
        </h1>

        <Link
          href='/UserBackend/account-security'
          className='inline-flex h-10 w-10 items-center justify-center text-slate-600 transition hover:text-slate-900'
          aria-label='Notifications'
        >
          <svg
            className='h-6 w-6'
            viewBox='0 0 24 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
            aria-hidden='true'
          >
            <path
              d='M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V10a6 6 0 1 0-12 0v4.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </Link>
      </div>
    </header>
  )
}
