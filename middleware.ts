import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareSupabaseClient } from '@/lib/supabase/middleware'
import { getUserRole } from '@/lib/auth/roles'

const ADMIN_PREFIXES = ['/backend/admin', '/admin', '/api/admin']
const ADMIN_PUBLIC_PATHS = ['/admin/login', '/admin/signup']
const USER_PREFIXES = ['/UserBackend', '/wishlist']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApiRequest = pathname.startsWith('/api/admin')
  const isUserBackend = USER_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (!ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix)) && !isUserBackend) {
    return NextResponse.next()
  }

  if (!isApiRequest && ADMIN_PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  const supabase = createMiddlewareSupabaseClient(request, response)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    if (isApiRequest) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isUserBackend) {
    return response
  }

  const role = await getUserRole(supabase, data.user.id)
  if (role !== 'admin') {
    if (isApiRequest) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'forbidden')
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/backend/admin/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
    '/UserBackend/:path*',
  ],
}
