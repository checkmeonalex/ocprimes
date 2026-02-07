'use client'

import { useEffect, useRef, useState } from 'react'

export default function StickySidebar({ children, topOffset = 112 }) {
  const asideWrapRef = useRef(null)
  const asideRef = useRef(null)
  const [stickyStyle, setStickyStyle] = useState({})

  useEffect(() => {
    let frameId = 0

    const updateSticky = () => {
      if (!asideWrapRef.current || !asideRef.current) return
      const isDesktop = window.innerWidth >= 1024
      if (!isDesktop) {
        setStickyStyle({})
        return
      }

      const wrapRect = asideWrapRef.current.getBoundingClientRect()
      const asideRect = asideRef.current.getBoundingClientRect()
      const scrollY = window.scrollY
      const wrapTop = wrapRect.top + scrollY
      const wrapBottom = wrapRect.bottom + scrollY
      const fixedTop = scrollY + topOffset
      const asideHeight = asideRect.height
      const left = asideRect.left
      const width = asideRect.width

      if (fixedTop <= wrapTop) {
        setStickyStyle({})
        return
      }

      if (fixedTop + asideHeight >= wrapBottom) {
        setStickyStyle({
          position: 'absolute',
          top: `${wrapBottom - wrapTop - asideHeight}px`,
          left: '0px',
          width: '100%',
        })
        return
      }

      setStickyStyle({
        position: 'fixed',
        top: `${topOffset}px`,
        left: `${left}px`,
        width: `${width}px`,
      })
    }

    const onScroll = () => {
      if (frameId) return
      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        updateSticky()
      })
    }

    updateSticky()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frameId) window.cancelAnimationFrame(frameId)
    }
  }, [topOffset])

  return (
    <aside ref={asideWrapRef} className='relative h-full'>
      <div ref={asideRef} style={stickyStyle}>
        {children}
      </div>
    </aside>
  )
}
