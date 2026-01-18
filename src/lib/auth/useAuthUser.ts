'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

export function useAuthUser() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    let isMounted = true

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (isMounted) {
        setUser(data?.user ?? null)
        setIsLoading(false)
      }
    }

    loadUser()

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isMounted) {
          setUser(session?.user ?? null)
        }
      },
    )

    return () => {
      isMounted = false
      subscription?.subscription?.unsubscribe()
    }
  }, [])

  return { user, isLoading }
}
