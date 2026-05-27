'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Share2, Minus, Plus, Heart } from 'lucide-react'

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
}) {
  const vendorName = String(product.vendor || vendorHeaderProfile?.name || '').trim()
  const vendorSlug = product.vendorSlug || vendorHeaderProfile?.slug || ''

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
        <div className='w-full md:w-1/2 bg-[#f0f0f0] relative flex items-center justify-center min-h-[420px] md:min-h-screen md:sticky md:top-0'>
          {activeImage ? (
            <div className='relative w-full h-full min-h-[420px] md:min-h-screen'>
              <Image
                src={activeImage}
                alt={product.name || 'Product'}
                fill
                className='object-contain'
                sizes='(max-width:768px) 100vw, 50vw'
                priority
              />
            </div>
          ) : (
            <div className='w-full h-[420px] md:h-screen bg-[#e5e5e5]' />
          )}

          {/* Thumbnail strip — visible if gallery has multiple images */}
          {Array.isArray(product.gallery) && product.gallery.length > 1 && (
            <div className='absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4'>
              {product.gallery.slice(0, 6).map((img, i) => {
                const src = typeof img === 'string' ? img : img?.src || img?.url || ''
                if (!src) return null
                return (
                  <button
                    key={i}
                    type='button'
                    onClick={() => setCurrentImage(src)}
                    className={`w-12 h-12 border-2 transition ${
                      activeImage === src ? 'border-black' : 'border-transparent opacity-60 hover:opacity-100'
                    } bg-[#e5e5e5] overflow-hidden flex-shrink-0`}
                  >
                    <Image src={src} alt='' width={48} height={48} className='object-cover w-full h-full' />
                  </button>
                )
              })}
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
    </div>
  )
}
