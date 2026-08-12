'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronRight, X } from 'lucide-react'
import BrandLogo from '@/components/common/BrandLogo'
import { useAuthUser } from '@/lib/auth/useAuthUser.ts'
import PreferencePickerSection from './PreferencePicker'
import { MOBILE_SIDEBAR_SECTIONS } from './mobileSidebarSections'

const isCurrentPath = (pathname, href) => {
  if (!pathname || !href) return false
  if (pathname === href) return true
  return href !== '/' && pathname.startsWith(`${href}/`)
}

const getDisplayName = (email) => {
  if (!email) return 'Guest'
  const [local] = String(email).split('@')
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

function DrawerRow({ href, label, icon: Icon, onNavigate, isActive = false, trailingNode = null }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex min-h-12 items-center gap-3 px-4 py-2.5 text-[15px] transition-colors ${
        isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span
        className={`inline-flex h-11 w-11 items-center justify-center rounded-md ${
          isActive ? 'bg-orange-100 text-orange-600' : 'text-gray-900'
        }`}
      >
        <Icon className='h-6 w-6' strokeWidth={1.8} aria-hidden='true' />
      </span>
      <span className='min-w-0 flex-1 truncate font-medium'>{label}</span>
      {trailingNode || <ChevronRight className='h-[18px] w-[18px] text-slate-400' strokeWidth={1.8} aria-hidden='true' />}
    </Link>
  )
}

export default function MobileSidebar({ isOpen, onClose, onOpenCategories }) {
  const pathname = usePathname()
  const { user } = useAuthUser()
  const displayName = getDisplayName(user?.email)
  const profileInitials = getProfileInitials(displayName)
  const profileBadgeColor = getProfileBadgeColor(displayName)
  const avatarUrl =
    typeof user?.user_metadata?.avatar_url === 'string'
      ? user.user_metadata.avatar_url.trim()
      : ''
  const isSignedIn = Boolean(user)
  const accountHref = isSignedIn ? '/account' : '/login?next=/account'

  useEffect(() => {
    if (!isOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      <div
        className='fixed inset-0 z-[2147483004] bg-slate-950/40 backdrop-blur-[1px] lg:hidden'
        onClick={onClose}
        aria-hidden='true'
      />

      <aside
        className='fixed inset-y-0 left-0 z-[2147483005] flex w-[86vw] max-w-[320px] flex-col border-r border-slate-200 bg-white shadow-2xl lg:hidden'
        role='dialog'
        aria-modal='true'
        aria-label='Mobile menu'
      >
        <div className='flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-4'>
          <div className='flex min-w-0 items-center gap-3'>
            <button
              type='button'
              onClick={onClose}
              className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700'
              aria-label='Close menu'
            >
              <X className='h-5 w-5' strokeWidth={2} aria-hidden='true' />
            </button>
            <BrandLogo
              href='/'
              onClick={onClose}
              className='inline-flex items-center gap-2.5 text-slate-900'
              markClassName='h-12 w-12 shrink-0 text-[#f5d10b]'
              labelClassName='text-base font-black tracking-tight text-slate-900'
            />
          </div>
          <Link
            href={accountHref}
            onClick={onClose}
            className='inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 pl-1.5 pr-3 text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-100'
            aria-label={isSignedIn ? 'Open account page' : 'Go to login'}
          >
            <span className='inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white'>
              {isSignedIn ? (
                avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <span
                    className='inline-flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.03em] text-white'
                    style={{ backgroundColor: profileBadgeColor }}
                  >
                    {profileInitials}
                  </span>
                )
              ) : (
                <svg
                  className='h-4 w-4'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.8'
                  aria-hidden='true'
                >
                  <circle cx='12' cy='8' r='3.25' />
                  <path
                    d='M5.5 18c1.8-3 4-4.5 6.5-4.5s4.7 1.5 6.5 4.5'
                    strokeLinecap='round'
                  />
                </svg>
              )}
            </span>
            <span className='text-sm font-semibold'>
              {isSignedIn ? 'Account' : 'Sign in'}
            </span>
          </Link>
        </div>

        <div className='mobile-sidebar-scrollbar flex-1 overflow-y-auto pb-6'>
          <section className='px-0 pb-0 pt-3'>
            <button
              type='button'
              onClick={onOpenCategories}
              className='flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-[15px] font-medium text-gray-900 transition-colors hover:bg-slate-50'
              aria-label='Toggle categories'
            >
              <span className='inline-flex h-11 w-11 items-center justify-center rounded-md text-gray-900'>
                <svg
                  className='h-6 w-6'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                  strokeWidth='2'
                  aria-hidden='true'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
                  />
                </svg>
              </span>
              <span>All Categories</span>
            </button>
          </section>

          {MOBILE_SIDEBAR_SECTIONS.map((section) => {
            const sectionClassName =
              section.id === 'quick-links'
                ? 'border-b border-slate-100 px-0 pb-3 pt-0'
                : 'border-b border-slate-100 px-0 py-3'

            return (
              <section key={section.id} className={sectionClassName}>
                {section.title ? (
                  <div className='px-4 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400'>
                    {section.title}
                  </div>
                ) : null}
                <div>
                  {section.items.map((item) => (
                    <DrawerRow
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      onNavigate={onClose}
                      isActive={isCurrentPath(pathname, item.href)}
                    />
                  ))}
                </div>
              </section>
            )
          })}

          <PreferencePickerSection
            sectionClassName='border-b border-slate-100 px-0 py-3'
            titleClassName='px-4 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400'
          />
        </div>
      </aside>
    </>
  )
}
