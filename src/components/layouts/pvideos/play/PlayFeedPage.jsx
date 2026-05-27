'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Heart,
  House,
  Package,
  ShoppingBag,
  ShoppingCart,
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import PlayVideoCard from './PlayVideoCard'

const getCategoryFallback = (value = '') => {
  const normalized = String(value || '').trim()
  return normalized.slice(0, 1).toUpperCase() || '#'
}

const formatVideoCount = (value = 0) => `${Number(value) || 0} ${Number(value) === 1 ? 'video' : 'videos'}`

export default function PlayFeedPage({ videos = [] }) {
  const pathname = usePathname()
  const feedRef = useRef(null)
  const previousActiveIndexRef = useRef(-1)
  const [selectedCategoryId, setSelectedCategoryId] = useState('all')
  const [activeVideoId, setActiveVideoId] = useState('')
  const [feedViewportHeight, setFeedViewportHeight] = useState(0)
  const [isCategoryStripCollapsed, setIsCategoryStripCollapsed] = useState(false)
  const [isGlobalMuted, setIsGlobalMuted] = useState(false)

  const safeVideos = Array.isArray(videos) ? videos : []
  const categoryCounts = useMemo(() => {
    const counts = new Map()
    safeVideos.forEach((video) => {
      const categoryId = String(video?.leaf_category_id || '').trim()
      if (!categoryId) return
      counts.set(categoryId, (counts.get(categoryId) || 0) + 1)
    })
    return counts
  }, [safeVideos])

  const categories = useMemo(() => {
    const items = new Map()
    safeVideos.forEach((video) => {
      const categoryId = String(video?.leaf_category_id || '').trim()
      if (!categoryId || items.has(categoryId)) return
      items.set(categoryId, {
        id: categoryId,
        label: String(video?.leaf_category_name || '').trim() || 'Category',
        image: String(video?.poster_url || '').trim(),
        count: categoryCounts.get(categoryId) || 0,
      })
    })

    return [
      { id: 'all', label: 'All', image: '', count: safeVideos.length },
      ...Array.from(items.values()).sort((left, right) => left.label.localeCompare(right.label)),
    ]
  }, [categoryCounts, safeVideos])

  const filteredVideos = useMemo(() => {
    if (selectedCategoryId === 'all') return safeVideos
    return safeVideos.filter(
      (video) => String(video?.leaf_category_id || '').trim() === selectedCategoryId,
    )
  }, [safeVideos, selectedCategoryId])

  const activeVideoIndex = useMemo(
    () => filteredVideos.findIndex((item) => String(item?.id || '') === String(activeVideoId || '')),
    [activeVideoId, filteredVideos],
  )

  useEffect(() => {
    if (selectedCategoryId === 'all') return
    const stillExists = categories.some((category) => category.id === selectedCategoryId)
    if (!stillExists) setSelectedCategoryId('all')
  }, [categories, selectedCategoryId])

  useEffect(() => {
    const feedEl = feedRef.current
    if (!feedEl || typeof IntersectionObserver === 'undefined') return undefined

    const cards = Array.from(feedEl.querySelectorAll('[data-play-video-card]'))
    const observer = new IntersectionObserver(
      (entries) => {
        let bestEntry = null
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
            bestEntry = entry
          }
        })

        if (!bestEntry) return
        const videoId =
          bestEntry.target instanceof HTMLElement ? String(bestEntry.target.dataset.videoId || '') : ''
        if (videoId) setActiveVideoId(videoId)
      },
      {
        root: feedEl,
        threshold: [0.5, 0.72, 0.9],
      },
    )

    cards.forEach((card) => observer.observe(card))

    if (filteredVideos[0]?.id) {
      setActiveVideoId(String(filteredVideos[0].id))
    }

    return () => observer.disconnect()
  }, [filteredVideos])

  useEffect(() => {
    if (!feedRef.current) return
    previousActiveIndexRef.current = -1
    setIsCategoryStripCollapsed(false)
    feedRef.current.scrollTo({ top: 0, behavior: 'auto' })
  }, [selectedCategoryId])

  useEffect(() => {
    const feedEl = feedRef.current
    if (!feedEl) return undefined

    const updateFeedViewportHeight = () => {
      const nextHeight = Math.max(0, Math.round(feedEl.clientHeight || 0))
      setFeedViewportHeight((current) => (current === nextHeight ? current : nextHeight))
    }

    updateFeedViewportHeight()

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => updateFeedViewportHeight())
        : null

    resizeObserver?.observe(feedEl)
    window.addEventListener('resize', updateFeedViewportHeight)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateFeedViewportHeight)
    }
  }, [])

  useEffect(() => {
    if (!activeVideoId) return

    const currentIndex = filteredVideos.findIndex(
      (item) => String(item?.id || '') === String(activeVideoId || ''),
    )

    if (currentIndex < 0) return

    const previousIndex = previousActiveIndexRef.current
    previousActiveIndexRef.current = currentIndex

    if (previousIndex < 0 || previousIndex === currentIndex) return

    if (currentIndex > previousIndex) {
      setIsCategoryStripCollapsed(true)
    }
  }, [activeVideoId, filteredVideos])

  const toggleCategoryStrip = useCallback(() => {
    setIsCategoryStripCollapsed((current) => !current)
  }, [isCategoryStripCollapsed])

  const scrollToVideoIndex = useCallback((index) => {
    const feedEl = feedRef.current
    if (!feedEl) return
    const cards = Array.from(feedEl.querySelectorAll('[data-play-video-card]'))
    const targetCard = cards[index]
    if (!(targetCard instanceof HTMLElement)) return
    targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const goToPreviousVideo = useCallback(() => {
    if (activeVideoIndex <= 0) return
    scrollToVideoIndex(activeVideoIndex - 1)
  }, [activeVideoIndex, scrollToVideoIndex])

  const goToNextVideo = useCallback(() => {
    if (activeVideoIndex < 0 || activeVideoIndex >= filteredVideos.length - 1) return
    scrollToVideoIndex(activeVideoIndex + 1)
  }, [activeVideoIndex, filteredVideos.length, scrollToVideoIndex])

  const desktopNavItems = [
    { label: 'Home', href: '/', icon: House },
    { label: 'Play', href: '/play', icon: Clapperboard },
    { label: 'Shop', href: '/products', icon: ShoppingBag },
    { label: 'Wishlist', href: '/wishlist', icon: Heart },
    { label: 'Cart', href: '/cart', icon: ShoppingCart },
    { label: 'Orders', href: '/UserBackend/orders', icon: Package },
  ]

  return (
    <section className='h-[calc(100dvh-4rem)] overflow-hidden bg-white text-slate-900 lg:h-[100dvh]'>
      <div className='grid h-full max-w-[1240px] grid-cols-1 gap-0 lg:grid-cols-[220px_minmax(0,1fr)]'>
        <aside className='hidden border-r border-slate-200/80 bg-white lg:flex lg:min-h-0 lg:flex-col'>
          <div className='flex h-full flex-col py-5'>
            <div className='px-6 pb-6'>
              <div className='inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm'>
                <Clapperboard size={18} strokeWidth={2.2} />
              </div>
            </div>

            <nav className='space-y-1.5'>
              {desktopNavItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex w-full items-center gap-3 rounded-l-none rounded-r-2xl pl-4 pr-6 py-3 transition ${
                      isActive
                        ? 'bg-slate-100 text-slate-950'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <span className='inline-flex h-10 w-10 items-center justify-center rounded-xl'>
                      <Icon size={21} strokeWidth={2.1} />
                    </span>
                    <span className='text-[15px] font-medium'>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </aside>

        <main className='relative flex min-h-0 flex-col'>
          <div
            className={`bg-white px-3 md:px-5 lg:px-8 ${
              isCategoryStripCollapsed
                ? 'border-b-0 pb-0 pt-0'
                : 'border-b border-slate-200/80 pb-2 pt-2 md:pb-3 md:pt-5'
            }`}
          >
            <div
              className={`overflow-hidden transition-all duration-200 ease-out ${
                isCategoryStripCollapsed ? 'max-h-0 opacity-0' : 'max-h-32 opacity-100'
              }`}
            >
              <div className='flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:gap-4'>
                  {categories.map((category) => {
                    const isActive = category.id === selectedCategoryId
                    return (
                      <button
                        key={category.id}
                        type='button'
                        onClick={() => setSelectedCategoryId(category.id)}
                        className='flex min-w-[46px] flex-none flex-col items-center gap-1 text-center md:min-w-[76px] md:gap-2'
                      >
                        <span
                          className={`relative flex h-[44px] w-[44px] items-center justify-center overflow-hidden rounded-full p-[2px] transition md:h-[74px] md:w-[74px] md:p-[3px] ${
                            isActive
                              ? 'bg-[linear-gradient(135deg,#f59e0b,#ef4444,#8b5cf6)] shadow-[0_10px_24px_rgba(244,114,182,0.18)]'
                              : 'bg-slate-200'
                          }`}
                        >
                          <span className='relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white bg-white'>
                            {category.image ? (
                              <Image
                                src={category.image}
                                alt={category.label}
                                fill
                                sizes='68px'
                                className='object-cover'
                              />
                            ) : (
                              <span className='text-sm font-semibold text-slate-700 md:text-lg'>
                                {getCategoryFallback(category.label)}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className='block w-[54px] truncate text-[9px] font-medium leading-3 text-slate-700 md:w-[84px] md:text-[11px] md:leading-4'>
                          {category.label}
                        </span>
                      </button>
                    )
                  })}
              </div>
            </div>
          </div>

          <div
            ref={feedRef}
            className='flex-1 snap-y snap-mandatory overflow-y-auto overscroll-y-contain scroll-smooth px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:px-5 lg:px-8'
          >
            <div
              data-play-feed-column='true'
              className='mx-auto flex h-full min-h-full max-w-[620px] flex-col lg:max-w-[760px]'
            >
              {filteredVideos.length ? (
                filteredVideos.map((item) => (
                  <div
                    key={item.id}
                    data-play-video-card
                    data-video-id={item.id}
                    className='box-border flex h-full min-h-full snap-start items-start justify-center py-0 md:items-center md:py-4'
                    style={feedViewportHeight ? { height: `${feedViewportHeight}px` } : undefined}
                  >
                    <PlayVideoCard
                      item={item}
                      isActive={activeVideoId === item.id}
                      isChromeCollapsed={isCategoryStripCollapsed}
                      isMuted={isGlobalMuted}
                      onToggleCategoryStrip={toggleCategoryStrip}
                      onToggleMute={() => setIsGlobalMuted((current) => !current)}
                    />
                  </div>
                ))
              ) : (
                <div className='mt-6 rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500'>
                  No videos found in this category yet.
                </div>
              )}
            </div>
          </div>

          {filteredVideos.length > 1 ? (
            <div className='pointer-events-none absolute right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-4 md:right-5'>
              <button
                type='button'
                onClick={goToPreviousVideo}
                disabled={activeVideoIndex <= 0}
                className='pointer-events-auto inline-flex h-8 w-8 items-center justify-center text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] transition hover:scale-105 disabled:opacity-35 disabled:hover:scale-100'
                aria-label='Previous video'
              >
                <ChevronUp size={26} strokeWidth={2.5} />
              </button>
              <button
                type='button'
                onClick={goToNextVideo}
                disabled={activeVideoIndex < 0 || activeVideoIndex >= filteredVideos.length - 1}
                className='pointer-events-auto inline-flex h-8 w-8 items-center justify-center text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] transition hover:scale-105 disabled:opacity-35 disabled:hover:scale-100'
                aria-label='Next video'
              >
                <ChevronDown size={26} strokeWidth={2.5} />
              </button>
            </div>
          ) : null}
        </main>
      </div>
    </section>
  )
}
