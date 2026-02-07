'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { USER_MENU_ITEMS } from '@/lib/user/menu-items'

export default function UserBackendNav({ displayName, email }) {
  const pathname = usePathname()

  return (
    <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
      <div className='pb-3'>
        <div className='flex items-center gap-2'>
          <span className='inline-flex h-6 w-6 items-center justify-center text-gray-400'>
            <svg
              className='h-4 w-4'
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
          </span>
          <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
            Account
          </p>
        </div>
        <p className='mt-1 text-sm font-semibold text-gray-900'>
          {displayName || 'User'}
        </p>
        <p className='text-[11px] text-gray-500'>{email}</p>
      </div>
      <div className='space-y-0.5'>
        {USER_MENU_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className='inline-flex h-6 w-6 items-center justify-center text-gray-400'>
                <svg
                  className='h-4 w-4'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                  aria-hidden='true'
                >
                  <path
                    d='M7 7h10M7 12h10M7 17h10'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                  />
                </svg>
              </span>
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
