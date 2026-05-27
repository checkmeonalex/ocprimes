'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import StoryVideoFeedSlide from './StoryVideoFeedSlide'

const STORY_PLAYER_Z_INDEX = 'z-[2147483200]'
const STORY_PLAYER_TRANSITION_MS = 320
const STORY_PLAYER_TOUCH_THRESHOLD = 48
const STORY_PLAYER_INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, summary, label, [role="button"]'

const StoryVideoPlayerModal = ({ open, story, stories = [], onClose, onActiveStoryChange }) => {
  const [mounted, setMounted] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const wheelLockRef = useRef(false)
  const wheelUnlockTimerRef = useRef(null)
  const touchStartYRef = useRef(0)
  const touchActiveRef = useRef(false)
  const touchMovedRef = useRef(false)

  const isInteractiveTouchTarget = useCallback((target) => {
    if (!(target instanceof Element)) return false
    return Boolean(target.closest(STORY_PLAYER_INTERACTIVE_SELECTOR))
  }, [])

  const videoStories = useMemo(
    () =>
      (Array.isArray(stories) ? stories : [])
        .filter((item) => item?.media_type === 'video' && item?.media_url),
    [stories],
  )

  const initialStoryId = String(story?.id || '').trim()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(
    () => () => {
      if (wheelUnlockTimerRef.current) {
        window.clearTimeout(wheelUnlockTimerRef.current)
      }
    },
    [],
  )

  const clampIndex = useCallback(
    (value) => {
      if (!videoStories.length) return 0
      return Math.max(0, Math.min(videoStories.length - 1, value))
    },
    [videoStories.length],
  )

  const unlockWheelLater = useCallback(() => {
    if (wheelUnlockTimerRef.current) {
      window.clearTimeout(wheelUnlockTimerRef.current)
    }
    wheelUnlockTimerRef.current = window.setTimeout(() => {
      wheelLockRef.current = false
    }, STORY_PLAYER_TRANSITION_MS)
  }, [])

  const goToNext = useCallback(() => {
    setActiveIndex((current) => {
      const next = clampIndex(current + 1)
      if (next !== current) {
        wheelLockRef.current = true
        unlockWheelLater()
      }
      return next
    })
  }, [clampIndex, unlockWheelLater])

  const goToPrevious = useCallback(() => {
    setActiveIndex((current) => {
      const next = clampIndex(current - 1)
      if (next !== current) {
        wheelLockRef.current = true
        unlockWheelLater()
      }
      return next
    })
  }, [clampIndex, unlockWheelLater])

  useEffect(() => {
    if (!open || !videoStories.length) return

    const nextIndex = Math.max(
      0,
      videoStories.findIndex((item) => String(item?.id || '').trim() === initialStoryId),
    )

    setActiveIndex(nextIndex)
  }, [initialStoryId, open, videoStories])

  useEffect(() => {
    if (!open) return
    const activeStory = videoStories[activeIndex] || null
    if (!activeStory) return
    onActiveStoryChange?.(activeStory)
  }, [activeIndex, onActiveStoryChange, open, videoStories])

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    const previousBodyOverscroll = document.body.style.overscrollBehavior
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.overscrollBehavior = 'none'

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
        return
      }
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault()
        goToNext()
        return
      }
      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault()
        goToPrevious()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousBodyOverscroll
      document.documentElement.style.overflow = previousHtmlOverflow
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll
      window.removeEventListener('keydown', handleEscape)
    }
  }, [goToNext, goToPrevious, onClose, open])

  if (!mounted || !open || !videoStories.length) return null

  const modalContent = (
    <div
      className={`fixed inset-0 ${STORY_PLAYER_Z_INDEX} bg-black/85`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <button
        type='button'
        onClick={onClose}
        className='absolute right-4 top-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55'
        aria-label='Close story player'
      >
        <X size={18} />
      </button>

      <div
        className='h-[100dvh] overflow-hidden overscroll-y-contain touch-pan-y'
        onWheel={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (wheelLockRef.current) return
          if (Math.abs(event.deltaY) < 8) return
          if (event.deltaY > 0) {
            goToNext()
            return
          }
          goToPrevious()
        }}
        onTouchStart={(event) => {
          event.stopPropagation()
          if (isInteractiveTouchTarget(event.target)) {
            touchActiveRef.current = false
            touchMovedRef.current = false
            return
          }
          touchStartYRef.current = event.changedTouches[0]?.clientY || 0
          touchActiveRef.current = true
          touchMovedRef.current = false
        }}
        onTouchMove={(event) => {
          if (!touchActiveRef.current) return
          const nextY = event.changedTouches[0]?.clientY || 0
          const deltaY = touchStartYRef.current - nextY
          touchMovedRef.current = Math.abs(deltaY) >= 6
          if (!touchMovedRef.current) return
          event.preventDefault()
          event.stopPropagation()
        }}
        onTouchEnd={(event) => {
          event.stopPropagation()
          if (!touchActiveRef.current) return
          touchActiveRef.current = false
          const endY = event.changedTouches[0]?.clientY || 0
          const deltaY = touchStartYRef.current - endY
          if (Math.abs(deltaY) < STORY_PLAYER_TOUCH_THRESHOLD) {
            touchMovedRef.current = false
            return
          }
          event.preventDefault()
          touchMovedRef.current = false
          if (deltaY > 0) {
            goToNext()
            return
          }
          goToPrevious()
        }}
      >
        <div
          className='h-full w-full transition-transform duration-300 ease-out'
          style={{ transform: `translate3d(0, -${activeIndex * 100}dvh, 0)` }}
        >
          {videoStories.map((item, index) => (
            <div
              key={item.id || `${item.media_url}-${index}`}
              data-story-index={String(index)}
              className='h-[100dvh] w-full'
            >
              <StoryVideoFeedSlide
                story={item}
                isActive={activeIndex === index}
                shouldAttachVideo={Math.abs(activeIndex - index) <= 1}
                canGoPrevious={index > 0}
                canGoNext={index < videoStories.length - 1}
                onPrevious={goToPrevious}
                onNext={goToNext}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default StoryVideoPlayerModal
