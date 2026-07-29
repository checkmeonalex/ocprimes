'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuthUser } from '@/lib/auth/useAuthUser'
import { getAccountSearchSuggestions } from '@/lib/user/account-search.ts'

/**
 * The "Account Center" sub-header shown across account pages: account page
 * search, notification bell, an optional shop-dashboard shortcut for
 * vendors/admins, and logout.
 */
export default function AccountCenterBar({ initialAuthUser = null }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuthUser(initialAuthUser, true)

  const [hasVendorAccess, setHasVendorAccess] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [accountSearchValue, setAccountSearchValue] = useState('')
  const [isAccountSearchOpen, setIsAccountSearchOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const accountSearchRef = useRef(null)

  const hasAccountSearchQuery = accountSearchValue.trim().length > 0
  const accountSearchSuggestions = useMemo(
    () => getAccountSearchSuggestions({ query: accountSearchValue, hasVendorAccess }),
    [accountSearchValue, hasVendorAccess],
  )

  useEffect(() => {
    let cancelled = false
    const loadRole = async () => {
      if (!user) {
        setHasVendorAccess(false)
        return
      }
      try {
        const response = await fetch('/api/auth/role', { cache: 'no-store' })
        if (!response.ok) {
          if (!cancelled) setHasVendorAccess(false)
          return
        }
        const payload = await response.json().catch(() => null)
        if (cancelled) return
        const normalizedRole = String(payload?.role || '').trim().toLowerCase()
        const roleList = Array.isArray(payload?.roles)
          ? payload.roles.map((role) => String(role || '').trim().toLowerCase())
          : []
        setHasVendorAccess(
          normalizedRole === 'vendor' ||
            normalizedRole === 'seller' ||
            normalizedRole === 'admin' ||
            roleList.includes('vendor') ||
            roleList.includes('seller') ||
            roleList.includes('admin') ||
            Boolean(payload?.is_vendor) ||
            Boolean(payload?.is_admin),
        )
      } catch {
        if (!cancelled) setHasVendorAccess(false)
      }
    }
    void loadRole()
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    let cancelled = false
    const loadUnreadNotifications = async () => {
      if (!user) {
        setUnreadNotificationCount(0)
        return
      }
      const params = new URLSearchParams({ page: '1', per_page: '1', read_status: 'unread' })
      try {
        const response = await fetch(`/api/user/notifications?${params.toString()}`, {
          cache: 'no-store',
        })
        if (!response.ok) {
          if (!cancelled) setUnreadNotificationCount(0)
          return
        }
        const payload = await response.json().catch(() => null)
        if (cancelled) return
        const unread = Number(payload?.summary?.unread || 0)
        setUnreadNotificationCount(Number.isFinite(unread) && unread > 0 ? unread : 0)
      } catch {
        if (!cancelled) setUnreadNotificationCount(0)
      }
    }
    void loadUnreadNotifications()
    return () => {
      cancelled = true
    }
  }, [pathname, user])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountSearchRef.current && !accountSearchRef.current.contains(event.target)) {
        setIsAccountSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAccountSearchSelect = (item) => {
    if (!item?.href) return
    setAccountSearchValue(item.label || '')
    setIsAccountSearchOpen(false)
    router.push(item.href)
  }

  const handleAccountSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsAccountSearchOpen(false)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (!accountSearchSuggestions.length) return
      handleAccountSearchSelect(accountSearchSuggestions[0])
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setLogoutError('')
    try {
      const response = await fetch('/api/auth/signout', { method: 'POST' })
      if (!response.ok) throw new Error('Logout failed')
      setIsLogoutConfirmOpen(false)
      router.refresh()
      router.push('/login')
    } catch {
      setLogoutError('Unable to log out right now. Please try again.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      <div className='border-b border-gray-200 bg-white'>
        <div className='mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8'>
          <h1 className='text-base font-semibold text-slate-900 md:text-lg'>Account Center</h1>

          <div className='flex items-center gap-2'>
            {hasVendorAccess ? (
              <Link
                className='relative hidden h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 md:flex'
                aria-label='Shop dashboard'
                href='/admin/dashboard'
              >
                <svg className='h-5 w-5' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
                  <path d='M3 1L0 4V5C0 5 2 6 4 6C6 6 8 5 8 5C8 5 10 6 12 6C14 6 16 5 16 5V4L13 1H3Z' fill='currentColor' />
                  <path
                    fillRule='evenodd'
                    clipRule='evenodd'
                    d='M1 15V7.5187C1.81671 7.76457 2.88168 8 4 8C5.3025 8 6.53263 7.68064 7.38246 7.39737C7.60924 7.32177 7.81664 7.24612 8 7.17526C8.18337 7.24612 8.39076 7.32177 8.61754 7.39737C9.46737 7.68064 10.6975 8 12 8C13.1183 8 14.1833 7.76457 15 7.5187V15H7V10H4V15H1ZM12 10H10V13H12V10Z'
                    fill='currentColor'
                  />
                </svg>
              </Link>
            ) : null}

            <Link
              className='relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200'
              aria-label='Notifications'
              href='/account/notifications'
            >
              <svg
                className='h-[26px] w-[26px]'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.5'
                aria-hidden='true'
              >
                <path
                  d='M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V10a6 6 0 1 0-12 0v4.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
              {unreadNotificationCount > 0 ? (
                <span className='absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500' />
              ) : null}
            </Link>

            <div className='relative hidden md:block' ref={accountSearchRef}>
              <div className='flex h-9 w-64 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 text-xs text-slate-500 transition focus-within:border-slate-300 focus-within:bg-white'>
                <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M21 21l-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0'
                  />
                </svg>
                <input
                  type='text'
                  value={accountSearchValue}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setAccountSearchValue(nextValue)
                    setIsAccountSearchOpen(nextValue.trim().length > 0)
                  }}
                  onFocus={() => setIsAccountSearchOpen(accountSearchValue.trim().length > 0)}
                  onKeyDown={handleAccountSearchKeyDown}
                  placeholder='Search account pages'
                  className='h-full w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-500 focus:outline-none'
                  aria-label='Search account pages'
                />
              </div>
              {isAccountSearchOpen && hasAccountSearchQuery ? (
                <div className='absolute right-0 top-[calc(100%+0.45rem)] z-50 w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl'>
                  {accountSearchSuggestions.length ? (
                    <ul className='max-h-72 overflow-y-auto'>
                      {accountSearchSuggestions.map((item) => (
                        <li key={`${item.href}-${item.label}`}>
                          <button
                            type='button'
                            onClick={() => handleAccountSearchSelect(item)}
                            className='flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-slate-50'
                          >
                            <span className='text-sm font-medium text-slate-800'>{item.label}</span>
                            <span className='ml-3 line-clamp-1 text-[11px] text-slate-500'>{item.summary}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className='px-2.5 py-2 text-xs text-slate-500'>No matching account pages.</p>
                  )}
                </div>
              ) : null}
            </div>

            <button
              type='button'
              onClick={() => {
                setLogoutError('')
                setIsLogoutConfirmOpen(true)
              }}
              className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50'
              aria-label='Logout'
              title='Logout'
            >
              <svg className='h-5 w-5' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
                <path
                  d='M12.207 9H5V7h7.136L11.05 5.914 12.464 4.5 16 8.036l-3.536 3.535-1.414-1.414L12.207 9zM10 4H8V2H2v12h6v-2h2v4H0V0h10v4z'
                  fill='currentColor'
                  fillRule='evenodd'
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isLogoutConfirmOpen ? (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4'>
          <div
            role='dialog'
            aria-modal='true'
            aria-labelledby='account-logout-title'
            className='w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl'
          >
            <h2 id='account-logout-title' className='text-lg font-semibold text-slate-900'>
              Log out?
            </h2>
            <p className='mt-2 text-sm text-slate-600'>You will need to sign in again to access your account.</p>
            {logoutError ? <p className='mt-2 text-sm text-rose-600'>{logoutError}</p> : null}
            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => {
                  if (isLoggingOut) return
                  setLogoutError('')
                  setIsLogoutConfirmOpen(false)
                }}
                className='rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleLogout}
                disabled={isLoggingOut}
                className='rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60'
              >
                {isLoggingOut ? 'Logging out...' : 'Log out'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
