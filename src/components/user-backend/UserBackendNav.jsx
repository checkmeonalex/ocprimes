'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { USER_MENU_ITEMS } from '@/lib/user/menu-items'
import UserNavIcon from '@/components/user-backend/UserNavIcon'
import { useUserI18n } from '@/lib/i18n/useUserI18n'
import { translateMenuLabel } from '@/lib/i18n/messages'

export default function UserBackendNav({ displayName, email }) {
  const pathname = usePathname()
  const { locale } = useUserI18n()
  const initial = (displayName?.trim()?.[0] || 'U').toUpperCase()

  return (
    <div className='no-scrollbar rounded-xl bg-white p-3 shadow-sm lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto'>
      <div className='border-b border-slate-200 pb-3'>
        <div className='flex items-center gap-2'>
          <span className='inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white'>
            {initial}
          </span>
          <div className='min-w-0'>
            <p className='truncate text-sm font-semibold text-slate-900'>
              {displayName || 'User'}
            </p>
            <p className='truncate text-[11px] text-slate-500'>{email}</p>
          </div>
        </div>
      </div>
      <div className='mt-3 space-y-1'>
        {USER_MENU_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span
                className={`inline-flex h-7 w-7 items-center justify-center ${
                  isActive ? 'text-white' : 'text-slate-400'
                }`}
              >
                <UserNavIcon label={item.label} className='h-5 w-5' />
              </span>
              {translateMenuLabel(item.label, locale.language)}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
