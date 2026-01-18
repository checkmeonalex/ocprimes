import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from './config'

export function createServerSupabaseClient() {
  const cookieStore = cookies()
  const { url, anonKey } = getSupabaseConfig()

  return createServerClient(url, anonKey, {
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
}
