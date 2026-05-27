'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { buildVendorHref } from '@/lib/catalog/vendor'

const AboutStoreCard = ({
  vendor,
  vendorSlug,
  rating,
  followers,
  soldCount,
  itemsCount,
  badge,
  avatarUrl,
}) => {
  const displayVendor = String(vendor || '').trim() || 'Seller'
  const initials = displayVendor.slice(0, 2).toUpperCase()
  const vendorHref = buildVendorHref(displayVendor, vendorSlug)
  const normalizedVendorSlug = useMemo(() => {
    const raw = String(vendorSlug || '').trim()
    if (raw) return raw
    return displayVendor
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }, [displayVendor, vendorSlug])
  const [followState, setFollowState] = useState({
    isFollowing: false,
    canFollow: false,
    isSaving: false,
    followers: Math.max(0, Number(followers) || 0),
  })

  useEffect(() => {
    setFollowState({
      isFollowing: false,
      canFollow: false,
      isSaving: false,
      followers: Math.max(0, Number(followers) || 0),
    })
  }, [followers, normalizedVendorSlug])

  useEffect(() => {
    if (!normalizedVendorSlug) return
    let active = true
    const loadFollowState = async () => {
      try {
        const response = await fetch(`/api/vendors/${encodeURIComponent(normalizedVendorSlug)}/follow`, {
          method: 'GET',
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => null)
        if (!active || !response.ok) return
        setFollowState((prev) => ({
          ...prev,
          isFollowing: Boolean(payload?.is_following),
          canFollow: Boolean(payload?.can_follow),
          followers: Math.max(0, Number(payload?.followers) || prev.followers),
        }))
      } catch {
        // keep fallback state
      }
    }
    loadFollowState()
    return () => {
      active = false
    }
  }, [normalizedVendorSlug])

  const handleFollowToggle = async () => {
    if (!normalizedVendorSlug) return
    if (followState.isSaving) return
    setFollowState((prev) => ({ ...prev, isSaving: true }))

    try {
      const method = followState.isFollowing ? 'DELETE' : 'POST'
      const response = await fetch(`/api/vendors/${encodeURIComponent(normalizedVendorSlug)}/follow`, {
        method,
      })
      const payload = await response.json().catch(() => null)

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          const next = encodeURIComponent(window.location.pathname + window.location.search)
          window.location.href = `/login?next=${next}`
        }
        setFollowState((prev) => ({ ...prev, isSaving: false }))
        return
      }

      if (!response.ok) {
        setFollowState((prev) => ({ ...prev, isSaving: false }))
        return
      }

      setFollowState((prev) => ({
        ...prev,
        isFollowing: Boolean(payload?.is_following),
        canFollow: Boolean(payload?.can_follow ?? prev.canFollow),
        followers: Math.max(0, Number(payload?.followers) || prev.followers),
        isSaving: false,
      }))
    } catch {
      setFollowState((prev) => ({ ...prev, isSaving: false }))
    }
  }

  const followersLabel =
    typeof followState.followers === 'number'
      ? followState.followers.toLocaleString()
      : followState.followers
  const safeFollowers = followersLabel || '0'
  const safeSoldCount = Number.isFinite(Number(soldCount)) ? Number(soldCount).toLocaleString() : String(soldCount || '0')
  const safeRating = Number.isFinite(Number(rating)) ? Number(rating).toFixed(1) : '0.0'

  return (
    <div className='border border-gray-200 rounded-2xl p-4 bg-white'>
      <div className='flex items-center gap-4'>
        <div className='relative h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-amber-300 via-fuchsia-400 to-sky-500 p-[2px] shadow-md'>
          <div className='flex h-full w-full items-center justify-center rounded-full bg-white text-base font-semibold text-slate-900 overflow-hidden'>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${displayVendor} avatar`}
                className='h-full w-full object-cover'
              />
            ) : (
              initials
            )}
          </div>
        </div>

        <div className='flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <Link href={vendorHref} className='text-base font-semibold text-gray-900 hover:underline'>
              {displayVendor}
            </Link>
            {badge && (
              <span className='inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 border border-violet-200'>
                ★ {badge}
              </span>
            )}
          </div>
          <div className='mt-1 flex flex-wrap items-center gap-4 text-xs text-gray-500'>
            <div className='text-gray-900 font-semibold'>
              {safeFollowers}{' '}
              <span className='font-normal text-gray-500'>Followers</span>
            </div>
            <div className='text-gray-900 font-semibold'>
              {safeSoldCount}{' '}
              <span className='font-normal text-gray-500'>Sold</span>
            </div>
            <div className='text-gray-900 font-semibold'>
              {safeRating} <span className='text-gray-700'>★</span>
            </div>
          </div>
        </div>
      </div>

      <div className='mt-4 grid grid-cols-2 gap-2 text-xs font-semibold'>
        <button
          type='button'
          onClick={handleFollowToggle}
          disabled={followState.isSaving}
          className='border border-gray-300 rounded-full py-2 text-gray-800 hover:bg-gray-50 transition disabled:cursor-not-allowed disabled:opacity-75'
        >
          {followState.isSaving ? (
            <span className='inline-flex items-center gap-1' aria-label='Updating follow status'>
              <span className='h-1.5 w-1.5 rounded-full bg-slate-700 animate-[oc-dot-bounce_1s_infinite]' />
              <span className='h-1.5 w-1.5 rounded-full bg-slate-700 animate-[oc-dot-bounce_1s_infinite] [animation-delay:120ms]' />
              <span className='h-1.5 w-1.5 rounded-full bg-slate-700 animate-[oc-dot-bounce_1s_infinite] [animation-delay:240ms]' />
            </span>
          ) : followState.isFollowing ? (
            'Following'
          ) : (
            '+ Follow'
          )}
        </button>
        <Link
          href={vendorHref}
          className='border border-gray-300 rounded-full py-2 text-gray-800 hover:bg-gray-50 transition inline-flex items-center justify-center'
        >
          Shop all items ({itemsCount})
        </Link>
      </div>
    </div>
  )
}

export default AboutStoreCard
