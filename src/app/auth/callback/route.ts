import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import {
  resolveCustomerRedirect,
  resolvePostAuthRedirect,
  resolveRequestCustomerDeviceType,
  resolveSafeNextPath,
} from '@/lib/auth/navigation'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'

const buildLoginRedirect = (request: NextRequest, nextValue?: string | null) => {
  const loginUrl = new URL('/login', request.url)
  const nextPath = resolveSafeNextPath(nextValue)
  if (nextPath) {
    loginUrl.searchParams.set('next', nextPath)
  }
  loginUrl.searchParams.set('error', 'oauth')
  return loginUrl
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextValue = requestUrl.searchParams.get('next')
  const deviceValue = requestUrl.searchParams.get('device')

  if (!code) {
    return NextResponse.redirect(buildLoginRedirect(request, nextValue))
  }

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('OAuth callback exchange failed:', error.message)
    return NextResponse.redirect(buildLoginRedirect(request, nextValue))
  }

  const { data, error: userError } = await supabase.auth.getUser()
  if (userError || !data.user) {
    if (userError) {
      console.error('OAuth callback user lookup failed:', userError.message)
    }
    return NextResponse.redirect(buildLoginRedirect(request, nextValue))
  }

  const roleInfo = await getUserRoleInfoSafe(supabase, data.user.id, data.user.email || '')
  const customerFallback = resolveCustomerRedirect(
    deviceValue === 'desktop' || deviceValue === 'handheld'
      ? deviceValue
      : resolveRequestCustomerDeviceType(request.headers.get('user-agent')),
  )
  const redirectPath = resolvePostAuthRedirect(roleInfo.role, nextValue, customerFallback)
  const response = NextResponse.redirect(new URL(redirectPath, request.url))
  applyCookies(response)
  return response
}
