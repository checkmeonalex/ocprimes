'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import useAdminProfileIdentity from '@/components/admin/useAdminProfileIdentity'
import { getProfileIdentityImageUrl, getProfileIdentityInitials } from '@/lib/user/profile-identity-cache'
import { useAdminTheme } from '@/context/AdminThemeContext'

const TITLE_BY_PATH = {
  '/backend/admin': 'Dashboard',
  '/backend/admin/dashboard': 'Dashboard',
  '/admin': 'Dashboard',
  '/admin/dashboard': 'Dashboard',
  '/admin/orders': 'Orders',
  '/admin/messages': 'Messages',
  '/admin/products': 'Products',
  '/admin/logistics': 'Logistics',
  '/admin/settings': 'More',
  '/admin/templates': 'Templates',
  '/admin/store-front': 'Store Front',
  '/admin/customers': 'Customers',
  '/admin/reviews': 'Reviews',
  '/admin/notifications': 'Notifications',
  '/admin/categories': 'Categories',
  '/admin/brands': 'Brands',
  '/admin/tags': 'Tags',
  '/admin/attributes': 'Attributes',
  '/admin/library': 'Library',
  '/admin/size-guides': 'Size Guides',
  '/admin/pages': 'Pages',
  '/admin/pages/home': 'Home Editor',
  '/backend/admin/pages/home': 'Home Editor',
  '/admin/extra': 'Extra',
  '/admin/permissions': 'Permissions',
  '/backend/admin/permissions': 'Permissions',
  '/backend/admin/orders': 'Orders',
  '/backend/admin/messages': 'Messages',
  '/backend/admin/products': 'Products',
  '/backend/admin/logistics': 'Logistics',
  '/backend/admin/settings': 'More',
  '/backend/admin/templates': 'Templates',
  '/backend/admin/store-front': 'Store Front',
  '/backend/admin/customers': 'Customers',
  '/backend/admin/reviews': 'Reviews',
  '/backend/admin/notifications': 'Notifications',
  '/backend/admin/admin/brands': 'Manage Sellers',
}

const toTitleCase = (value) =>
  String(value || '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())

const resolveTitleFromPath = (pathname) => {
  if (!pathname) return 'Dashboard'
  if (pathname === '/backend/admin/products/new' || pathname === '/admin/products/new') return 'Create Product'
  if (pathname.startsWith('/backend/admin/products/') || pathname.startsWith('/admin/products/')) {
    const segments = pathname.split('/').filter(Boolean)
    const productSegment = segments[segments.findIndex((segment) => segment === 'products') + 1] || ''
    if (productSegment && productSegment !== 'new') return 'Edit Product'
  }
  // Customer sub-pages
  if (pathname.startsWith('/backend/admin/customers/') || pathname.startsWith('/admin/customers/')) {
    const segments = pathname.split('/').filter(Boolean)
    const afterCustomers = segments[segments.findIndex((s) => s === 'customers') + 2] || ''
    if (afterCustomers === 'orders') return 'Customer Orders'
    if (afterCustomers === 'addresses') return 'Addresses'
    if (afterCustomers === 'about') return 'About'
    if (afterCustomers === 'security') return 'Security'
    return 'Customer'
  }
  if (TITLE_BY_PATH[pathname]) return TITLE_BY_PATH[pathname]

  const sorted = Object.keys(TITLE_BY_PATH).sort((a, b) => b.length - a.length)
  const matchingPrefix = sorted.find(
    (prefix) => pathname.startsWith(`${prefix}/`) && TITLE_BY_PATH[prefix] === 'Dashboard',
  )
  if (matchingPrefix) return TITLE_BY_PATH[matchingPrefix]

  const segments = pathname.split('/').filter(Boolean)
  const backendIndex = segments.findIndex((segment) => segment === 'admin')
  const firstAfterAdmin = backendIndex >= 0 ? segments[backendIndex + 1] : ''
  if (firstAfterAdmin) return toTitleCase(firstAfterAdmin)

  const last = segments[segments.length - 1]
  return last ? toTitleCase(last) : 'Dashboard'
}

export default function AdminMobileHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const profileIdentity = useAdminProfileIdentity()
  const profileInitials = getProfileIdentityInitials(profileIdentity?.displayName)
  const profileImageUrl = getProfileIdentityImageUrl(profileIdentity)
  const title = useMemo(() => resolveTitleFromPath(pathname), [pathname])
  const { isDark, toggleTheme } = useAdminTheme()
  const [role, setRole] = useState('')
  const [storeSlug, setStoreSlug] = useState('')
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/auth/role', { cache: 'no-store', credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (active && payload?.role) setRole(payload.role)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (role !== 'vendor') return undefined
    let active = true
    fetch('/api/admin/store-front', { cache: 'no-store', credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (active && payload?.item?.slug) setStoreSlug(payload.item.slug)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [role])

  const handleProfileSignOut = async () => {
    setIsSigningOut(true)
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } finally {
      const destination = role === 'vendor' ? '/vendor/login' : role === 'admin' ? '/admin/login' : '/login'
      router.push(destination)
    }
  }
  const isProductEditorRoute = useMemo(() => {
    if (!pathname) return false
    if (pathname === '/backend/admin/products/new' || pathname === '/admin/products/new') return true
    if (pathname.startsWith('/backend/admin/products/') || pathname.startsWith('/admin/products/')) {
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
    <>
    <header className='fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-zinc-700/50 dark:bg-[#0a0a0a]/95 lg:hidden'>
      <div className='mx-auto flex h-12 w-full items-center justify-between px-4'>
        <h1 className='text-xl font-semibold tracking-tight text-slate-900 dark:text-white'>{title}</h1>
        <div className='flex items-center gap-2'>
          {storeSlug ? (
            <button
              type='button'
              onClick={() => router.push(`/vendors/${storeSlug}`)}
              className='flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800'
              aria-label='Back to shop'
              title='Back to shop'
            >
              <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='1.8'>
                <path d='M3.5 10.5h17M5 10.5V19h14v-8.5M4.5 6h15l1 4.5h-17Z' strokeLinejoin='round' />
                <path d='M9.5 14h5V19h-5Z' strokeLinejoin='round' />
              </svg>
            </button>
          ) : null}
          {/* Dark mode toggle on mobile */}
          <button
            type='button'
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className='flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          >
            {isDark ? (
              <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='1.8'>
                <path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            ) : (
              <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='1.8'>
                <path d='M12 3v1.5M12 19.5V21M4.9 4.9l1.1 1.1M18 18l1.1 1.1M3 12h1.5M19.5 12H21M4.9 19.1 6 18M18 6l1.1-1.1' />
                <circle cx='12' cy='12' r='4' />
              </svg>
            )}
          </button>
          <button
            type='button'
            onClick={() => router.push('/admin/messages')}
            className='flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800'
            aria-label='Messages'
          >
            <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='1.8'>
              <path d='M5.5 6.5h13a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H12l-4.5 3v-3H5.5A1.5 1.5 0 0 1 4 15V8a1.5 1.5 0 0 1 1.5-1.5Z' />
              <path d='M8 10.5h8M8 13.5h5' strokeLinecap='round' />
            </svg>
          </button>
          <button
            type='button'
            onClick={() => router.push('/admin/notifications')}
            className='relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-zinc-800 dark:text-slate-300 dark:ring-zinc-700'
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
          <button
            type='button'
            onClick={() => setIsProfileSheetOpen(true)}
            className='flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-[11px] font-semibold uppercase tracking-[0.04em] text-white dark:bg-slate-700'
            title={profileIdentity?.displayName || 'Admin User'}
            aria-label={profileIdentity?.displayName || 'Admin User'}
          >
            {profileImageUrl ? (
              <img src={profileImageUrl} alt={profileIdentity?.displayName || 'Profile'} className='h-full w-full object-cover' />
            ) : (
              profileInitials
            )}
          </button>
        </div>
      </div>
    </header>

    {isProfileSheetOpen ? (
        <div
          className='fixed inset-0 z-[9999] flex items-end bg-slate-900/40'
          onClick={() => setIsProfileSheetOpen(false)}
        >
          <div
            className='w-full rounded-t-3xl bg-white px-5 pb-6 pt-4 shadow-[0_-10px_30px_rgba(15,23,42,0.2)] dark:bg-[#0a0a0a]'
            onClick={(event) => event.stopPropagation()}
          >
            <div className='mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 dark:bg-zinc-700' />
            <div className='flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-zinc-700/60'>
              <div className='flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-slate-700'>
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt='' className='h-full w-full object-cover' />
                ) : (
                  profileInitials
                )}
              </div>
              <div className='min-w-0'>
                <p className='truncate text-sm font-semibold text-slate-900 dark:text-white'>
                  {profileIdentity?.displayName || 'Admin User'}
                </p>
                {profileIdentity?.email && (
                  <p className='truncate text-xs text-slate-500 dark:text-slate-400'>{profileIdentity.email}</p>
                )}
                {role && (
                  <span className='mt-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-white/10 dark:text-slate-300'>
                    {role}
                  </span>
                )}
              </div>
            </div>
            <div className='mt-3 space-y-2'>
              <button
                type='button'
                onClick={() => { setIsProfileSheetOpen(false); router.push('/admin/settings') }}
                className='flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-800 dark:border-zinc-700/60 dark:text-slate-200'
              >
                <span>Settings</span>
                <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400' fill='none' stroke='currentColor' strokeWidth='1.8'>
                  <path d='m9 6 6 6-6 6' />
                </svg>
              </button>
              <button
                type='button'
                onClick={handleProfileSignOut}
                disabled={isSigningOut}
                className='flex w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/30'
              >
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
