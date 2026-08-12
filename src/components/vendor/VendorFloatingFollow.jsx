'use client'

import { useEffect, useRef, useState } from 'react'
import VendorConnectMenu from './VendorConnectMenu'

export default function VendorFloatingFollow({
  vendorName,
  vendorSlug,
  isFollowing,
  isFollowLoading,
  canFollow,
  onFollow,
  social,
  bottomOffset = 0,
}) {
  const [visible, setVisible] = useState(false)
  const [isConnectOpen, setIsConnectOpen] = useState(false)
  const btnRef = useRef(null)

  // Show after scrolling down 120px
  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 120)
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  if (!canFollow || isFollowing) return null

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-[490] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] sm:hidden ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 pointer-events-none'
      }`}
      style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${20 + bottomOffset}px)` }}
    >
      <button
        type="button"
        ref={btnRef}
        onClick={() => setIsConnectOpen((o) => !o)}
        disabled={isFollowLoading}
        className="relative flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold tracking-wide text-white shadow-lg shadow-black/20 transition-transform duration-150 active:scale-95 disabled:opacity-50"
      >
        {isFollowLoading ? (
          <span className="flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1 w-1 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1 w-1 rounded-full bg-current animate-bounce" />
          </span>
        ) : (
          <>
            <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Follow {vendorName}</span>
          </>
        )}
      </button>

      <VendorConnectMenu
        isOpen={isConnectOpen}
        onClose={() => setIsConnectOpen(false)}
        anchorRef={btnRef}
        vendorName={vendorName}
        social={social}
        isFollowing={isFollowing}
        isFollowLoading={isFollowLoading}
        onFollow={onFollow}
      />
    </div>
  )
}
