'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef, useState, useEffect, useCallback } from 'react'
import { Share2, Minus, Plus, Heart } from 'lucide-react'
import RelatedProductsSection from '@/components/product/RelatedProductsSection'
import RecentlyViewedSection from '@/components/product/RecentlyViewedSection'

export default function BiadProductLayout({
  product,
  activeImage,
  setCurrentImage,
  activePrice,
  activeOriginalPrice,
  selectedColor,
  setSelectedColor,
  selectedSize,
  setSelectedSize,
  selectedAttributes,
  setSelectedAttributes,
  colorOptions,
  sizeOptions,
  attributeOptions,
  extraAttributeOptions,
  selectableExtraAttributeOptions,
  getOptionLabel,
  isOptionAvailable,
  displayQuantity,
  handleQuantitySelectChange,
  quantitySelectorMax,
  handleAddToCart,
  isAddToCartLoading,
  isSelectionComplete,
  shakeKeys,
  showSelectionErrors,
  getSelectionErrorMessage,
  isWishlisted,
  handleWishlistClick,
  formatMoney,
  vendorHeaderProfile,
  TemplateVendorHeader,
  handleFollowVendor,
  vendorFollowState,
  addToCartRef,
  isMobile,
  cartQuantity,
  isAddedToCart,
  stockLabel,
  stockTextClass,
  discountPercentage,
  selectionMap,
  relatedProducts = [],
  isRelatedLoading = false,
  categorySlug = '',
}) {
  const vendorName = String(product.vendor || vendorHeaderProfile?.name || '').trim()
  const vendorSlug = product.vendorSlug || vendorHeaderProfile?.slug || ''

  // BiadProductLayout only shows images — skip video URLs that can't render in <Image>.
  const isVideoSrc = (src) => Boolean(src) && /\.(mp4|webm|ogg|mov|avi)(\?|#|$)/i.test(src)
  const galleryImages = Array.isArray(product.gallery)
    ? product.gallery.map((img) => (typeof img === 'string' ? img : img?.src || img?.url || '')).filter(Boolean)
    : []
  const firstGalleryImage = galleryImages[0] || ''
  const displaySrc = (!activeImage || isVideoSrc(activeImage)) ? firstGalleryImage : activeImage
  const currentIndex = galleryImages.indexOf(displaySrc)

  const touchStartXRef = useRef(0)
  const touchStartYRef = useRef(0)
  // Prevents the synthesized click event that fires after a swipe from opening the lightbox
  const didSwipeRef = useRef(false)

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX
    touchStartYRef.current = e.touches[0].clientY
    didSwipeRef.current = false
  }

  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartXRef.current
    const dy = e.changedTouches[0].clientY - touchStartYRef.current
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return
    if (galleryImages.length < 2) return
    didSwipeRef.current = true
    const nextIndex = dx < 0
      ? (currentIndex + 1) % galleryImages.length
      : (currentIndex - 1 + galleryImages.length) % galleryImages.length
    setCurrentImage(galleryImages[nextIndex])
  }

  // ── Lightbox ──────────────────────────────────────────────────────────
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const lbTouchStartXRef = useRef(0)
  const lbTouchStartYRef = useRef(0)

  const openLightbox = () => {
    if (didSwipeRef.current) { didSwipeRef.current = false; return }
    if (!galleryImages.length) return
    setLightboxIndex(Math.max(0, currentIndex))
    setLightboxOpen(true)
  }

  const closeLightbox = useCallback(() => setLightboxOpen(false), [])

  const lbPrev = useCallback(() =>
    setLightboxIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length),
  [galleryImages.length])

  const lbNext = useCallback(() =>
    setLightboxIndex((i) => (i + 1) % galleryImages.length),
  [galleryImages.length])

  // Keep lightbox index in sync when thumbnail changes the main image
  useEffect(() => {
    if (lightboxOpen && currentIndex >= 0) setLightboxIndex(currentIndex)
  }, [currentIndex, lightboxOpen])

  // Keyboard navigation + lock body scroll
  useEffect(() => {
    if (!lightboxOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') lbPrev()
      if (e.key === 'ArrowRight') lbNext()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [lightboxOpen, closeLightbox, lbPrev, lbNext])

  const handleLbTouchStart = (e) => {
    lbTouchStartXRef.current = e.touches[0].clientX
    lbTouchStartYRef.current = e.touches[0].clientY
  }

  const handleLbTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - lbTouchStartXRef.current
    const dy = e.changedTouches[0].clientY - lbTouchStartYRef.current
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return
    dx < 0 ? lbNext() : lbPrev()
  }

  const priceStr = formatMoney(activePrice)
  const origPriceStr = activeOriginalPrice && activeOriginalPrice > activePrice
    ? formatMoney(activeOriginalPrice)
    : null

  const handleShareClick = () => {
    if (typeof window === 'undefined') return
    const url = `${window.location.origin}/product/${product.slug}`
    if (navigator?.share) {
      navigator.share({ title: product.name, url }).catch(() => {})
    } else if (navigator?.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {})
    }
  }

  const allSelectionKeys = attributeOptions.map((a) => a.key)
  const isShaking = shakeKeys.includes('__all__')

  return (
    <div className='min-h-screen bg-[#0a0a0a] flex flex-col'>
      {/* Vendor header */}
      {vendorHeaderProfile && (
        <TemplateVendorHeader
          vendorProfile={vendorHeaderProfile}
          onFollow={handleFollowVendor}
          onMessage={() => {}}
          isFollowing={vendorFollowState.isFollowing}
          isFollowLoading={vendorFollowState.isSaving}
          canFollow={vendorFollowState.canFollow}
          canEditStorefront={vendorFollowState.canEditStorefront}
          categoryTree={[]}
          collectionsMenuMode='grouped'
          activeCategorySlug=''
          searchValue=''
          setSearchValue={() => {}}
        />
      )}

      {/* Spacer below fixed header */}
      {vendorHeaderProfile && <div className='h-14 xl:h-16' />}

      {/* Main content: stacked on mobile, 50/50 on desktop */}
      <div className='flex flex-col md:flex-row flex-1'>

        {/* ── Left: image panel ── */}
        {/* aspect-square on mobile gives a reliable computed height (= width).
            Arbitrary h-[420px] may not be compiled by Tailwind JIT if it's a new class.
            On desktop: aspect-auto + h-screen gives full-viewport height. */}
        <div
          className='w-full md:w-1/2 bg-[#f0f0f0] relative aspect-square md:aspect-auto md:h-screen md:sticky md:top-0 cursor-zoom-in select-none'
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={openLightbox}
        >
          {displaySrc ? (
            <Image
              src={displaySrc}
              alt={product.name || 'Product'}
              fill
              className='object-contain pointer-events-none'
              sizes='(max-width:768px) 100vw, 50vw'
              priority
            />
          ) : (
            <div className='absolute inset-0 bg-[#e5e5e5]' />
          )}

          {/* Prev / Next arrows on main panel — transparent, long-line chevrons */}
          {galleryImages.length > 1 && (
            <>
              <button
                type='button'
                onClick={(e) => { e.stopPropagation(); const i = (currentIndex - 1 + galleryImages.length) % galleryImages.length; setCurrentImage(galleryImages[i]) }}
                className='absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-16 w-10 items-center justify-center text-black/50 transition hover:text-black'
                aria-label='Previous image'
              >
                <svg viewBox='0 0 24 24' className='h-7 w-7' fill='none' stroke='currentColor' strokeWidth='1.2'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M15 4l-8 8 8 8' />
                </svg>
              </button>
              <button
                type='button'
                onClick={(e) => { e.stopPropagation(); const i = (currentIndex + 1) % galleryImages.length; setCurrentImage(galleryImages[i]) }}
                className='absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-16 w-10 items-center justify-center text-black/50 transition hover:text-black'
                aria-label='Next image'
              >
                <svg viewBox='0 0 24 24' className='h-7 w-7' fill='none' stroke='currentColor' strokeWidth='1.2'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M9 4l8 8-8 8' />
                </svg>
              </button>
            </>
          )}

          {/* Thumbnail strip */}
          {galleryImages.length > 1 && (
            <div
              className='absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-2 px-4'
              onClick={(e) => e.stopPropagation()}
            >
              {galleryImages.slice(0, 6).map((src, i) => (
                <button
                  key={i}
                  type='button'
                  onClick={() => setCurrentImage(src)}
                  className={`w-12 h-12 border-2 transition ${
                    displaySrc === src ? 'border-black' : 'border-transparent opacity-60 hover:opacity-100'
                  } bg-[#e5e5e5] overflow-hidden flex-shrink-0`}
                >
                  <Image src={src} alt='' width={48} height={48} className='object-cover w-full h-full' />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: product details ── */}
        <div className='w-full md:w-1/2 bg-[#0a0a0a] flex flex-col'>
          <div className='flex-1 px-6 py-8 md:px-10 md:py-12 lg:px-14 lg:py-16 space-y-6 md:max-h-screen md:overflow-y-auto'>

            {/* Vendor / brand label */}
            {vendorSlug ? (
              <Link
                href={`/vendors/${vendorSlug}`}
                className='block text-[10px] font-black uppercase tracking-[0.25em] text-white/40 hover:text-white/70 transition'
              >
                {vendorName}
              </Link>
            ) : vendorName ? (
              <p className='text-[10px] font-black uppercase tracking-[0.25em] text-white/40'>
                {vendorName}
              </p>
            ) : null}

            {/* Product title */}
            <h1 className='text-[22px] font-black uppercase tracking-wide leading-tight text-white sm:text-[26px] lg:text-[30px]'>
              {product.name}
            </h1>

            {/* Price */}
            <div className='flex items-baseline gap-3'>
              <span className='text-[22px] font-black text-white sm:text-[26px]'>{priceStr}</span>
              {origPriceStr && (
                <span className='text-sm font-medium line-through text-white/30'>{origPriceStr}</span>
              )}
              {discountPercentage && (
                <span className='text-xs font-black uppercase tracking-widest text-white bg-white/10 px-2 py-0.5'>
                  -{discountPercentage}%
                </span>
              )}
            </div>

            {/* Stock */}
            <p className={`text-xs font-bold uppercase tracking-widest ${stockTextClass}`}>{stockLabel}</p>

            {/* Divider */}
            <div className='border-t border-white/10' />

            {/* Color selector */}
            {colorOptions.length > 1 && (
              <div className={`space-y-3 ${isShaking && !selectedColor ? 'animate-shake' : ''}`}>
                <p className='text-[10px] font-black uppercase tracking-[0.2em] text-white/50'>
                  Color{selectedColor ? <span className='ml-2 text-white/80'>{getOptionLabel('color', selectedColor)}</span> : ''}
                </p>
                <div className='flex flex-wrap gap-2'>
                  {colorOptions.map((color) => {
                    const label = getOptionLabel('color', String(color))
                    const available = isOptionAvailable('color', String(color))
                    const selected = selectedColor === String(color)
                    return (
                      <button
                        key={color}
                        type='button'
                        disabled={!available}
                        onClick={() => setSelectedColor(String(color))}
                        className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border transition ${
                          selected
                            ? 'border-white bg-white text-black'
                            : available
                              ? 'border-white/20 bg-transparent text-white/70 hover:border-white/60 hover:text-white'
                              : 'border-white/10 text-white/20 cursor-not-allowed line-through'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                {showSelectionErrors && !selectedColor && (
                  <p className='text-xs text-red-400 font-bold uppercase tracking-wide'>{getSelectionErrorMessage('color')}</p>
                )}
              </div>
            )}

            {/* Size selector */}
            {sizeOptions.length > 0 && (
              <div className={`space-y-3 ${isShaking && !selectedSize && sizeOptions.length > 1 ? 'animate-shake' : ''}`}>
                <p className='text-[10px] font-black uppercase tracking-[0.2em] text-white/50'>
                  Size{selectedSize ? <span className='ml-2 text-white/80'>{getOptionLabel('size', selectedSize)}</span> : ''}
                </p>
                <div className='flex flex-wrap gap-2'>
                  {sizeOptions.map((size) => {
                    const label = getOptionLabel('size', String(size))
                    const available = isOptionAvailable('size', String(size))
                    const selected = selectedSize === String(size)
                    return (
                      <button
                        key={size}
                        type='button'
                        disabled={!available}
                        onClick={() => setSelectedSize(String(size))}
                        className={`px-3 py-2 min-w-[48px] text-xs font-bold uppercase tracking-wider border transition ${
                          selected
                            ? 'border-white bg-white text-black'
                            : available
                              ? 'border-white/20 bg-transparent text-white/70 hover:border-white/60 hover:text-white'
                              : 'border-white/10 text-white/20 cursor-not-allowed line-through'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                {showSelectionErrors && !selectedSize && sizeOptions.length > 1 && (
                  <p className='text-xs text-red-400 font-bold uppercase tracking-wide'>{getSelectionErrorMessage('size')}</p>
                )}
              </div>
            )}

            {/* Extra attributes */}
            {selectableExtraAttributeOptions.map((attr) => {
              const selectedVal = selectionMap[attr.key] || ''
              return (
                <div key={attr.key} className={`space-y-3 ${isShaking && !selectedVal ? 'animate-shake' : ''}`}>
                  <p className='text-[10px] font-black uppercase tracking-[0.2em] text-white/50'>
                    {attr.label}{selectedVal ? <span className='ml-2 text-white/80'>{getOptionLabel(attr.key, selectedVal)}</span> : ''}
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    {attr.options.map((opt) => {
                      const label = getOptionLabel(attr.key, String(opt))
                      const available = isOptionAvailable(attr.key, String(opt))
                      const selected = selectedVal === String(opt)
                      return (
                        <button
                          key={opt}
                          type='button'
                          disabled={!available}
                          onClick={() => setSelectedAttributes((prev) => ({ ...prev, [attr.key]: String(opt) }))}
                          className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border transition ${
                            selected
                              ? 'border-white bg-white text-black'
                              : available
                                ? 'border-white/20 bg-transparent text-white/70 hover:border-white/60 hover:text-white'
                                : 'border-white/10 text-white/20 cursor-not-allowed line-through'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  {showSelectionErrors && !selectedVal && (
                    <p className='text-xs text-red-400 font-bold uppercase tracking-wide'>{getSelectionErrorMessage(attr.key)}</p>
                  )}
                </div>
              )
            })}

            {/* QTY selector */}
            <div className='space-y-2'>
              <p className='text-[10px] font-black uppercase tracking-[0.2em] text-white/50'>Qty</p>
              <div className='flex items-center gap-0'>
                <button
                  type='button'
                  onClick={() => handleQuantitySelectChange(Math.max(1, displayQuantity - 1))}
                  className='w-10 h-10 border border-white/20 bg-transparent text-white flex items-center justify-center hover:border-white/60 transition'
                >
                  <Minus size={14} strokeWidth={2.5} />
                </button>
                <div className='w-12 h-10 border-t border-b border-white/20 flex items-center justify-center text-sm font-bold text-white'>
                  {displayQuantity}
                </div>
                <button
                  type='button'
                  onClick={() => handleQuantitySelectChange(Math.min(quantitySelectorMax, displayQuantity + 1))}
                  className='w-10 h-10 border border-white/20 bg-transparent text-white flex items-center justify-center hover:border-white/60 transition'
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className='border-t border-white/10' />

            {/* CTA buttons */}
            <div ref={addToCartRef} className='space-y-3'>
              <button
                type='button'
                onClick={() => handleAddToCart(displayQuantity)}
                disabled={isAddToCartLoading}
                className='w-full h-12 bg-white text-black text-xs font-black uppercase tracking-[0.2em] hover:bg-white/90 transition disabled:opacity-60'
              >
                {isAddToCartLoading
                  ? 'Adding...'
                  : isAddedToCart
                    ? `Added to Cart (${cartQuantity})`
                    : 'Add to Cart'}
              </button>

              <button
                type='button'
                className='w-full h-12 border border-white/20 bg-transparent text-white text-xs font-black uppercase tracking-[0.2em] hover:border-white/60 hover:bg-white/5 transition'
              >
                Buy it Now
              </button>
            </div>

            {/* Wishlist + Share row */}
            <div className='flex items-center gap-4'>
              <button
                type='button'
                onClick={handleWishlistClick}
                className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition'
              >
                <Heart
                  size={14}
                  strokeWidth={2}
                  className={isWishlisted ? 'fill-white text-white' : ''}
                />
                {isWishlisted ? 'Saved' : 'Save'}
              </button>
              <button
                type='button'
                onClick={handleShareClick}
                className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition'
              >
                <Share2 size={14} strokeWidth={2} />
                Share
              </button>
            </div>

            {/* Short description */}
            {product.shortDescription && (
              <div className='border-t border-white/10 pt-4'>
                <p className='text-sm text-white/50 leading-relaxed'>{product.shortDescription}</p>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Inspired Choices / Recently Viewed ───────────────────────────── */}
      <div className='bg-[#0a0a0a] px-4 pb-12 pt-8 sm:px-6 md:px-8 overflow-x-hidden'>
        {!isRelatedLoading && (
          <RelatedProductsSection
            items={relatedProducts}
            seeAllHref={categorySlug ? `/products/${categorySlug}` : undefined}
            theme='dark'
          />
        )}
        <RecentlyViewedSection currentSlug={product.slug} theme='dark' />
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      {lightboxOpen && galleryImages.length > 0 && (
        <div
          className='fixed inset-0 flex items-center justify-center bg-black'
          style={{ zIndex: 2147483640 }}
          onTouchStart={handleLbTouchStart}
          onTouchEnd={handleLbTouchEnd}
          onClick={closeLightbox}
        >
          {/* Image — stop propagation so clicking image doesn't close */}
          <div
            className='relative w-full h-full'
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              key={lightboxIndex}
              src={galleryImages[lightboxIndex]}
              alt={product.name || 'Product'}
              fill
              className='object-contain'
              sizes='100vw'
              priority
            />
          </div>

          {/* Close */}
          <button
            type='button'
            onClick={closeLightbox}
            className='absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20'
            aria-label='Close'
          >
            <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>

          {/* Prev arrow */}
          {galleryImages.length > 1 && (
            <button
              type='button'
              onClick={(e) => { e.stopPropagation(); lbPrev() }}
              className='absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20'
              aria-label='Previous'
            >
              <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M15 19l-7-7 7-7' />
              </svg>
            </button>
          )}

          {/* Next arrow */}
          {galleryImages.length > 1 && (
            <button
              type='button'
              onClick={(e) => { e.stopPropagation(); lbNext() }}
              className='absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20'
              aria-label='Next'
            >
              <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' />
              </svg>
            </button>
          )}

          {/* Dot indicators */}
          {galleryImages.length > 1 && (
            <div className='absolute bottom-6 left-0 right-0 flex justify-center gap-1.5 pointer-events-none'>
              {galleryImages.map((_, i) => (
                <span
                  key={i}
                  className={`block rounded-full transition-all duration-200 ${
                    i === lightboxIndex ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Counter */}
          <div className='absolute top-4 left-1/2 -translate-x-1/2 z-10 text-xs font-bold tracking-widest text-white/50'>
            {lightboxIndex + 1} / {galleryImages.length}
          </div>
        </div>
      )}
    </div>
  )
}
