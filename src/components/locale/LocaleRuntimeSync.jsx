'use client'

import { useEffect } from 'react'
import {
  USER_LOCALE_EVENT,
  USER_LOCALE_STORAGE_KEY,
  applyLocaleToDocument,
} from '@/lib/user/locale-runtime'

export default function LocaleRuntimeSync() {
  useEffect(() => {
    let isCancelled = false

    try {
      const stored = window.localStorage.getItem(USER_LOCALE_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        applyLocaleToDocument(parsed)
      }
    } catch {
      // ignore malformed local storage payload
    }

    const handleLocaleChange = (event) => {
      applyLocaleToDocument(event?.detail)
    }

    const syncFromProfile = async () => {
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/backend/admin')) {
        return
      }
      try {
        const response = await fetch('/api/user/profile', { method: 'GET' })
        if (!response.ok) return
        const payload = await response.json().catch(() => null)
        const profile = payload?.profile || {}
        const language = typeof profile.language === 'string' ? profile.language : ''
        const currency = typeof profile.currency === 'string' ? profile.currency : ''
        const country = typeof profile.country === 'string' ? profile.country : ''
        if (!language && !currency && !country) return
        const runtimeLocale = { language, currency, country }
        if (isCancelled) return
        applyLocaleToDocument(runtimeLocale)
        try {
          window.localStorage.setItem(USER_LOCALE_STORAGE_KEY, JSON.stringify(runtimeLocale))
        } catch {
          // ignore storage errors
        }
      } catch {
        // ignore unauthorized/network failures
      }
    }

    void syncFromProfile()
    window.addEventListener(USER_LOCALE_EVENT, handleLocaleChange)
    return () => {
      isCancelled = true
      window.removeEventListener(USER_LOCALE_EVENT, handleLocaleChange)
    }
  }, [])

  return null
}
