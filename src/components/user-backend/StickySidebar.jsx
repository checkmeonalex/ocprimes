'use client'

import { useEffect, useRef, useState } from 'react'

export default function StickySidebar({
  children,
  topOffset = 112,
  collapsedTopOffset = null,
  collapseAfter = 20,
}) {
  const wrapRef = useRef(null)
  const contentRef = useRef(null)
  const frameRef = useRef(0)
  const [stickyStyle, setStickyStyle] = useState({})

  useEffect(() => {
    const updateSticky = () => {
      const wrapEl = wrapRef.current
      const contentEl = contentRef.current
      if (!wrapEl || !contentEl) return

      const isDesktop = window.innerWidth >= 1024
      if (!isDesktop) {
        wrapEl.style.minHeight = ''
        setStickyStyle({})
        return
      }

      const wrapRect = wrapEl.getBoundingClientRect()
      const contentRect = contentEl.getBoundingClientRect()
      const scrollY = window.scrollY
      const activeTopOffset =
        collapsedTopOffset !== null && scrollY > collapseAfter
          ? collapsedTopOffset
          : topOffset
      const wrapTop = wrapRect.top + scrollY
      const wrapBottom = wrapRect.bottom + scrollY
      const fixedTop = scrollY + activeTopOffset
      const contentHeight = contentRect.height

      wrapEl.style.minHeight = `${contentHeight}px`

      if (fixedTop <= wrapTop) {
        setStickyStyle({})
        return
      }

      if (fixedTop + contentHeight >= wrapBottom) {
        setStickyStyle({
          position: 'absolute',
          top: `${Math.max(0, wrapBottom - wrapTop - contentHeight)}px`,
          left: '0px',
          width: '100%',
        })
        return
      }

      setStickyStyle({
        position: 'fixed',
        top: `${activeTopOffset}px`,
        left: `${wrapRect.left}px`,
        width: `${wrapRect.width}px`,
      })
    }

    const queueUpdate = () => {
      if (frameRef.current) return
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = 0
        updateSticky()
      })
    }

    const resizeObserver = new ResizeObserver(() => {
      queueUpdate()
    })

    if (wrapRef.current) resizeObserver.observe(wrapRef.current)
    if (contentRef.current) resizeObserver.observe(contentRef.current)

    queueUpdate()
    window.addEventListener('scroll', queueUpdate, { passive: true })
    window.addEventListener('resize', queueUpdate, { passive: true })

    return () => {
      window.removeEventListener('scroll', queueUpdate)
      window.removeEventListener('resize', queueUpdate)
      resizeObserver.disconnect()
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [topOffset, collapsedTopOffset, collapseAfter])

  return (
    <aside ref={wrapRef} className='relative h-full'>
      <div ref={contentRef} style={stickyStyle}>
        {children}
      </div>
    </aside>
  )
}
