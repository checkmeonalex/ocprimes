const DASHBOARD_REDIRECT = '/backend/admin/dashboard'
const CUSTOMER_REDIRECT = '/account'
const CUSTOMER_DESKTOP_REDIRECT = '/account/orders'

type CustomerDeviceType = 'desktop' | 'handheld'

const HANDHELD_USER_AGENT_PATTERN =
  /android.+mobile|iphone|ipod|blackberry|iemobile|opera mini|mobile/i

const TABLET_USER_AGENT_PATTERN =
  /ipad|tablet|android(?!.*mobile)|silk|kindle|playbook/i

export function resolveClientCustomerDeviceType(): CustomerDeviceType {
  if (typeof window === 'undefined') return 'desktop'
  return window.matchMedia('(min-width: 1024px)').matches ? 'desktop' : 'handheld'
}

export function resolveRequestCustomerDeviceType(userAgent?: string | null): CustomerDeviceType {
  const normalized = String(userAgent || '').trim().toLowerCase()
  if (!normalized) return 'desktop'
  if (TABLET_USER_AGENT_PATTERN.test(normalized)) return 'handheld'
  if (HANDHELD_USER_AGENT_PATTERN.test(normalized)) return 'handheld'
  return 'desktop'
}

export function resolveCustomerRedirect(deviceType: CustomerDeviceType = 'desktop') {
  return deviceType === 'desktop' ? CUSTOMER_DESKTOP_REDIRECT : CUSTOMER_REDIRECT
}

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
