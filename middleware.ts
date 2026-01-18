import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareSupabaseClient } from '@/lib/supabase/middleware'
import { getUserRole } from '@/lib/auth/roles'

const ADMIN_PREFIXES = ['/backend/admin', '/admin']
const ADMIN_PUBLIC_PATHS = ['/admin/login', '/admin/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  if (ADMIN_PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  const supabase = createMiddlewareSupabaseClient(request, response)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = await getUserRole(supabase, data.user.id)
  if (role !== 'admin') {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'forbidden')
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/backend/admin/:path*', '/admin/:path*'],
}
