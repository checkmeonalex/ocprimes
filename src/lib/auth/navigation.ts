const DASHBOARD_REDIRECT = '/backend/admin/dashboard'
const CUSTOMER_REDIRECT = '/UserBackend'

export function resolveSafeNextPath(nextValue?: string | null) {
  if (!nextValue || typeof nextValue !== 'string') return null
  if (!nextValue.startsWith('/') || nextValue.startsWith('//')) return null
  return nextValue
}

export function resolvePostAuthRedirect(
  role?: string | null,
  nextValue?: string | null,
  customerFallback = CUSTOMER_REDIRECT,
) {
  const nextPath = resolveSafeNextPath(nextValue)
  if (nextPath) return nextPath

  if (role === 'admin' || role === 'vendor') {
    return DASHBOARD_REDIRECT
  }

  return customerFallback
}
