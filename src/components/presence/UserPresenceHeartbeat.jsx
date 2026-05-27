'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

const HEARTBEAT_MS = 60 * 1000
const PRESENCE_ENABLED_PREFIXES = [
  '/account',
  '/UserBackend',
  '/admin',
  '/backend/admin',
  '/messages',
  '/chat',
]

const shouldEnablePresenceForPath = (pathname = '') =>
  PRESENCE_ENABLED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

export default function UserPresenceHeartbeat() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const isPresenceEnabled = shouldEnablePresenceForPath(pathname || '')

  useEffect(() => {
    if (!isPresenceEnabled) {
      setIsAuthenticated(false)
      return undefined
    }

    let cancelled = false

    const syncAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setIsAuthenticated(Boolean(data.session?.user?.id))
    }

    void syncAuth()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user?.id))
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [isPresenceEnabled, supabase])

  const sendHeartbeat = useCallback(async () => {
    if (!isAuthenticated || !isPresenceEnabled) return
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return

    await fetch('/api/user/presence', {
      method: 'POST',
      cache: 'no-store',
      credentials: 'include',
      keepalive: true,
    }).catch(() => null)
  }, [isAuthenticated, isPresenceEnabled])

  useEffect(() => {
    if (!isAuthenticated || !isPresenceEnabled) return

    void sendHeartbeat()

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      void sendHeartbeat()
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void sendHeartbeat()
    }, HEARTBEAT_MS)

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [isAuthenticated, isPresenceEnabled, sendHeartbeat])

  return null
}
