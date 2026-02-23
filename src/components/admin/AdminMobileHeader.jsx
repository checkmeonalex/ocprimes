'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import useAdminProfileIdentity from '@/components/admin/useAdminProfileIdentity'
import { getProfileIdentityImageUrl, getProfileIdentityInitials } from '@/lib/user/profile-identity-cache'

const TITLE_BY_PATH = {
  '/backend/admin': 'Homepage',
  '/backend/admin/dashboard': 'Homepage',
  '/backend/admin/orders': 'Orders',
  '/backend/admin/messages': 'Messages',
  '/backend/admin/products': 'Products',
  '/backend/admin/settings': 'More',
}

const toTitleCase = (value) =>
  String(value || '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())

const resolveTitleFromPath = (pathname) => {
  if (!pathname) return 'Homepage'
  if (pathname === '/backend/admin/products/new') return 'Create Product'
  if (pathname.startsWith('/backend/admin/products/')) {
    const segments = pathname.split('/').filter(Boolean)
    const productSegment = segments[segments.findIndex((segment) => segment === 'products') + 1] || ''
    if (productSegment && productSegment !== 'new') return 'Edit Product'
  }
  if (TITLE_BY_PATH[pathname]) return TITLE_BY_PATH[pathname]

  const sorted = Object.keys(TITLE_BY_PATH).sort((a, b) => b.length - a.length)
  const matchingPrefix = sorted.find(
    (prefix) => pathname.startsWith(`${prefix}/`) && TITLE_BY_PATH[prefix] === 'Homepage',
  )
  if (matchingPrefix) return TITLE_BY_PATH[matchingPrefix]

  const segments = pathname.split('/').filter(Boolean)
  const backendIndex = segments.findIndex((segment) => segment === 'admin')
  const firstAfterAdmin = backendIndex >= 0 ? segments[backendIndex + 1] : ''
  if (firstAfterAdmin) return toTitleCase(firstAfterAdmin)

  const last = segments[segments.length - 1]
  return last ? toTitleCase(last) : 'Homepage'
}

export default function AdminMobileHeader() {
  const pathname = usePathname()
  const profileIdentity = useAdminProfileIdentity()
  const profileInitials = getProfileIdentityInitials(profileIdentity?.displayName)
  const profileImageUrl = getProfileIdentityImageUrl(profileIdentity)
  const title = useMemo(() => resolveTitleFromPath(pathname), [pathname])
  const isProductEditorRoute = useMemo(() => {
    if (!pathname) return false
    if (pathname === '/backend/admin/products/new') return true
    if (pathname.startsWith('/backend/admin/products/')) {
      const parts = pathname.split('/').filter(Boolean)
      const productSegment = parts[parts.findIndex((segment) => segment === 'products') + 1] || ''
      return Boolean(productSegment && productSegment !== 'new')
    }
    return false
  }, [pathname])

  if (isProductEditorRoute) {
    return null
  }

  return (
    <header className='fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur lg:hidden'>
      <div className='mx-auto flex h-16 w-full items-center justify-between px-4'>
        <h1 className='text-[2rem] font-semibold leading-none text-slate-900'>{title}</h1>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            className='relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200'
            aria-label='Notifications'
          >
            <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <path
                d='M15 19.25C15 20.0456 14.6839 20.8087 14.1213 21.3713C13.5587 21.9339 12.7956 22.25 12 22.25C11.2044 22.25 10.4413 21.9339 9.87869 21.3713C9.31608 20.8087 9 20.0456 9 19.25'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <path
                d='M5.58096 18.25C5.09151 18.1461 4.65878 17.8626 4.36813 17.4553C4.07748 17.048 3.95005 16.5466 4.01098 16.05L5.01098 7.93998C5.2663 6.27263 6.11508 4.75352 7.40121 3.66215C8.68734 2.57077 10.3243 1.98054 12.011 1.99998V1.99998C13.6977 1.98054 15.3346 2.57077 16.6207 3.66215C17.9069 4.75352 18.7557 6.27263 19.011 7.93998L20.011 16.05C20.0723 16.5452 19.9462 17.0454 19.6576 17.4525C19.369 17.8595 18.9386 18.144 18.451 18.25C14.2186 19.2445 9.81332 19.2445 5.58096 18.25V18.25Z'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
            <span className='absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500' />
          </button>
          <div
            className='flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-[11px] font-semibold uppercase tracking-[0.04em] text-white'
            title={profileIdentity?.displayName || 'Admin User'}
            aria-label={profileIdentity?.displayName || 'Admin User'}
          >
            {profileImageUrl ? (
              <img src={profileImageUrl} alt={profileIdentity?.displayName || 'Profile'} className='h-full w-full object-cover' />
            ) : (
              profileInitials
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
