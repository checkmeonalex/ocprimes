'use client'

import { Children, useEffect, useRef, useState } from 'react'

const PRELOAD_ROOT_MARGIN = '240px 0px 240px 0px'

function SequentialSectionSlot({ enabled, index, onVisible, children }) {
  const slotRef = useRef(null)
  const hasUnlockedNextRef = useRef(false)

  useEffect(() => {
    if (!enabled || hasUnlockedNextRef.current) return undefined
    const element = slotRef.current
    if (!element || typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        hasUnlockedNextRef.current = true
        onVisible(index)
        observer.disconnect()
      },
      {
        root: null,
        rootMargin: PRELOAD_ROOT_MARGIN,
        threshold: 0.01,
      },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [enabled, index, onVisible])

  if (!enabled) return null

  return <div ref={slotRef}>{children}</div>
}

export default function HomeSectionSequence({ children }) {
  const sections = Children.toArray(children)
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (!sections.length) return undefined
    let frameOne = 0
    let frameTwo = 0
    let timeoutId = 0

    const unlockFirst = () => {
      setVisibleCount((current) => (current > 0 ? current : 1))
    }

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      frameOne = window.requestAnimationFrame(() => {
        frameTwo = window.requestAnimationFrame(unlockFirst)
      })

      return () => {
        window.cancelAnimationFrame(frameOne)
        window.cancelAnimationFrame(frameTwo)
      }
    }

    timeoutId = window.setTimeout(unlockFirst, 32)
    return () => window.clearTimeout(timeoutId)
  }, [sections.length])

  const handleSectionVisible = (index) => {
    setVisibleCount((current) => Math.max(current, Math.min(sections.length, index + 2)))
  }

  return sections.map((section, index) => (
    <SequentialSectionSlot
      key={`home-sequence-${index}`}
      enabled={index < visibleCount}
      index={index}
      onVisible={handleSectionVisible}
    >
      {section}
    </SequentialSectionSlot>
  ))
}
