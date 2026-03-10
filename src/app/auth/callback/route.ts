import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { resolvePostAuthRedirect, resolveSafeNextPath } from '@/lib/auth/navigation'
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
  const redirectPath = resolvePostAuthRedirect(roleInfo.role, nextValue)
  const response = NextResponse.redirect(new URL(redirectPath, request.url))
  applyCookies(response)
  return response
}
