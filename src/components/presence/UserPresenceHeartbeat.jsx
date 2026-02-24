'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

const HEARTBEAT_MS = 60 * 1000

export default function UserPresenceHeartbeat() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
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
  }, [supabase])

  const sendHeartbeat = useCallback(async () => {
    if (!isAuthenticated) return
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return

    await fetch('/api/user/presence', {
      method: 'POST',
      cache: 'no-store',
      credentials: 'include',
      keepalive: true,
    }).catch(() => null)
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return

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
  }, [isAuthenticated, sendHeartbeat])

  return null
}
