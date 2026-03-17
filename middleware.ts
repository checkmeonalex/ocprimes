import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareSupabaseClient } from '@/lib/supabase/middleware'
import { getUserRoleSafe } from '@/lib/auth/roles'
import { resolveCustomerRedirect, resolveRequestCustomerDeviceType } from '@/lib/auth/navigation'

const ADMIN_PREFIXES = ['/backend/admin', '/admin', '/api/admin']
const ADMIN_PUBLIC_PATHS = ['/admin/login', '/admin/signup']
const USER_PREFIXES = ['/UserBackend', '/account', '/wishlist']
const AUTH_PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/sellersignup',
  '/vendor/login',
  '/vendor/signup',
  '/vendor/set-password',
  '/admin/login',
  '/admin/signup',
]
const ADMIN_ONLY_PAGE_PREFIXES = ['/backend/admin/admin', '/backend/admin/customers']
const VENDOR_API_PREFIXES = [
  '/api/admin/orders',
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
  const isAdminPage =
    !isApiRequest &&
    ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
    !ADMIN_PUBLIC_PATHS.includes(pathname)

  if (isAuthPublicPath) {
    const response = NextResponse.next()
    const supabase = createMiddlewareSupabaseClient(request, response)
    const { data, error } = await supabase.auth.getUser()

    if (!error && data.user) {
      const role = await getUserRoleSafe(supabase, data.user.id, data.user.email || '')
      const destination =
        role === 'admin' || role === 'vendor'
          ? '/admin/dashboard'
          : resolveCustomerRedirect(
              resolveRequestCustomerDeviceType(request.headers.get('user-agent')),
            )
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
    const authUrl = new URL(isAdminPage ? '/admin/login' : isUserBackend ? '/signup' : '/login', request.url)
    const nextPath = `${pathname}${request.nextUrl.search || ''}`
    authUrl.searchParams.set('next', nextPath)
    return NextResponse.redirect(authUrl)
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
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
      return response
    }
    if (isVendor && isApiRequest && isVendorApiPath) {
      return response
    }
    if (isApiRequest) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }
    const loginUrl = new URL(isAdminPage ? '/admin/login' : '/login', request.url)
    loginUrl.searchParams.set('error', 'forbidden')
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search || ''}`)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/login',
    '/signup',
    '/sellersignup',
    '/vendor/login',
    '/vendor/signup',
    '/vendor/set-password',
    '/backend/admin/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
    '/UserBackend/:path*',
    '/account/:path*',
    '/account',
  ],
}
