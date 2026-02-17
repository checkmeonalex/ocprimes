import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareSupabaseClient } from '@/lib/supabase/middleware'
import { getUserRoleSafe } from '@/lib/auth/roles'

const ADMIN_PREFIXES = ['/backend/admin', '/admin', '/api/admin']
const ADMIN_PUBLIC_PATHS = ['/admin/login', '/admin/signup']
const USER_PREFIXES = ['/UserBackend', '/wishlist']
const AUTH_PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/vendor/login',
  '/vendor/signup',
  '/vendor/set-password',
  '/admin/login',
  '/admin/signup',
]
const ADMIN_ONLY_PAGE_PREFIXES = ['/backend/admin/admin', '/backend/admin/customers']
const VENDOR_API_PREFIXES = [
  '/api/admin/products',
  '/api/admin/categories',
  '/api/admin/tags',
  '/api/admin/brands',
  '/api/admin/media',
  '/api/admin/store-front',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthPublicPath = AUTH_PUBLIC_PATHS.includes(pathname)
  const isApiRequest = pathname.startsWith('/api/admin')
  const isUserBackend = USER_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (isAuthPublicPath) {
    const response = NextResponse.next()
    const supabase = createMiddlewareSupabaseClient(request, response)
    const { data, error } = await supabase.auth.getUser()

    if (!error && data.user) {
      const role = await getUserRoleSafe(supabase, data.user.id, data.user.email || '')
      const destination =
        role === 'admin' || role === 'vendor' ? '/backend/admin/dashboard' : '/UserBackend'
      return NextResponse.redirect(new URL(destination, request.url))
    }

    return response
  }

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

  const role = await getUserRoleSafe(supabase, data.user.id, data.user.email || '')
  const isAdmin = role === 'admin'
  const isVendor = role === 'vendor'
  const isVendorApiPath = VENDOR_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (!isAdmin) {
    if (isVendor && !isApiRequest) {
      const isAdminOnlyPage = ADMIN_ONLY_PAGE_PREFIXES.some((prefix) =>
        pathname.startsWith(prefix),
      )
      if (isAdminOnlyPage) {
        return NextResponse.redirect(new URL('/backend/admin/dashboard', request.url))
      }
      return response
    }
    if (isVendor && isApiRequest && isVendorApiPath) {
      return response
    }
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
    '/login',
    '/signup',
    '/vendor/login',
    '/vendor/signup',
    '/vendor/set-password',
    '/backend/admin/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
    '/UserBackend/:path*',
  ],
}
