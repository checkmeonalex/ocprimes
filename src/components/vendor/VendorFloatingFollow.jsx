'use client'

import { useEffect, useState } from 'react'

export default function VendorFloatingFollow({
  vendorName,
  vendorSlug,
  isFollowing,
  isFollowLoading,
  canFollow,
  onFollow,
}) {
  const [visible, setVisible] = useState(false)

  // Show after scrolling down 120px
  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 120)
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  if (!canFollow) return null

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[490] transition-all duration-300 ease-out sm:hidden ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'
      }`}
    >
      <button
        type="button"
        onClick={onFollow}
        disabled={isFollowLoading}
        className={`flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg shadow-black/30 transition-all active:scale-95 disabled:opacity-60 ${
          isFollowing
            ? 'bg-white text-gray-800 border border-gray-200'
            : 'bg-gray-900 text-white border border-white/10'
        }`}
      >
        {isFollowLoading ? (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
          </span>
        ) : (
          <>
            {isFollowing ? (
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            )}
            <span>{isFollowing ? `Following ${vendorName}` : `Follow ${vendorName}`}</span>
          </>
        )}
      </button>
    </div>
  )
}
