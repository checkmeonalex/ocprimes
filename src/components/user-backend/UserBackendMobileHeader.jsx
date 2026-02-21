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
      <div className='relative mx-auto flex h-14 w-full max-w-3xl items-center justify-center px-4'>
        <Link
          href={isRootPage ? '/' : '/UserBackend'}
          className='absolute left-4 inline-flex h-10 w-10 items-center justify-center text-slate-600 transition hover:text-slate-900'
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

        <h1 className='max-w-[70%] truncate text-base font-semibold text-slate-900'>{translatedTitle}</h1>

        <Link
          href='/UserBackend/account-security'
          className='absolute right-4 inline-flex h-10 w-10 items-center justify-center text-slate-600 transition hover:text-slate-900'
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
              fillRule='evenodd'
              clipRule='evenodd'
              d='M6.31215 12.463C7.3125 8.5 8.7243 6.5 11.7 6.5C14.6757 6.5 16.0875 8.5 17.0878 12.463L18.525 18.029H13.9747C13.9776 18.677 13.7394 19.3018 13.3088 19.776C12.8947 20.2372 12.3113 20.4996 11.7 20.4996C11.0887 20.4996 10.5053 20.2372 10.0913 19.776C9.66059 19.3018 9.42243 18.677 9.42533 18.029H4.875L6.31215 12.463Z'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <path
              d='M12.675 5.25C13.0892 5.25 13.425 4.91421 13.425 4.5C13.425 4.08579 13.0892 3.75 12.675 3.75V5.25ZM10.725 3.75C10.3108 3.75 9.97498 4.08579 9.97498 4.5C9.97498 4.91421 10.3108 5.25 10.725 5.25V3.75ZM6.31213 11.713C5.89792 11.713 5.56213 12.0488 5.56213 12.463C5.56213 12.8772 5.89792 13.213 6.31213 13.213V11.713ZM17.0878 13.213C17.502 13.213 17.8378 12.8772 17.8378 12.463C17.8378 12.0488 17.502 11.713 17.0878 11.713V13.213ZM9.42433 17.279C9.01012 17.279 8.67433 17.6148 8.67433 18.029C8.67433 18.4432 9.01012 18.779 9.42433 18.779V17.279ZM13.9747 18.779C14.3889 18.779 14.7247 18.4432 14.7247 18.029C14.7247 17.6148 14.3889 17.279 13.9747 17.279V18.779ZM12.675 3.75H10.725V5.25H12.675V3.75ZM6.31213 13.213H17.0878V11.713H6.31213V13.213ZM9.42433 18.779H13.9747V17.279H9.42433V18.779Z'
              fill='currentColor'
            />
          </svg>
        </Link>
      </div>
    </header>
  )
}
