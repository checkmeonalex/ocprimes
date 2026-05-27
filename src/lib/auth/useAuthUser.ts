'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

type AuthUserSnapshot = {
  user: User | null
  isLoading: boolean
}

let authSnapshot: AuthUserSnapshot = {
  user: null,
  isLoading: true,
}

let hasBootstrapped = false
const listeners = new Set<(snapshot: AuthUserSnapshot) => void>()
const AUTH_USER_CACHE_KEY = 'ocp:auth:user:v1'

const emitAuthSnapshot = () => {
  listeners.forEach((listener) => listener(authSnapshot))
}

const setAuthSnapshot = (nextSnapshot: AuthUserSnapshot) => {
  if (
    authSnapshot.user === nextSnapshot.user &&
    authSnapshot.isLoading === nextSnapshot.isLoading
  ) {
    return
  }
  authSnapshot = nextSnapshot
  emitAuthSnapshot()
}

const readCachedUserFromKey = (): User | null => {
  try {
    const raw = window.localStorage.getItem(AUTH_USER_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as User) : null
  } catch {
    return null
  }
}

const readLegacySupabaseUser = (): User | null => {
  try {
    const keys = Object.keys(window.localStorage)
    for (const key of keys) {
      if (!key.startsWith('sb-') || !key.endsWith('-auth-token')) continue
      const raw = window.localStorage.getItem(key)
      if (!raw) continue

      const parsed = JSON.parse(raw)
      const persistedUser =
        parsed?.currentSession?.user ??
        parsed?.session?.user ??
        parsed?.user ??
        null

      if (persistedUser && typeof persistedUser === 'object') {
        return persistedUser as User
      }
    }
  } catch {
    return null
  }

  return null
}

const readPersistedUser = (): User | null => {
  if (typeof window === 'undefined') return null

  return readCachedUserFromKey() ?? readLegacySupabaseUser()
}

const writePersistedUser = (user: User | null) => {
  if (typeof window === 'undefined') return
  try {
    if (user) {
      window.localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(user))
    } else {
      window.localStorage.removeItem(AUTH_USER_CACHE_KEY)
    }
  } catch {
    // ignore storage write errors
  }
}

const bootstrapAuthUser = ({ skipPersistedUser = false } = {}) => {
  if (hasBootstrapped || typeof window === 'undefined') return
  hasBootstrapped = true

  const persistedUser = skipPersistedUser ? null : readPersistedUser()
  if (persistedUser && !authSnapshot.user) {
    setAuthSnapshot({
      user: persistedUser,
      isLoading: false,
    })
  }

  const supabase = createBrowserSupabaseClient()

  void supabase.auth
    .getUser()
    .then(({ data }) => {
      writePersistedUser(data?.user ?? null)
      setAuthSnapshot({
        user: data?.user ?? null,
        isLoading: false,
      })
    })
    .catch(() => {
      setAuthSnapshot({ ...authSnapshot, isLoading: false })
    })

  supabase.auth.onAuthStateChange((_event, session) => {
    writePersistedUser(session?.user ?? null)
    setAuthSnapshot({
      user: session?.user ?? null,
      isLoading: false,
    })
  })
}

const resolveInitialSnapshot = (initialUser: User | null): AuthUserSnapshot => {
  if (initialUser) {
    return {
      user: initialUser,
      isLoading: false,
    }
  }
  return authSnapshot
}

export function useAuthUser(
  initialUser: User | null = null,
  hasServerSnapshot = false,
) {
  const [snapshot, setSnapshot] = useState(() => resolveInitialSnapshot(initialUser))

  useEffect(() => {
    const handleSnapshot = (nextSnapshot: AuthUserSnapshot) => {
      setSnapshot(nextSnapshot)
    }
    listeners.add(handleSnapshot)

    if (initialUser && !authSnapshot.user) {
      setAuthSnapshot({
        user: initialUser,
        isLoading: false,
      })
    }

    bootstrapAuthUser({ skipPersistedUser: hasServerSnapshot })
    setSnapshot(authSnapshot)
    return () => {
      listeners.delete(handleSnapshot)
    }
  }, [hasServerSnapshot, initialUser])

  return snapshot
}
