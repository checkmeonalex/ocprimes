import { useCallback, useEffect, useRef, useState } from 'react'

const useHorizontalScroll = ({ step = 240 } = {}) => {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const update = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const maxScrollLeft = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(maxScrollLeft - el.scrollLeft > 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return undefined
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    el.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      el.removeEventListener('scroll', update)
    }
  }, [update])

  const scrollByAmount = useCallback(
    (direction) => {
      const el = scrollRef.current
      if (!el) return
      el.scrollBy({ left: direction * step, behavior: 'smooth' })
    },
    [step],
  )

  return { scrollRef, canScrollLeft, canScrollRight, scrollByAmount }
}

export default useHorizontalScroll
