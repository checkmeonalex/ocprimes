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

  if (!canFollow || isFollowing) return null

  return (
    <div
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[490] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] sm:hidden ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 pointer-events-none'
      }`}
    >
      <button
        type="button"
        onClick={onFollow}
        disabled={isFollowLoading}
        className="relative flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-transform duration-150 active:scale-95 disabled:opacity-50"
        style={{
          background: 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.35)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5)',
          color: 'rgba(20,20,20,0.9)',
          textShadow: '0 1px 1px rgba(255,255,255,0.4)',
        }}
      >
        {/* inner gloss highlight */}
        <span
          className="pointer-events-none absolute inset-x-2 top-0 h-px rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)' }}
        />

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
    </div>
  )
}
