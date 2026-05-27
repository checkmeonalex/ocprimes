'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const Breadcrumb = ({
  items = [],
  backHref = null,
  onBack = null,
  rightAction = null,
  collapseFrom = null,
}) => {
  const router = useRouter()
  const trailRef = useRef(null)
  const autoScrollingRef = useRef(false)
  const [isMobile, setIsMobile] = useState(false)
  const [expandedOnScroll, setExpandedOnScroll] = useState(false)

  useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    updateIsMobile()
    window.addEventListener('resize', updateIsMobile)
    return () => window.removeEventListener('resize', updateIsMobile)
  }, [])

  useEffect(() => {
    if (!isMobile) {
      setExpandedOnScroll(false)
    }
  }, [isMobile, items, collapseFrom])

  useEffect(() => {
    if (!isMobile || !trailRef.current) return
    autoScrollingRef.current = true
    const node = trailRef.current
    const id = window.requestAnimationFrame(() => {
      node.scrollLeft = node.scrollWidth
      window.requestAnimationFrame(() => {
        autoScrollingRef.current = false
      })
    })
    return () => window.cancelAnimationFrame(id)
  }, [isMobile, items, collapseFrom])

  const visibleItems =
    Number.isInteger(collapseFrom) &&
    collapseFrom >= 3 &&
    Array.isArray(items) &&
    items.length > collapseFrom &&
    !(isMobile && expandedOnScroll)
      ? isMobile
        ? [...items.slice(0, collapseFrom - 1), { label: '...', isEllipsis: true }]
        : [items[0], { label: '...', isEllipsis: true }, ...items.slice(-(collapseFrom - 2))]
      : items

  const handleBack = () => {
    if (onBack) {
      onBack()
      return
    }
    if (backHref) {
      return
    }
    router.back()
  }

  return (
    <div className='flex items-center justify-between w-full text-sm text-gray-600 px-1 sm:px-2'>
      <div className='flex items-center gap-4 min-w-0 overflow-hidden'>
        {backHref ? (
          <Link
            href={backHref}
            className='inline-flex items-center gap-1.5 px-2 py-0.5 bg-white text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition'
          >
            <svg
              className='h-3.5 w-3.5'
              viewBox='0 0 20 20'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
              aria-hidden='true'
            >
              <path d='M12.5 5.5 8 10l4.5 4.5' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
            <span>Back</span>
          </Link>
        ) : (
          <button
            type='button'
            onClick={handleBack}
            className='inline-flex items-center gap-1.5 px-2 py-0.5 bg-white text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition'
          >
            <svg
              className='h-3.5 w-3.5'
              viewBox='0 0 20 20'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
              aria-hidden='true'
            >
              <path d='M12.5 5.5 8 10l4.5 4.5' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
            <span>Back</span>
          </button>
        )}

        <div
          ref={trailRef}
          onScroll={() => {
            if (!isMobile) return
            if (!trailRef.current) return
            if (autoScrollingRef.current) return
            if (trailRef.current.scrollLeft > 0) {
              setExpandedOnScroll(true)
            }
          }}
          className='flex items-center gap-2 text-gray-500 min-w-0 overflow-x-auto sm:overflow-hidden whitespace-nowrap pr-2 no-scrollbar'
        >
          {visibleItems.map((item, index) => {
            const isLast = index === visibleItems.length - 1
            return (
              <div
                key={`${item.label}-${index}`}
                className='flex items-center gap-2 min-w-0 shrink-0'
              >
                {item.isEllipsis ? (
                  <span className='text-gray-400'>...</span>
                ) : item.href ? (
                  <Link
                    href={item.href}
                    className='transition underline underline-offset-2 decoration-gray-300 hover:text-gray-700 hover:decoration-gray-500 max-w-none sm:max-w-[10rem] lg:max-w-[14rem] sm:truncate'
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className='text-gray-700 max-w-none sm:max-w-[12rem] lg:max-w-[18rem] sm:truncate'>
                    {item.label}
                  </span>
                )}
                {!isLast && <span className='text-gray-300'>/</span>}
              </div>
            )
          })}
        </div>
      </div>

      {rightAction && (
        <div className='flex items-center'>
          {rightAction.href ? (
            <Link
              href={rightAction.href}
              aria-label={rightAction.ariaLabel || rightAction.label}
              className='inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition'
            >
              {rightAction.icon}
              {rightAction.label && <span>{rightAction.label}</span>}
            </Link>
          ) : (
            <button
              type='button'
              onClick={rightAction.onClick}
              aria-label={rightAction.ariaLabel || rightAction.label}
              className='inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition'
            >
              {rightAction.icon}
              {rightAction.label && <span>{rightAction.label}</span>}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default Breadcrumb
