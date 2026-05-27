'use client'

import { useEffect } from 'react'

const isSupportedOrigin = () => {
  if (typeof window === 'undefined') return false
  const { protocol, hostname } = window.location
  return protocol === 'https:' || hostname === 'localhost' || hostname === '127.0.0.1'
}

export default function PwaRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (!isSupportedOrigin()) return

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })

        const activateWaitingWorker = (worker) => {
          if (!worker) return
          worker.postMessage({ type: 'SKIP_WAITING' })
        }

        if (registration.waiting) {
          activateWaitingWorker(registration.waiting)
        }

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing
          if (!worker) return

          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              activateWaitingWorker(worker)
            }
          })
        })
      } catch {
        // Fail silently so PWA setup never breaks the storefront.
      }
    }

    window.addEventListener('load', registerServiceWorker, { once: true })
    return () => {
      window.removeEventListener('load', registerServiceWorker)
    }
  }, [])

  return null
}
