'use client'

import { useEffect } from 'react'

export default function SmoothScrollProvider() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const coarsePointer = window.matchMedia('(pointer: coarse)')
    if (prefersReduced.matches || coarsePointer.matches) return

    let isAnimating = false
    let target = window.scrollY
    let current = window.scrollY
    const ease = 0.12

    const isScrollable = (el) => {
      const style = window.getComputedStyle(el)
      const overflowY = style.overflowY
      const canScroll =
        (overflowY === 'auto' || overflowY === 'scroll') &&
        el.scrollHeight - el.clientHeight > 1
      return canScroll
    }

    const hasScrollableAncestor = (node) => {
      let el = node instanceof Element ? node : null
      while (el && el !== document.body && el !== document.documentElement) {
        if (isScrollable(el)) return true
        el = el.parentElement
      }
      return false
    }

    const clampTarget = (value) => {
      const max =
        document.documentElement.scrollHeight - window.innerHeight
      return Math.max(0, Math.min(max, value))
    }

    const animate = () => {
      current += (target - current) * ease
      if (Math.abs(target - current) < 0.5) {
        current = target
        window.scrollTo(0, current)
        isAnimating = false
        return
      }
      window.scrollTo(0, current)
      window.requestAnimationFrame(animate)
    }

    const onWheel = (event) => {
      if (event.defaultPrevented) return
      if (event.ctrlKey) return
      if (hasScrollableAncestor(event.target)) return

      event.preventDefault()
      target = clampTarget(target + event.deltaY)
      if (!isAnimating) {
        isAnimating = true
        window.requestAnimationFrame(animate)
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [])

  return null
}
