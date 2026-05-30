'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export const ADMIN_THEME_COOKIE = 'admin-theme'
const STORAGE_KEY = 'admin-theme'

const AdminThemeContext = createContext({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
})

function writePersisted(value) {
  try {
    // 1 year, SameSite=Lax so it's sent on navigation but not cross-site
    document.cookie = `${ADMIN_THEME_COOKIE}=${value}; path=/; max-age=31536000; SameSite=Lax`
    localStorage.setItem(STORAGE_KEY, value)
    sessionStorage.setItem(STORAGE_KEY, value)
  } catch {}
}

export function AdminThemeProvider({ children, initialTheme = 'light' }) {
  const [theme, setTheme] = useState(initialTheme)

  // On mount, sync from sessionStorage → localStorage → server cookie (in priority order)
  // so the appearance is always consistent even when the server-side cookie read fails or
  // when the provider remounts during client-side navigation.
  useEffect(() => {
    try {
      const session = sessionStorage.getItem(STORAGE_KEY)
      const local = localStorage.getItem(STORAGE_KEY)
      const stored = (session === 'dark' || session === 'light') ? session : local
      if (stored === 'dark' || stored === 'light') {
        setTheme(stored)
        // keep cookie fresh so the next SSR request gets the right value
        document.cookie = `${ADMIN_THEME_COOKIE}=${stored}; path=/; max-age=31536000; SameSite=Lax`
        sessionStorage.setItem(STORAGE_KEY, stored)
        localStorage.setItem(STORAGE_KEY, stored)
      }
    } catch {}
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      writePersisted(next)
      return next
    })
  }, [])

  return (
    <AdminThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme }}>
      {children}
    </AdminThemeContext.Provider>
  )
}

export const useAdminTheme = () => useContext(AdminThemeContext)
