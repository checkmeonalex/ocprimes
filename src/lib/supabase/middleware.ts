import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'
import { getSupabaseConfig } from './config'
import { attachSupabaseAuthRecovery } from './auth-recovery'

export function createMiddlewareSupabaseClient(
  request: NextRequest,
  response: NextResponse,
) {
  const { url, anonKey } = getSupabaseConfig()

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options })
      },
      remove(name, options) {
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  attachSupabaseAuthRecovery(supabase, {
    listCookieNames: () => request.cookies.getAll().map((cookie) => cookie.name),
    clearCookie: (name, value, options) => {
      response.cookies.set({ name, value, ...options })
    },
  })

  return supabase
}
