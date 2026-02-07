'use client'

import { useEffect, useRef } from 'react'
import StoriesComponent from '../StoriesComponent'

const SNAP_THRESHOLD = 0.35
const SNAP_ROOT_MARGIN = '0px 0px -20% 0px'

export default function MagneticStoriesSection() {
  const sectionRef = useRef(null)
  const hasSnappedRef = useRef(false)
  const userScrolledRef = useRef(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const handleScroll = () => {
      if (window.scrollY > 0) userScrolledRef.current = true
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        if (hasSnappedRef.current || !userScrolledRef.current) return
        hasSnappedRef.current = true
        requestAnimationFrame(() => {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
        observer.disconnect()
      },
      { threshold: SNAP_THRESHOLD, rootMargin: SNAP_ROOT_MARGIN },
    )

    observer.observe(section)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div ref={sectionRef}>
      <StoriesComponent />
    </div>
  )
}
