'use client'

import { useEffect, useRef, useState } from 'react'

type ProductFloatingDockProps = {
  isTopMode: boolean
  onMessageClick: () => void
  onTopClick: () => void
  hasBottomOffset?: boolean
  inlineMode?: boolean
}

const MESSAGE_ICON_SETTLE_DELAY_MS = 1800
const MESSAGE_ATTENTION_ACTIVE_MS = 3000
const MESSAGE_ATTENTION_IDLE_MS = 8000

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
  const [isAttentionAnimating, setIsAttentionAnimating] = useState(false)
  const [isReturningToFloat, setIsReturningToFloat] = useState(false)
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const positionModeRef = useRef(hasBottomOffset)

  useEffect(() => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current)
      animationTimerRef.current = null
    }
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current)
      animationIntervalRef.current = null
    }

    if (isTopMode) {
      setShowAttentionMessageIcon(false)
      setIsAttentionAnimating(false)
      return
    }

    const startAttentionCycle = () => {
      setShowAttentionMessageIcon(true)
      setIsAttentionAnimating(true)
      animationTimerRef.current = setTimeout(() => {
        setIsAttentionAnimating(false)
        animationTimerRef.current = null
      }, MESSAGE_ATTENTION_ACTIVE_MS)
    }

    setShowAttentionMessageIcon(false)
    animationTimerRef.current = setTimeout(() => {
      startAttentionCycle()
      animationIntervalRef.current = setInterval(() => {
        startAttentionCycle()
      }, MESSAGE_ATTENTION_ACTIVE_MS + MESSAGE_ATTENTION_IDLE_MS)
      animationTimerRef.current = null
    }, MESSAGE_ICON_SETTLE_DELAY_MS)

    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current)
        animationTimerRef.current = null
      }
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current)
        animationIntervalRef.current = null
      }
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
    ? 'inline-flex items-center justify-center text-gray-700 transition hover:text-gray-900'
    : 'inline-flex min-h-[3.25rem] min-w-[3rem] items-center justify-center rounded-l-lg rounded-r-none px-2 py-3 text-gray-700 transition hover:text-gray-900 sm:min-h-[3rem] sm:min-w-[2.75rem] sm:px-1.5 sm:py-2.5'
  const shellClassName = inlineMode
    ? ''
    : `glass-shell relative rounded-l-lg rounded-r-none border border-r-0 border-white/55 bg-white/16 backdrop-blur-md shadow-[0_12px_28px_rgba(15,23,42,0.2)] ${
        !isTopMode && showAttentionMessageIcon && isAttentionAnimating ? 'dock-attention-shell' : ''
      }`
  const iconWrapClassName = inlineMode
    ? 'relative inline-flex h-6 w-6 items-center justify-center overflow-visible'
    : 'relative inline-flex h-7 w-7 items-center justify-center overflow-visible sm:h-6.5 sm:w-6.5'
  const iconClassName = inlineMode ? 'h-6 w-6' : 'h-7 w-7 sm:h-6.5 sm:w-6.5'

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
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'
            >
              <path
                d='M16 10H16.01M12 10H12.01M8 10H8.01M7 18.5V21L12 16H20V10M7 16H4V4H20V6'
                transform='matrix(-1 0 0 1 24 0)'
                stroke='currentColor'
                strokeWidth='1.7'
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
                d='M16 10H16.01M12 10H12.01M8 10H8.01M7 18.5V21L12 16H20V10M7 16H4V4H20V6'
                transform='matrix(-1 0 0 1 24 0)'
                stroke='currentColor'
                strokeWidth='1.8'
                strokeLinecap='round'
                strokeLinejoin='round'
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
            transform: translateY(0) scale(0.92) rotate(0deg);
          }
          14% {
            transform: translateY(-1px) scale(1.12) rotate(-8deg);
          }
          28% {
            transform: translateY(0) scale(1.08) rotate(7deg);
          }
          42% {
            transform: translateY(-1px) scale(1.13) rotate(-6deg);
          }
          56% {
            transform: translateY(0) scale(1.06) rotate(5deg);
          }
          70% {
            transform: translateY(0) scale(1.02) rotate(-2deg);
          }
          84% {
            transform: translateY(-1px) scale(1.05) rotate(2deg);
          }
          100% {
            transform: translateY(0) scale(1) rotate(0deg);
          }
        }

        @keyframes dockAttentionShellPulse {
          0% {
            transform: translateX(0);
            box-shadow: 0 12px 28px rgba(15, 23, 42, 0.2);
          }
          50% {
            transform: translateX(-2px);
            box-shadow: 0 14px 34px rgba(15, 23, 42, 0.24);
          }
          100% {
            transform: translateX(0);
            box-shadow: 0 12px 28px rgba(15, 23, 42, 0.2);
          }
        }

        .dock-attention-icon {
          animation: dockAttentionSequence 1.45s ease-in-out;
          transform-origin: center;
        }

        .dock-attention-shell {
          animation: dockAttentionShellPulse 2.2s ease-in-out;
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
