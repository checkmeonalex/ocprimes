import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'
import { getSupabaseConfig } from './config'

type CookieChange = {
  name: string
  value: string
  options?: Parameters<NextResponse['cookies']['set']>[0]
}

export function createRouteHandlerSupabaseClient(request: NextRequest) {
  const { url, anonKey } = getSupabaseConfig()
  const cookieChanges: CookieChange[] = []

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value
      },
      set(name, value, options) {
        cookieChanges.push({ name, value, options })
      },
      remove(name, options) {
        cookieChanges.push({ name, value: '', options })
      },
    },
  })

  const applyCookies = (response: NextResponse) => {
    cookieChanges.forEach(({ name, value, options }) => {
      response.cookies.set({ name, value, ...options })
    })
  }

  return { supabase, applyCookies }
}
