'use client'

import { useEffect, useRef, useState } from 'react'

type ProductFloatingDockProps = {
  isTopMode: boolean
  onMessageClick: () => void
  onTopClick: () => void
  hasBottomOffset?: boolean
  inlineMode?: boolean
}

const MESSAGE_ICON_SETTLE_DELAY_MS = 4000

export default function ProductFloatingDock({
  isTopMode,
  onMessageClick,
  onTopClick,
  hasBottomOffset = false,
  inlineMode = false,
}: ProductFloatingDockProps) {
  const mobileBottomClass = hasBottomOffset
    ? 'bottom-[calc(env(safe-area-inset-bottom)+5rem)]'
    : 'bottom-[calc(env(safe-area-inset-bottom)+0.5rem)]'
  const buttonAriaLabel = isTopMode ? 'Back to top' : 'Message seller'
  const buttonClickHandler = isTopMode ? onTopClick : onMessageClick
  const [showAttentionMessageIcon, setShowAttentionMessageIcon] = useState(false)
  const [isReturningToFloat, setIsReturningToFloat] = useState(false)
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const positionModeRef = useRef(hasBottomOffset)

  useEffect(() => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current)
      animationTimerRef.current = null
    }

    if (isTopMode) {
      setShowAttentionMessageIcon(false)
      return
    }

    // Show chat icon first, then settle to question icon.
    setShowAttentionMessageIcon(false)
    animationTimerRef.current = setTimeout(() => {
      setShowAttentionMessageIcon(true)
      animationTimerRef.current = null
    }, MESSAGE_ICON_SETTLE_DELAY_MS)

    return () => {
      if (!animationTimerRef.current) return
      clearTimeout(animationTimerRef.current)
      animationTimerRef.current = null
    }
  }, [isTopMode])

  useEffect(() => {
    if (inlineMode) return
    const wasOffset = positionModeRef.current
    positionModeRef.current = hasBottomOffset
    if (!(wasOffset && !hasBottomOffset)) return

    setIsReturningToFloat(true)
    const timer = setTimeout(() => {
      setIsReturningToFloat(false)
    }, 340)
    return () => clearTimeout(timer)
  }, [hasBottomOffset, inlineMode])

  const containerClassName = inlineMode
    ? 'absolute right-0 -top-12 z-30'
    : `fixed right-0 z-40 ${mobileBottomClass} sm:bottom-12 transition-[bottom,opacity,transform] duration-300 ease-out ${
        isReturningToFloat ? 'dock-return-fade' : ''
      }`
  const buttonClassName = inlineMode
    ? 'inline-flex items-center justify-center text-gray-600 transition hover:text-gray-900'
    : 'inline-flex items-center justify-center rounded-l-md rounded-r-none py-2.5 px-1.5 text-gray-600 transition hover:text-gray-900 sm:py-2 sm:px-1'
  const shellClassName = inlineMode
    ? ''
    : 'glass-shell relative rounded-l-lg rounded-r-none border border-r-0 border-white/45 bg-white/10 backdrop-blur-md shadow-[0_10px_24px_rgba(15,23,42,0.18)]'
  const iconWrapClassName = inlineMode
    ? 'relative inline-flex h-5 w-5 items-center justify-center overflow-visible'
    : 'relative inline-flex h-5 w-5 items-center justify-center overflow-visible'
  const iconClassName = inlineMode ? 'h-5 w-5' : 'h-5 w-5'

  return (
    <div className={containerClassName}>
      <div className={shellClassName}>
        <button
          type='button'
          onClick={buttonClickHandler}
          aria-label={buttonAriaLabel}
          className={buttonClassName}
        >
          <span className={iconWrapClassName}>
            <svg
              viewBox='0 0 24 24'
              className={`absolute ${iconClassName} transition-all duration-300 ${
                isTopMode || showAttentionMessageIcon
                  ? 'translate-y-1 scale-95 opacity-0'
                  : 'translate-y-0 scale-100 opacity-100'
              }`}
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
              aria-hidden='true'
            >
              <path d='M7 8.5h10M7 12h6' strokeLinecap='round' />
              <path
                d='M6 18.2v-2.5c-1.7-1.3-2.8-3.3-2.8-5.6C3.2 6 6.9 3 12 3s8.8 3 8.8 7.1-3.7 7.1-8.8 7.1c-1.2 0-2.3-.2-3.4-.6L6 18.2z'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
            <svg
              viewBox='0 0 24 24'
              className={`absolute ${iconClassName} transition-all duration-200 ${
                !isTopMode && showAttentionMessageIcon
                  ? 'dock-attention-icon opacity-100'
                  : 'scale-95 opacity-0'
              }`}
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'
            >
              <path
                d='M10.125 8.875C10.125 7.83947 10.9645 7 12 7C13.0355 7 13.875 7.83947 13.875 8.875C13.875 9.56245 13.505 10.1635 12.9534 10.4899C12.478 10.7711 12 11.1977 12 11.75V13'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
              />
              <circle cx='12' cy='16' r='1' fill='currentColor' />
              <path
                d='M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
              />
            </svg>
            <svg
              viewBox='0 0 48 48'
              className={`absolute ${iconClassName} transition-all duration-300 ${
                isTopMode ? 'translate-y-0 scale-100 opacity-100' : '-translate-y-1 scale-95 opacity-0'
              }`}
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'
            >
              <path
                d='M24.0083 14.1005V42'
                stroke='currentColor'
                strokeWidth='4'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <path
                d='M12 26L24 14L36 26'
                stroke='currentColor'
                strokeWidth='4'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <path
                d='M12 6H36'
                stroke='currentColor'
                strokeWidth='4'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </span>
        </button>
      </div>
      <style jsx>{`
        @keyframes dockReturnFade {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes dockAttentionSequence {
          0% {
            transform: scale(0.86) rotate(0deg);
          }
          20% {
            transform: scale(1.12) rotate(-8deg);
          }
          34% {
            transform: scale(1.08) rotate(7deg);
          }
          48% {
            transform: scale(1.13) rotate(-6deg);
          }
          62% {
            transform: scale(1.06) rotate(5deg);
          }
          78% {
            transform: scale(1.02) rotate(-2deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }

        .dock-attention-icon {
          animation: dockAttentionSequence 780ms ease-out;
          transform-origin: center;
        }

        .dock-return-fade {
          animation: dockReturnFade 320ms ease-out;
        }

        .glass-shell {
          -webkit-backdrop-filter: blur(10px);
        }
      `}</style>
    </div>
  )
}
