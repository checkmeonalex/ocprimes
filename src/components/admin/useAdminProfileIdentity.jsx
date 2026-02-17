'use client'

import { useEffect, useState } from 'react'
import {
  clearProfileIdentityCache,
  PROFILE_IDENTITY_CACHE_UPDATED_EVENT,
  readProfileIdentityCache,
  toProfileIdentity,
  writeProfileIdentityCache,
} from '@/lib/user/profile-identity-cache'

const fallbackIdentity = {
  displayName: 'Admin User',
  email: '',
  storeLogoUrl: '',
  avatarUrl: '',
}

export default function useAdminProfileIdentity() {
  const [identity, setIdentity] = useState(() => readProfileIdentityCache() || fallbackIdentity)

  useEffect(() => {
    let cancelled = false
    const handleCacheUpdate = (event) => {
      const detail = event?.detail && typeof event.detail === 'object' ? event.detail : null
      if (!detail) return
      setIdentity({
        displayName: String(detail.displayName || '').trim() || 'Admin User',
        email: String(detail.email || '').trim(),
        storeLogoUrl: String(detail.storeLogoUrl || '').trim(),
        avatarUrl: String(detail.avatarUrl || '').trim(),
      })
    }
    window.addEventListener(PROFILE_IDENTITY_CACHE_UPDATED_EVENT, handleCacheUpdate)

    const cached = readProfileIdentityCache()
    if (cached && !cancelled) {
      setIdentity(cached)
    }

    const run = async () => {
      try {
        const response = await fetch('/api/user/profile', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        })

        if (response.status === 401 || response.status === 403) {
          clearProfileIdentityCache()
          return
        }

        const payload = await response.json().catch(() => null)
        if (!response.ok || !payload || cancelled) return

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
        if (!cancelled) {
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
