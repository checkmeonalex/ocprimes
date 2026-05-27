type CookieSetter = (name: string, value: string, options?: Record<string, unknown>) => void
type CookieLister = () => string[]

const EMPTY_USER_RESULT = { data: { user: null }, error: null }
const EMPTY_SESSION_RESULT = { data: { session: null }, error: null }

const isSupabaseAuthCookieName = (name: string) =>
  name.startsWith('sb-') && name.includes('-auth-token')

const isRefreshTokenMissingError = (error: unknown) => {
  const code = String((error as { code?: unknown })?.code || '').trim().toLowerCase()
  const message = String((error as { message?: unknown })?.message || '')
    .trim()
    .toLowerCase()

  return (
    code === 'refresh_token_not_found' ||
    message.includes('invalid refresh token') ||
    message.includes('refresh token not found')
  )
}

const clearSupabaseAuthCookies = (listCookieNames: CookieLister, clearCookie: CookieSetter) => {
  const names = Array.from(new Set(listCookieNames().filter(isSupabaseAuthCookieName)))
  names.forEach((name) => {
    clearCookie(name, '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    })
  })
}

export const attachSupabaseAuthRecovery = (
  supabase: any,
  {
    listCookieNames,
    clearCookie,
  }: {
    listCookieNames: CookieLister
    clearCookie: CookieSetter
  },
) => {
  const originalGetUser = supabase.auth.getUser.bind(supabase.auth)
  const originalGetSession = supabase.auth.getSession.bind(supabase.auth)

  supabase.auth.getUser = async (...args: unknown[]) => {
    try {
      const result = await originalGetUser(...args)
      if (isRefreshTokenMissingError(result?.error)) {
        clearSupabaseAuthCookies(listCookieNames, clearCookie)
        return EMPTY_USER_RESULT
      }
      return result
    } catch (error) {
      if (isRefreshTokenMissingError(error)) {
        clearSupabaseAuthCookies(listCookieNames, clearCookie)
        return EMPTY_USER_RESULT
      }
      throw error
    }
  }

  supabase.auth.getSession = async (...args: unknown[]) => {
    try {
      const result = await originalGetSession(...args)
      if (isRefreshTokenMissingError(result?.error)) {
        clearSupabaseAuthCookies(listCookieNames, clearCookie)
        return EMPTY_SESSION_RESULT
      }
      return result
    } catch (error) {
      if (isRefreshTokenMissingError(error)) {
        clearSupabaseAuthCookies(listCookieNames, clearCookie)
        return EMPTY_SESSION_RESULT
      }
      throw error
    }
  }

  return supabase
}
