'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const AlertContext = createContext(null)

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
