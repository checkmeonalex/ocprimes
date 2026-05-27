import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from './config'
import { attachSupabaseAuthRecovery } from './auth-recovery'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseConfig()

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
      set(name, value, options) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // Ignore when called from a server component.
        }
      },
      remove(name, options) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch {
          // Ignore when called from a server component.
        }
      },
    },
  })

  attachSupabaseAuthRecovery(supabase, {
    listCookieNames: () => cookieStore.getAll().map((cookie) => cookie.name),
    clearCookie: (name, value, options) => {
      try {
        cookieStore.set({ name, value, ...options })
      } catch {
        // Ignore when called from a server component.
      }
    },
  })

  return supabase
}
