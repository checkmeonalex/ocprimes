'use client'

import { useEffect, useRef, useState } from 'react'
import ProductPagePreloader from './ProductPagePreloader'

const PRODUCT_READY_EVENT = 'oc:product-route-ready'
const OVERLAY_TIMEOUT_MS = 12000
const MIN_VISIBLE_MS = 450

const isProductHref = (href) => {
  if (!href) return false
  let url
  try {
    url = new URL(href, window.location.href)
  } catch {
    return false
  }
  if (url.origin !== window.location.origin) return false
  return url.pathname.startsWith('/product/')
}

export const notifyProductRouteReady = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(PRODUCT_READY_EVENT))
}

export default function ProductNavigationOverlay() {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef(null)
  const clearDelayRef = useRef(null)
  const readyFrameRef = useRef(null)
  const visibleSinceRef = useRef(0)

  useEffect(() => {
    const clearReadyFrame = () => {
      if (readyFrameRef.current) {
        window.cancelAnimationFrame(readyFrameRef.current)
        readyFrameRef.current = null
      }
      if (clearDelayRef.current) {
        window.clearTimeout(clearDelayRef.current)
        clearDelayRef.current = null
      }
    }

    const clearOverlay = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      clearReadyFrame()
      setIsVisible(false)
    }

    const scheduleClearAfterPaint = () => {
      clearReadyFrame()
      const elapsed = Date.now() - visibleSinceRef.current
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed)

      clearDelayRef.current = window.setTimeout(() => {
        clearDelayRef.current = null
        readyFrameRef.current = window.requestAnimationFrame(() => {
          readyFrameRef.current = window.requestAnimationFrame(clearOverlay)
        })
      }, remaining)
    }

    const showOverlay = () => {
      visibleSinceRef.current = Date.now()
      setIsVisible(true)
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
      clearReadyFrame()
      timeoutRef.current = window.setTimeout(clearOverlay, OVERLAY_TIMEOUT_MS)
    }

    const handleClick = (event) => {
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest('a')
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return
      if (!isProductHref(anchor.href)) return

      const url = new URL(anchor.href, window.location.href)
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return
      }

      showOverlay()
    }

    window.addEventListener(PRODUCT_READY_EVENT, scheduleClearAfterPaint)
    document.addEventListener('click', handleClick)

    return () => {
      window.removeEventListener(PRODUCT_READY_EVENT, scheduleClearAfterPaint)
      document.removeEventListener('click', handleClick)
      clearReadyFrame()
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])

  if (!isVisible) return null

  return (
    <ProductPagePreloader className='fixed inset-x-0 bottom-0 top-24 z-30 lg:top-[106px]' />
  )
}
