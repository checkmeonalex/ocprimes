'use client'

import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import SectionHeading from './SectionHeading'
import useHorizontalScroll from '@/components/shared/useHorizontalScroll.mjs'

const formatPrice = (value) => {
  if (!Number.isFinite(value)) return '--'
  return value.toFixed(2)
}

const HotspotCard = ({ product }) => {
  if (!product) return null
  const basePrice = Number(product.price) || 0
  const discountPrice = Number(product.discount_price) || 0
  const hasDiscount = discountPrice > 0 && discountPrice < basePrice
  const displayPrice = hasDiscount ? discountPrice : basePrice
  const originalPrice = hasDiscount ? basePrice : null

  return (
    <div className="w-56 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
      <Link href={`/product/${product.slug}`} className="flex items-start gap-3">
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
              No image
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-gray-900 line-clamp-2">{product.name}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-gray-900">
              ${formatPrice(displayPrice)}
            </span>
            {originalPrice ? (
              <span className="text-[11px] text-gray-400 line-through">
                ${formatPrice(originalPrice)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
      <Link
        href={`/product/${product.slug}`}
        className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-black px-3 py-2 text-xs font-semibold text-white transition hover:bg-gray-900"
      >
        Shop now
      </Link>
    </div>
  )
}

const HotspotSlide = ({
  layout,
  onPreviewShow,
  onPreviewHide,
  onPreviewToggle,
  activeHotspotId,
}) => {
  const hotspots = Array.isArray(layout?.hotspots) ? layout.hotspots : []

  if (!layout?.image_url || !hotspots.length) return null

  return (
    <div className="relative w-full aspect-square">
      <div className="absolute inset-0 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <img
          src={layout.image_url}
          alt={layout.image_alt || 'Hotspot'}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="absolute inset-0">
        {hotspots.map((hotspot) => {
          const priceValue =
            Number(hotspot.product?.discount_price) > 0 &&
            Number(hotspot.product?.discount_price) < Number(hotspot.product?.price)
              ? Number(hotspot.product?.discount_price)
              : Number(hotspot.product?.price)
          const placeBelow = Number(hotspot.y) < 14
          const alignClass =
            hotspot.x > 80
              ? 'right-0 translate-x-0'
              : hotspot.x < 20
                ? 'left-0 translate-x-0'
                : 'left-1/2 -translate-x-1/2'
          const verticalClass = placeBelow ? 'top-8' : '-top-6'
          return (
            <div
              key={hotspot.id}
              className="absolute"
              style={{
                left: `${hotspot.x}%`,
                top: `${hotspot.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onMouseEnter={(event) => onPreviewShow(hotspot, event.currentTarget)}
              onMouseLeave={() => onPreviewHide()}
            >
              {hotspot.product ? (
                <div
                  className={`absolute ${verticalClass} ${alignClass} rounded-full border border-white/70 bg-white/65 px-2 py-0.5 text-[10px] font-semibold text-gray-800 shadow-sm backdrop-blur-md pointer-events-none`}
                >
                  ${formatPrice(priceValue)}
                </div>
              ) : null}
            <button
              type="button"
              aria-label="View product"
              onClick={(event) => {
                event.stopPropagation()
                onPreviewToggle(hotspot, event.currentTarget)
              }}
              className={`hotspot-pulse flex h-6 w-6 items-center justify-center rounded-full border shadow-md transition hover:scale-105 ${
                activeHotspotId === hotspot.id
                  ? 'border-white/80 bg-white/60 text-gray-900'
                  : 'border-white/70 bg-white/35 text-white'
              } backdrop-blur-md`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          </div>
          )
        })}
      </div>
    </div>
  )
}

const HotspotProductSlider = ({
  layouts = [],
  titleMain,
  className = '',
}) => {
  const [preview, setPreview] = useState(null)
  const previewRef = useRef(null)
  const hideTimerRef = useRef(null)
  const previewHoverRef = useRef(false)
  const { scrollRef, canScrollLeft, canScrollRight, scrollByAmount } =
    useHorizontalScroll({ step: 360 })

  const items = Array.isArray(layouts)
    ? layouts.filter(
        (layout) => layout?.image_url && Array.isArray(layout?.hotspots) && layout.hotspots.length,
      )
    : []
  if (!items.length) return null

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }

  const setPreviewSafe = (next) => {
    previewRef.current = next
    setPreview(next)
  }

  const computePortalPosition = (rect) => {
    const cardWidth = 224
    const margin = 12
    const centerX = rect.left + rect.width / 2
    const minLeft = margin + cardWidth / 2
    const maxLeft = window.innerWidth - margin - cardWidth / 2
    const left = Math.min(Math.max(centerX, minLeft), maxLeft)
    const top = rect.top
    return { left, top }
  }

  const showPreview = (hotspot, target, pinned = false) => {
    if (!hotspot?.product || !target) return
    clearHideTimer()
    const rect = target.getBoundingClientRect()
    const { left, top } = computePortalPosition(rect)
    setPreviewSafe({
      hotspotId: hotspot.id,
      product: hotspot.product,
      left,
      top,
      pinned,
    })
  }

  const scheduleHide = () => {
    clearHideTimer()
    hideTimerRef.current = setTimeout(() => {
      if (previewHoverRef.current) return
      if (previewRef.current?.pinned) return
      setPreviewSafe(null)
    }, 120)
  }

  const handlePreviewShow = (hotspot, target) => {
    if (previewRef.current?.pinned) return
    showPreview(hotspot, target, false)
  }

  const handlePreviewToggle = (hotspot, target) => {
    if (previewRef.current?.hotspotId === hotspot.id && previewRef.current?.pinned) {
      setPreviewSafe(null)
      return
    }
    showPreview(hotspot, target, true)
  }

  const handlePreviewHide = () => {
    scheduleHide()
  }

  const portal = useMemo(() => {
    if (!preview?.product || typeof document === 'undefined') return null
    return createPortal(
      <div
        className="fixed z-[70]"
        style={{
          left: `${preview.left}px`,
          top: `${preview.top}px`,
          transform: 'translate(-50%, calc(-100% - 12px))',
        }}
        onMouseEnter={() => {
          previewHoverRef.current = true
          clearHideTimer()
        }}
        onMouseLeave={() => {
          previewHoverRef.current = false
          scheduleHide()
        }}
      >
        <HotspotCard product={preview.product} />
      </div>,
      document.body,
    )
  }, [preview])

  return (
    <section className={`mb-10 w-full max-w-full overflow-hidden px-3 md:px-4 ${className}`}>
      <SectionHeading title={titleMain} />
      <div className="relative">
        <div
          ref={scrollRef}
          className="featured-scroll flex min-w-0 w-full max-w-full gap-4 overflow-x-auto pb-6 pr-1"
        >
          {items.map((layout) => (
            <div
              key={layout.id}
              className="flex-none w-[88%] max-w-[380px] sm:w-[70%] md:w-[360px] lg:w-[380px]"
            >
              <HotspotSlide
                layout={layout}
                onPreviewShow={handlePreviewShow}
                onPreviewHide={handlePreviewHide}
                onPreviewToggle={handlePreviewToggle}
                activeHotspotId={preview?.hotspotId || ''}
              />
            </div>
          ))}
        </div>
        {canScrollLeft ? (
          <button
            type="button"
            onClick={() => scrollByAmount(-1)}
            className="absolute left-2 top-1/2 z-10 hidden h-14 w-9 -translate-y-1/2 items-center justify-center rounded-2xl border border-gray-200/70 bg-white text-gray-700 shadow-md hover:bg-white lg:flex"
            aria-label="Scroll hotspot left"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1024 1024"
              className="h-7 w-7"
              fill="none"
            >
              <path
                d="M664 200 L344 512 L664 824"
                stroke="currentColor"
                strokeWidth="44"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
        {canScrollRight ? (
          <button
            type="button"
            onClick={() => scrollByAmount(1)}
            className="absolute right-2 top-1/2 z-10 hidden h-14 w-9 -translate-y-1/2 items-center justify-center rounded-2xl border border-gray-200/70 bg-white text-gray-700 shadow-md hover:bg-white lg:flex"
            aria-label="Scroll hotspot right"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1024 1024"
              className="h-7 w-7"
              fill="none"
            >
              <path
                d="M360 200 L680 512 L360 824"
                stroke="currentColor"
                strokeWidth="44"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
      </div>
      {portal}
    </section>
  )
}

export default HotspotProductSlider
