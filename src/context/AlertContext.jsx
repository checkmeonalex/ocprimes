'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const AlertContext = createContext(null)
const GLOBAL_ALERT_DEDUPE_MS = 8000
const MAX_VISIBLE_ALERTS = 2
const GLOBAL_ALERT_NOISE_PATHS = [
  '/api/user/presence',
  '/api/auth/role',
  '/api/user/profile',
  '/api/cart',
  '/api/categories',
  '/api/exchange-rates',
  '/api/wishlist/items/status',
]

const buildAlert = ({ type = 'info', title, message, timeoutMs = 5000, actionLabel = '', onAction = null }) => ({
  id: crypto.randomUUID(),
  type,
  title: title || '',
  message: message || '',
  timeoutMs,
  actionLabel: String(actionLabel || '').trim(),
  onAction: typeof onAction === 'function' ? onAction : null,
})

const buildConfirm = ({
  type = 'warning',
  title,
  message,
  confirmLabel = 'Allow',
  cancelLabel = 'Deny',
}) => ({
  id: crypto.randomUUID(),
  type,
  title: title || 'Please confirm',
  message: message || '',
  confirmLabel,
  cancelLabel,
})

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([])
  const [confirmations, setConfirmations] = useState([])
  const timeoutsRef = useRef(new Map())
  const confirmResolversRef = useRef(new Map())
  const recentGlobalErrorsRef = useRef(new Map())

  const removeAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id))
    const timeoutId = timeoutsRef.current.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutsRef.current.delete(id)
    }
  }, [])

  const pushAlert = useCallback((payload) => {
    const alert = buildAlert(payload || {})
    setAlerts((prev) => [...prev.slice(-(MAX_VISIBLE_ALERTS - 1)), alert])
    const timeoutId = setTimeout(() => removeAlert(alert.id), alert.timeoutMs)
    timeoutsRef.current.set(alert.id, timeoutId)
    return alert.id
  }, [removeAlert])

  const resolveConfirm = useCallback((id, accepted) => {
    setConfirmations((prev) => prev.filter((item) => item.id !== id))
    const resolver = confirmResolversRef.current.get(id)
    if (resolver) {
      resolver(Boolean(accepted))
      confirmResolversRef.current.delete(id)
    }
  }, [])

  const confirmAlert = useCallback((payload = {}) => {
    const confirmation = buildConfirm(payload)
    setConfirmations((prev) => [...prev, confirmation])
    return new Promise((resolve) => {
      confirmResolversRef.current.set(confirmation.id, resolve)
    })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return undefined

    const originalFetch = window.fetch.bind(window)
    const shouldSkipGlobalAlert = (input, init) => {
      const headers = new Headers(init?.headers || (typeof input === 'object' && input?.headers ? input.headers : undefined))
      return String(headers.get('x-no-global-error-alert') || '').trim() === '1'
    }

    const readUrlPath = (input) => {
      const raw =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : String(input?.url || '')
      if (!raw) return ''
      try {
        const parsed = new URL(raw, window.location.origin)
        return `${parsed.pathname}${parsed.search}`
      } catch {
        return raw
      }
    }

    const isNoisyGlobalPath = (requestPath) =>
      GLOBAL_ALERT_NOISE_PATHS.some((prefix) => requestPath === prefix || requestPath.startsWith(`${prefix}?`))

    const sanitizeErrorMessage = (message, statusCode) => {
      const raw = String(message || '').trim()
      if (!raw) {
        return statusCode >= 500
          ? 'Something went wrong. Please try again.'
          : 'Something went wrong. Please try again.'
      }

      const normalized = raw.toLowerCase()
      const looksTechnical =
        normalized.includes('unauthorized') ||
        normalized.includes('forbidden') ||
        normalized.includes('token') ||
        normalized.includes('jwt') ||
        normalized.includes('session') ||
        normalized.includes('fetch') ||
        normalized.includes('network') ||
        normalized.includes('failed to') ||
        normalized.includes('unexpected') ||
        normalized.includes('server') ||
        normalized.includes('json') ||
        normalized.includes('syntaxerror') ||
        normalized.includes('typeerror') ||
        normalized.includes('timeout') ||
        normalized.includes('abort') ||
        normalized.includes('permission denied')

      if (statusCode === 401) return 'Please sign in to continue.'
      if (statusCode === 403) return 'You do not have permission to do that.'
      if (statusCode >= 500 || looksTechnical) return 'Something went wrong. Please try again.'
      return raw
    }

    const parseErrorMessage = async (response) => {
      try {
        const cloned = response.clone()
        const payload = await cloned.json().catch(() => null)
        const serverMessage = String(payload?.error || payload?.message || '').trim()
        if (serverMessage) return sanitizeErrorMessage(serverMessage, Number(response.status || 0))
      } catch {
        // ignore parse issues and fallback below
      }
      const fallback = String(response.statusText || '').trim()
      return sanitizeErrorMessage(fallback || 'Something went wrong. Please try again.', Number(response.status || 0))
    }

    const buildNetworkFailureResponse = (message) =>
      new Response(
        JSON.stringify({
          error: message || 'Network request failed.',
          code: 'NETWORK_ERROR',
        }),
        {
          status: 503,
          statusText: 'Network Error',
          headers: {
            'content-type': 'application/json',
          },
        },
      )

    const pushGlobalErrorOnce = (key, payload) => {
      const now = Date.now()
      const last = Number(recentGlobalErrorsRef.current.get(key) || 0)
      if (now - last < GLOBAL_ALERT_DEDUPE_MS) return
      recentGlobalErrorsRef.current.set(key, now)
      pushAlert(payload)
    }

    const isProtectedCustomerPath = (pathname) =>
      pathname.startsWith('/UserBackend') || pathname.startsWith('/wishlist')

    const redirectForUnauthorized = () => {
      if (typeof window === 'undefined') return true
      const currentPath = `${window.location.pathname}${window.location.search || ''}`
      if (!isProtectedCustomerPath(window.location.pathname)) {
        return false
      }
      const nextValue = encodeURIComponent(currentPath)
      const authDestination = `/signup?next=${nextValue}`
      if (window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/signup')) {
        return true
      }
      window.location.assign(authDestination)
      return true
    }

    window.fetch = async (input, init) => {
      const requestPath = readUrlPath(input)
      const isApiCall = requestPath.startsWith('/api/')
      const currentPath = window.location.pathname
      const isAuthRoute =
        currentPath.startsWith('/login') ||
        currentPath.startsWith('/signup') ||
        currentPath.startsWith('/vendor/login') ||
        currentPath.startsWith('/vendor/signup') ||
        currentPath.startsWith('/admin/login') ||
        currentPath.startsWith('/admin/signup')
      try {
        const response = await originalFetch(input, init)
        if (isApiCall && response.status === 401) {
          const redirected = redirectForUnauthorized()
          if (!redirected) {
            return response
          }
          return response
        }
        if (
          isApiCall &&
          !response.ok &&
          !shouldSkipGlobalAlert(input, init) &&
          !isNoisyGlobalPath(requestPath) &&
          !(isAuthRoute && response.status === 401)
        ) {
          const message = await parseErrorMessage(response)
          const code = Number(response.status || 0)
          const title =
            code >= 500
              ? 'Something went wrong'
              : code === 403
                ? 'Action not allowed'
                : 'Something went wrong'
          pushGlobalErrorOnce(`${requestPath}:${code}:${title}`, {
            type: 'error',
            title,
            message,
          })
        }
        return response
      } catch (fetchError) {
        const isAbortError =
          String(fetchError?.name || '').trim() === 'AbortError' ||
          String(fetchError?.message || '').toLowerCase().includes('aborted')
        if (isAbortError) {
          throw fetchError
        }

        const message = sanitizeErrorMessage(fetchError?.message || 'Network request failed.', 503)
        if (isApiCall && !shouldSkipGlobalAlert(input, init) && !isNoisyGlobalPath(requestPath)) {
          pushGlobalErrorOnce(`${requestPath}:network`, {
            type: 'error',
            title: 'Something went wrong',
            message,
          })
        }

        if (isApiCall) {
          return buildNetworkFailureResponse(message)
        }

        throw fetchError
      }
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [pushAlert])

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
      timeoutsRef.current.clear()
      confirmResolversRef.current.forEach((resolve) => resolve(false))
      confirmResolversRef.current.clear()
    }
  }, [])

  const latestAlert = alerts[alerts.length - 1] || null
  const value = useMemo(
    () => ({
      alerts,
      confirmations,
      latestAlert,
      pushAlert,
      removeAlert,
      confirmAlert,
      resolveConfirm,
    }),
    [alerts, confirmations, latestAlert, pushAlert, removeAlert, confirmAlert, resolveConfirm],
  )

  return (
    <AlertContext.Provider value={value}>
      {children}
    </AlertContext.Provider>
  )
}

export function useAlerts() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlerts must be used within AlertProvider')
  }
  return context
}
