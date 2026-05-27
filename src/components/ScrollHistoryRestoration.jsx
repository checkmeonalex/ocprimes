'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef } from 'react'

const HISTORY_SCROLL_ROUTE_KEY = '__ocpScrollRoute'
const HISTORY_SCROLL_Y_KEY = '__ocpScrollY'
const SESSION_SCROLL_PREFIX = 'ocp:scroll:'

const buildRouteKey = (pathname, searchParams) => {
  const safePath = String(pathname || '/')
  const query = searchParams?.toString() || ''
  return query ? `${safePath}?${query}` : safePath
}

const getScrollTop = () =>
  Math.max(
    0,
    Number(window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0),
  )

const getSessionKey = (routeKey) => `${SESSION_SCROLL_PREFIX}${routeKey}`

const getNavigationType = () => {
  const entry = window.performance?.getEntriesByType?.('navigation')?.[0]
  if (entry && typeof entry.type === 'string') return entry.type

  const legacyType = window.performance?.navigation?.type
  if (legacyType === 1) return 'reload'
  if (legacyType === 2) return 'back_forward'
  return 'navigate'
}

const readScrollFromState = (routeKey) => {
  const state = window.history.state
  if (!state || typeof state !== 'object') return null
  if (state[HISTORY_SCROLL_ROUTE_KEY] !== routeKey) return null

  const scrollY = Number(state[HISTORY_SCROLL_Y_KEY])
  return Number.isFinite(scrollY) ? Math.max(0, scrollY) : null
}

const readScrollFromSession = (routeKey) => {
  try {
    const raw = window.sessionStorage.getItem(getSessionKey(routeKey))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const scrollY = Number(parsed?.windowY)
    return Number.isFinite(scrollY) ? Math.max(0, scrollY) : null
  } catch {
    return null
  }
}

const writeScrollSnapshot = (routeKey) => {
  const scrollY = getScrollTop()
  const currentState =
    window.history.state && typeof window.history.state === 'object'
      ? window.history.state
      : {}

  if (
    currentState[HISTORY_SCROLL_ROUTE_KEY] !== routeKey ||
    Number(currentState[HISTORY_SCROLL_Y_KEY]) !== scrollY
  ) {
    window.history.replaceState(
      {
        ...currentState,
        [HISTORY_SCROLL_ROUTE_KEY]: routeKey,
        [HISTORY_SCROLL_Y_KEY]: scrollY,
      },
      '',
      window.location.href,
    )
  }

  try {
    window.sessionStorage.setItem(
      getSessionKey(routeKey),
      JSON.stringify({ windowY: scrollY }),
    )
  } catch {
    // ignore storage failures
  }
}

const restoreScroll = (targetY) => {
  const desiredY = Math.max(0, Number(targetY) || 0)
  let frameId = 0
  let attempt = 0
  const maxAttempts = 12

  const apply = () => {
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    const nextY = Math.min(desiredY, maxY)
    window.scrollTo({ top: nextY, behavior: 'auto' })

    if (Math.abs(getScrollTop() - nextY) < 2 || attempt >= maxAttempts) {
      return
    }

    attempt += 1
    frameId = window.requestAnimationFrame(apply)
  }

  frameId = window.requestAnimationFrame(() => {
    frameId = window.requestAnimationFrame(apply)
  })

  return () => {
    if (frameId) window.cancelAnimationFrame(frameId)
  }
}

export default function ScrollHistoryRestoration() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = useMemo(
    () => buildRouteKey(pathname, searchParams),
    [pathname, searchParams],
  )
  const routeKeyRef = useRef(routeKey)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    routeKeyRef.current = routeKey

    const navigationType = getNavigationType()
    if (navigationType === 'back_forward') {
      return undefined
    }

    const storedFromState = readScrollFromState(routeKey)
    const storedFromSession =
      navigationType === 'reload' ? readScrollFromSession(routeKey) : null

    const targetY = storedFromSession ?? storedFromState
    if (targetY === null || targetY === undefined) {
      return undefined
    }

    return restoreScroll(targetY)
  }, [routeKey])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    let ticking = false
    const persistCurrent = () => {
      writeScrollSnapshot(routeKeyRef.current)
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(() => {
        persistCurrent()
        ticking = false
      })
    }

    const onPageHide = () => {
      persistCurrent()
    }

    const onBeforeUnload = () => {
      persistCurrent()
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('beforeunload', onBeforeUnload)
      persistCurrent()
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    return () => {
      writeScrollSnapshot(routeKey)
    }
  }, [routeKey])

  return null
}
