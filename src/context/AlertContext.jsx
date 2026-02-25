'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const AlertContext = createContext(null)
const GLOBAL_ALERT_DEDUPE_MS = 4000

const buildAlert = ({ type = 'info', title, message, timeoutMs = 5000 }) => ({
  id: crypto.randomUUID(),
  type,
  title: title || '',
  message: message || '',
  timeoutMs,
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
    setAlerts((prev) => [...prev, alert])
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

    const parseErrorMessage = async (response) => {
      try {
        const cloned = response.clone()
        const payload = await cloned.json().catch(() => null)
        const serverMessage = String(payload?.error || payload?.message || '').trim()
        if (serverMessage) return serverMessage
      } catch {
        // ignore parse issues and fallback below
      }
      const fallback = String(response.statusText || '').trim()
      return fallback || 'Something went wrong. Please try again.'
    }

    const pushGlobalErrorOnce = (key, payload) => {
      const now = Date.now()
      const last = Number(recentGlobalErrorsRef.current.get(key) || 0)
      if (now - last < GLOBAL_ALERT_DEDUPE_MS) return
      recentGlobalErrorsRef.current.set(key, now)
      pushAlert(payload)
    }

    window.fetch = async (input, init) => {
      const requestPath = readUrlPath(input)
      const isApiCall = requestPath.startsWith('/api/')
      try {
        const response = await originalFetch(input, init)
        if (isApiCall && !response.ok && !shouldSkipGlobalAlert(input, init)) {
          const message = await parseErrorMessage(response)
          const code = Number(response.status || 0)
          const title = code >= 500 ? 'Something went wrong' : code === 401 ? 'Sign in required' : code === 403 ? 'Permission denied' : 'Request failed'
          pushGlobalErrorOnce(`${requestPath}:${code}:${message}`, {
            type: 'error',
            title,
            message,
          })
        }
        return response
      } catch (fetchError) {
        if (isApiCall && !shouldSkipGlobalAlert(input, init)) {
          const message = String(fetchError?.message || 'Network request failed.').trim()
          pushGlobalErrorOnce(`${requestPath}:network:${message}`, {
            type: 'error',
            title: 'Network error',
            message,
          })
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
