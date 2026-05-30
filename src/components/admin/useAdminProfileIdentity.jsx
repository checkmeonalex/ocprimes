'use client'

import { useEffect, useLayoutEffect, useState } from 'react'

// On the server useLayoutEffect causes a warning — use useEffect instead.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect
import {
  clearProfileIdentityCache,
  PROFILE_IDENTITY_CACHE_UPDATED_EVENT,
  readProfileIdentityCache,
  toProfileIdentity,
  writeProfileIdentityCache,
} from '@/lib/user/profile-identity-cache'
import { loadUserProfileBootstrap } from '@/lib/user/profile-bootstrap-client'

const fallbackIdentity = {
  displayName: 'Admin User',
  email: '',
  storeLogoUrl: '',
  avatarUrl: '',
}

let cachedIdentity = null
let inFlightIdentityRequest = null

const loadAdminIdentity = async () => {
  if (cachedIdentity) {
    return cachedIdentity
  }

  if (inFlightIdentityRequest) {
    return inFlightIdentityRequest
  }

  const request = (async () => {
    const payload = await loadUserProfileBootstrap()
    if (!payload) {
      clearProfileIdentityCache()
      cachedIdentity = null
      return null
    }

    const nextIdentity = toProfileIdentity(payload)

    try {
      const storeFrontResponse = await fetch('/api/admin/store-front', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      })
      if (storeFrontResponse.ok) {
        const storeFrontPayload = await storeFrontResponse.json().catch(() => null)
        const storeLogoUrl = String(storeFrontPayload?.item?.logo_url || '').trim()
        if (storeLogoUrl) {
          nextIdentity.storeLogoUrl = storeLogoUrl
        }
      }
    } catch {
      // no store logo available
    }

    writeProfileIdentityCache(nextIdentity)
    cachedIdentity = nextIdentity
    return nextIdentity
  })()
    .finally(() => {
      if (inFlightIdentityRequest === request) {
        inFlightIdentityRequest = null
      }
    })

  inFlightIdentityRequest = request
  return request
}

export default function useAdminProfileIdentity() {
  // Start with the fallback so server render and hydration match.
  const [identity, setIdentity] = useState(fallbackIdentity)

  // Synchronous read from localStorage BEFORE first paint — eliminates the
  // initials flash on hard reload when a cached image URL is already stored.
  useIsomorphicLayoutEffect(() => {
    const cached = cachedIdentity || readProfileIdentityCache()
    if (cached) {
      cachedIdentity = cached
      setIdentity(cached)
    }
  }, [])

  // Async: listen for cache updates + re-fetch from API.
  useEffect(() => {
    let cancelled = false

    const handleCacheUpdate = (event) => {
      const detail = event?.detail && typeof event.detail === 'object' ? event.detail : null
      if (!detail) return
      const next = {
        displayName: String(detail.displayName || '').trim() || 'Admin User',
        email: String(detail.email || '').trim(),
        storeLogoUrl: String(detail.storeLogoUrl || '').trim(),
        avatarUrl: String(detail.avatarUrl || '').trim(),
      }
      cachedIdentity = next
      setIdentity(next)
    }
    window.addEventListener(PROFILE_IDENTITY_CACHE_UPDATED_EVENT, handleCacheUpdate)

    const run = async () => {
      try {
        const nextIdentity = await loadAdminIdentity()
        if (!cancelled && nextIdentity) {
          setIdentity(nextIdentity)
        }
      } catch {
        // keep cached value
      }
    }
    run()

    return () => {
      cancelled = true
      window.removeEventListener(PROFILE_IDENTITY_CACHE_UPDATED_EVENT, handleCacheUpdate)
    }
  }, [])

  return identity
}
