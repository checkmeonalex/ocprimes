import type { NextResponse } from 'next/server'

export const EMAIL_TWO_STEP_VERIFIED_COOKIE = 'oc_email_2sv_verified'

const baseCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export function setEmailTwoStepVerifiedCookie(response: NextResponse, userId: string) {
  response.cookies.set({
    ...baseCookieOptions,
    name: EMAIL_TWO_STEP_VERIFIED_COOKIE,
    value: String(userId || ''),
  })
}

export function clearEmailTwoStepVerifiedCookie(response: NextResponse) {
  response.cookies.set({
    ...baseCookieOptions,
    name: EMAIL_TWO_STEP_VERIFIED_COOKIE,
    value: '',
    maxAge: 0,
  })
}

export function hasVerifiedTwoStepCookie(cookieValue: string | undefined, userId: string) {
  return String(cookieValue || '') === String(userId || '')
}
