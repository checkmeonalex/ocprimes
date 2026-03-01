'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { extractVariationValue } from './variationUtils.mjs'

const normalizeKey = (value) => String(value || '').toLowerCase().replace(/^pa_/, '')

const resolveVariationPricing = (variation, fallbackPrice, fallbackOriginalPrice) => {
  const basePrice = Number(fallbackPrice ?? 0)
  const baseOriginal = Number(fallbackOriginalPrice ?? 0)
  const hasOwnPricing =
    variation &&
    (variation?.regular_price !== undefined || variation?.sale_price !== undefined || variation?.price !== undefined)
  if (!hasOwnPricing) {
    return {
      price: basePrice,
      originalPrice: baseOriginal > basePrice ? baseOriginal : null,
    }
  }
  const regular = Number(variation?.regular_price ?? variation?.price ?? baseOriginal ?? basePrice ?? 0)
  const sale = Number(variation?.sale_price ?? 0)
  const hasDiscount = sale > 0 && sale < regular
  return {
    price: hasDiscount ? sale : regular || basePrice || 0,
    originalPrice: hasDiscount ? regular : baseOriginal > (regular || basePrice) ? baseOriginal : null,
  }
}

const buildVariationLabel = (attrs = {}) =>
  Object.entries(attrs)
    .map(([key, value]) => {
      if (!value) return ''
      return `${String(key).replace(/[_-]+/g, ' ')}: ${String(value)}`
    })
    .filter(Boolean)
    .join(' / ')

const formatCurrency = (value) => {
  const amount = Number(value || 0)
  return `$${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`
}

const extractMediaUrl = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'object') {
    const candidate = value.url || value.image_url || value.src || ''
    return String(candidate || '').trim()
  }
  return ''
}

const isValidMediaUrl = (value) => {
  const url = String(value || '').trim()
  if (!url || url === '[object Object]') return false
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) return true
  return false
}

const toMediaKey = (value) => {
  const raw = extractMediaUrl(value)
  if (!raw) return ''
  const fallback = raw.split('#')[0].split('?')[0].replace(/\/+$/, '').trim()
  try {
    const parsed = new URL(raw)
    const host = parsed.host.toLowerCase()
    const pathname = parsed.pathname.replace(/\/+$/, '')
    return `${host}${pathname}`
  } catch {
    return fallback.toLowerCase()
  }
}

const getVariationVideoUrl = (variation) => {
  const direct = [
    variation?.video,
    variation?.video_url,
    variation?.product_video_url,
    variation?.media?.find?.((item) => item?.type === 'video')?.url,
  ]
  return extractMediaUrl(direct.find(Boolean))
}

const ProductVariantQuickAddModal = ({
  open,
  product,
  initialColor = '',
  initialSize = '',
  onClose,
  onConfirm,
}) => {
  const [mounted, setMounted] = useState(false)
  const [selected, setSelected] = useState({})
  const [activePreviewImage, setActivePreviewImage] = useState('')
  const [activePreviewMedia, setActivePreviewMedia] = useState(null)
  const [isActiveVideoPlaying, setIsActiveVideoPlaying] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [thumbStart, setThumbStart] = useState(0)
  const [shakeOptions, setShakeOptions] = useState(false)
  const [isScrollActive, setIsScrollActive] = useState(false)
  const [isBootLoading, setIsBootLoading] = useState(true)
  const [isMainMediaLoading, setIsMainMediaLoading] = useState(true)
  const scrollFadeTimerRef = useRef(null)

  useEffect(() => setMounted(true), [])

  const normalizedVariations = useMemo(() => {
    const list = Array.isArray(product?.variations) ? product.variations : []
    return list.map((variation) => {
      const attrs = {}
      const source = variation?.attributes || {}
      Object.entries(source).forEach(([rawKey, rawValue]) => {
        if (!rawKey || rawValue === undefined || rawValue === null) return
        const key = normalizeKey(rawKey)
        attrs[key] = String(rawValue)
      })
      const color = extractVariationValue(variation?.attributes, ['color', 'colour'])
      const size = extractVariationValue(variation?.attributes, ['size'])
      if (color) attrs.color = color
      if (size) attrs.size = size
      return { variation, attrs }
    })
  }, [product?.variations])

  const attributeOptions = useMemo(() => {
    const map = new Map()
    normalizedVariations.forEach(({ attrs }) => {
      Object.entries(attrs).forEach(([key, value]) => {
        if (!key || !value) return
        const list = map.get(key) || new Set()
        list.add(String(value))
        map.set(key, list)
      })
    })
    return Array.from(map.entries()).map(([key, set]) => ({
      key,
      label: key.replace(/[_-]+/g, ' '),
      options: Array.from(set),
    }))
  }, [normalizedVariations])

  useEffect(() => {
    if (!open) return
    setSelected({})
  }, [open, attributeOptions, initialColor, initialSize])

  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  const matching = useMemo(() => {
    if (!attributeOptions.length) return normalizedVariations[0] || null
    const hasAllSelections = attributeOptions.every((section) => String(selected?.[section.key] || '').trim())
    if (!hasAllSelections) return null
    return normalizedVariations.find(({ attrs }) =>
      attributeOptions.every((section) => String(attrs[section.key] || '') === String(selected[section.key] || '')),
    ) || null
  }, [attributeOptions, normalizedVariations, selected])

  const preferredImage = String(
    extractMediaUrl(matching?.variation?.image) ||
      extractMediaUrl(product?.image) ||
      extractMediaUrl(product?.gallery?.[0]) ||
      '',
  ).trim()
  const previewImage = String(activePreviewImage || preferredImage).trim()
  const pricing = resolveVariationPricing(matching?.variation, product?.price, product?.originalPrice)
  const canConfirm = Boolean(matching)
  const reviewsCount = Math.max(0, Number(product?.reviews) || 0)
  const stockCount = Math.max(0, Number(product?.stock) || 0)
  const stockLabel =
    stockCount <= 0 ? 'Out of stock' : stockCount < 5 ? `${stockCount} remaining` : `${stockCount} in stock`
  const tags = useMemo(() => {
    const source = Array.isArray(product?.tags) ? product.tags : []
    return source
      .map((entry) => (typeof entry === 'string' ? entry : entry?.name || entry?.slug || ''))
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .slice(0, 6)
  }, [product?.tags])
  const galleryImages = useMemo(() => {
    const fromGallery = Array.isArray(product?.gallery) ? product.gallery : []
    const fromVariations = normalizedVariations
      .map(({ variation }) => extractMediaUrl(variation?.image))
      .filter(isValidMediaUrl)
    const all = [preferredImage, ...fromGallery, ...fromVariations]
      .map(extractMediaUrl)
      .filter(isValidMediaUrl)
    const deduped = []
    const seen = new Set()
    all.forEach((url) => {
      const key = toMediaKey(url)
      if (!key || seen.has(key)) return
      seen.add(key)
      deduped.push(url)
    })
    return deduped
  }, [normalizedVariations, preferredImage, product?.gallery])
  const mediaItems = useMemo(() => {
    const explicitMedia = Array.isArray(product?.galleryMedia) ? product.galleryMedia : []
    const fromExplicit = explicitMedia
      .map((item) => ({
        type: item?.type === 'video' ? 'video' : 'image',
        url: extractMediaUrl(item?.url),
        poster: extractMediaUrl(item?.poster),
      }))
      .filter((item) => isValidMediaUrl(item.url))
    const fallbackVideo = extractMediaUrl(product?.video)
    const fallbackImages = galleryImages.map((url) => ({ type: 'image', url, poster: '' }))
    const merged = [...fromExplicit]
    if (fallbackVideo && !merged.some((item) => item.type === 'video' && item.url === fallbackVideo)) {
      merged.unshift({
        type: 'video',
        url: fallbackVideo,
        poster: preferredImage,
      })
    }
    fallbackImages.forEach((item) => {
      if (!merged.some((existing) => existing.type === 'image' && existing.url === item.url)) {
        merged.push(item)
      }
    })
    const deduped = []
    const seen = new Set()
    merged.forEach((item) => {
      const key = `${item.type}:${toMediaKey(item.url)}`
      if (!key || seen.has(key)) return
      seen.add(key)
      deduped.push(item)
    })
    return deduped
  }, [galleryImages, preferredImage, product?.galleryMedia, product?.video])
  const variationVideoItems = useMemo(() => {
    const map = new Map()
    normalizedVariations.forEach(({ variation, attrs }) => {
      const videoUrl = getVariationVideoUrl(variation)
      if (!isValidMediaUrl(videoUrl) || map.has(videoUrl)) return
      const color = String(attrs.color || '').trim()
      map.set(videoUrl, {
        url: videoUrl,
        poster: String(variation?.image || preferredImage).trim(),
        label: color || `Video ${map.size + 1}`,
      })
    })
    return Array.from(map.values())
  }, [normalizedVariations, preferredImage])
  const imageLookup = useMemo(() => {
    const map = new Map()
    const list = Array.isArray(product?.images) ? product.images : []
    list.forEach((item) => {
      if (!item || typeof item === 'string') return
      const id = String(item?.id || '').trim()
      const url = String(item?.url || item?.image_url || '').trim()
      if (!id || !url) return
      map.set(id, url)
    })
    return map
  }, [product?.images])
  const colorVariationCards = useMemo(() => {
    const map = new Map()
    normalizedVariations.forEach(({ variation, attrs }) => {
      const color = String(attrs.color || '').trim()
      const image = String(
        extractMediaUrl(variation?.image) ||
        imageLookup.get(String(variation?.image_id || '').trim()) ||
        preferredImage,
      ).trim()
      if (!color || map.has(color)) return
      const cardPrice = resolveVariationPricing(
        variation,
        product?.price,
        product?.originalPrice,
      )
      map.set(color, {
        color,
        image,
        price: cardPrice.price,
      })
    })
    if (!map.size) {
      const fallbackColors = Array.isArray(product?.colors) ? product.colors : []
      fallbackColors.forEach((color, index) => {
        const image = String(galleryImages[index] || preferredImage).trim()
        const normalizedColor = String(color || '').trim()
        if (!normalizedColor || map.has(normalizedColor)) return
        map.set(normalizedColor, {
          color: normalizedColor,
          image,
          price: Number(pricing.price || product?.price || 0),
        })
      })
    }
    return Array.from(map.values())
  }, [
    galleryImages,
    imageLookup,
    normalizedVariations,
    preferredImage,
    pricing.price,
    product?.colors,
    product?.originalPrice,
    product?.price,
  ])
  const discountAmount = useMemo(() => {
    if (!pricing.originalPrice) return 0
    return Math.max(0, Number(pricing.originalPrice) - Number(pricing.price || 0))
  }, [pricing.originalPrice, pricing.price])
  const nonColorAttributes = useMemo(
    () => attributeOptions.filter((section) => section.key !== 'color'),
    [attributeOptions],
  )

  useEffect(() => {
    if (!open) return
    const firstMedia = mediaItems[0] || null
    setActivePreviewImage(preferredImage)
    setActivePreviewMedia(firstMedia)
    setIsActiveVideoPlaying(false)
    setQuantity(1)
    setThumbStart(0)
  }, [mediaItems, open, preferredImage])

  useEffect(() => {
    if (!open) return
    setIsMainMediaLoading(true)
  }, [activePreviewMedia?.url, isActiveVideoPlaying, open, previewImage])

  useEffect(
    () => () => {
      if (scrollFadeTimerRef.current) {
        window.clearTimeout(scrollFadeTimerRef.current)
      }
    },
    [],
  )

  useLayoutEffect(() => {
    if (!open) return
    setIsBootLoading(true)
  }, [open, product?.id])

  useEffect(() => {
    if (!open) {
      setIsBootLoading(true)
      return
    }
    const timer = window.setTimeout(() => setIsBootLoading(false), 280)
    return () => window.clearTimeout(timer)
  }, [open, product?.id])

  const activeMediaIndex = useMemo(
    () =>
      Math.max(
        0,
        mediaItems.findIndex((item) => String(item?.url || '') === String(activePreviewMedia?.url || '')),
      ),
    [mediaItems, activePreviewMedia?.url],
  )

  const mobileGalleryItems = useMemo(() => {
    if (!mediaItems.length) return []
    const current = mediaItems[activeMediaIndex] || mediaItems[0]
    const next = mediaItems[(activeMediaIndex + 1) % mediaItems.length]
    const list = [current, next].filter(Boolean)
    const seen = new Set()
    return list.filter((item) => {
      const key = `${item.type}:${toMediaKey(item.url)}`
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [activeMediaIndex, mediaItems])

  const applyOptionSelection = (key, value) => {
    setSelected((prev) => ({ ...prev, [key]: value }))
  }

  if (!open || !mounted) return null
  const maxThumbs = 7
  const visibleMediaItems = mediaItems.slice(thumbStart, thumbStart + maxThumbs)
  const canShiftLeft = thumbStart > 0
  const canShiftRight = thumbStart + maxThumbs < mediaItems.length
  const selectMediaAtIndex = (index) => {
    if (!mediaItems.length) return
    const normalizedIndex = ((index % mediaItems.length) + mediaItems.length) % mediaItems.length
    const target = mediaItems[normalizedIndex]
    if (!target) return
    setIsMainMediaLoading(true)
    setActivePreviewMedia(target)
    setIsActiveVideoPlaying(false)
    if (target.type === 'image') {
      setActivePreviewImage(target.url)
    } else if (target.poster) {
      setActivePreviewImage(target.poster)
    }
    if (normalizedIndex < thumbStart) {
      setThumbStart(normalizedIndex)
      return
    }
    if (normalizedIndex >= thumbStart + maxThumbs) {
      setThumbStart(Math.max(0, normalizedIndex - maxThumbs + 1))
    }
  }
  const goPrevMainMedia = () => selectMediaAtIndex(activeMediaIndex - 1)
  const goNextMainMedia = () => selectMediaAtIndex(activeMediaIndex + 1)
  const productDetailsHref = String(product?.slug || '').trim()
    ? `/product/${String(product.slug).trim()}`
    : ''
  const handlePanelScroll = () => {
    setIsScrollActive(true)
    if (scrollFadeTimerRef.current) {
      window.clearTimeout(scrollFadeTimerRef.current)
    }
    scrollFadeTimerRef.current = window.setTimeout(() => {
      setIsScrollActive(false)
    }, 650)
  }

  return createPortal(
    <div className='fixed inset-0 z-[10050] flex items-end justify-center bg-black/45 p-2 md:items-center md:p-3' onClick={onClose}>
      <div
        className='h-[50vh] max-h-[50vh] w-full overflow-hidden rounded-t-xl rounded-b-none bg-white shadow-2xl animate-[oc-sheet-up_220ms_ease-out] md:h-[min(82vh,720px)] md:max-h-[720px] md:w-full md:max-w-5xl md:rounded-lg md:animate-none'
        onClick={(event) => event.stopPropagation()}
      >
        {isBootLoading ? (
          <div className='grid h-full gap-0 md:grid-cols-[1.02fr_1fr]'>
            <div className='min-w-0 p-3 md:p-4'>
              <div className='relative flex max-h-[64vh] min-h-[320px] w-full items-center justify-center overflow-hidden rounded-md bg-slate-100 animate-pulse' />
              <div className='mt-3 flex items-center gap-2'>
                <div className='h-10 w-10 shrink-0 rounded-md bg-slate-100 animate-pulse' />
                <div className='flex min-w-0 flex-1 gap-2 overflow-hidden pb-1'>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={`s-thumb-${index}`} className='h-16 w-16 shrink-0 rounded-md bg-slate-100 animate-pulse' />
                  ))}
                </div>
                <div className='h-10 w-10 shrink-0 rounded-md bg-slate-100 animate-pulse' />
              </div>
            </div>
            <div className='relative min-h-0 min-w-0 border-t border-gray-100 p-4 md:border-l md:border-t-0 md:p-5 flex h-full flex-col overflow-hidden'>
              <button
                type='button'
                onClick={onClose}
                className='absolute right-8 top-4 z-50 rounded-full bg-white/95 p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 md:right-9 md:top-5'
                aria-label='Close'
              >
                <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2'>
                  <path d='M6 6l12 12M18 6L6 18' strokeLinecap='round' />
                </svg>
              </button>
              <div className='min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5 pb-4'>
                <div className='h-11 w-4/5 rounded-md bg-slate-100 animate-pulse' />
                <div className='mt-3 h-5 w-1/2 rounded-md bg-slate-100 animate-pulse' />
                <div className='mt-2 h-4 w-1/3 rounded-md bg-slate-100 animate-pulse' />
                <div className='mt-3 space-y-2'>
                  <div className='h-4 w-full rounded-md bg-slate-100 animate-pulse' />
                  <div className='h-4 w-11/12 rounded-md bg-slate-100 animate-pulse' />
                </div>
                <div className='mt-5 h-10 w-52 rounded-md bg-slate-100 animate-pulse' />
                <div className='mt-3 flex gap-2'>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={`s-tag-${index}`} className='h-5 w-16 rounded-full bg-slate-100 animate-pulse' />
                  ))}
                </div>
                <div className='mt-4 rounded-xl border border-gray-200 bg-gray-50/70 p-3.5'>
                  <div className='h-5 w-20 rounded-md bg-slate-100 animate-pulse' />
                  <div className='mt-3 grid grid-cols-4 gap-2'>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={`s-card-${index}`} className='h-[118px] rounded-lg bg-slate-100 animate-pulse' />
                    ))}
                  </div>
                  <div className='mt-4 h-5 w-16 rounded-md bg-slate-100 animate-pulse' />
                  <div className='mt-3 flex gap-2'>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={`s-chip-${index}`} className='h-9 w-14 rounded-full bg-slate-100 animate-pulse' />
                    ))}
                  </div>
                </div>
              </div>
              <div className='z-40 mt-3 shrink-0 bg-white px-1 pb-2 pt-2'>
                <div className='flex items-center gap-3'>
                  <div className='h-11 w-[130px] rounded-full bg-slate-100 animate-pulse' />
                  <div className='h-11 flex-1 rounded-full bg-slate-100 animate-pulse' />
                </div>
              </div>
            </div>
          </div>
        ) : (
        <div className='grid h-full gap-0 md:grid-cols-[1.02fr_1fr]'>
          <div className='hidden min-w-0 p-3 md:block md:p-4'>
            <div className='relative flex max-h-[64vh] min-h-[320px] w-full items-center justify-center overflow-hidden rounded-md bg-transparent'>
              {activePreviewMedia?.type === 'video' && activePreviewMedia?.url ? (
                isActiveVideoPlaying ? (
                  <video
                    key={activePreviewMedia.url}
                    src={activePreviewMedia.url}
                    poster={activePreviewMedia.poster || previewImage || undefined}
                    controls
                    autoPlay
                    playsInline
                    preload='metadata'
                    onLoadedData={() => setIsMainMediaLoading(false)}
                    onCanPlay={() => setIsMainMediaLoading(false)}
                    onError={() => setIsMainMediaLoading(false)}
                    className='max-h-[64vh] w-auto max-w-full rounded-lg object-contain'
                  />
                ) : (
                  <button
                    type='button'
                    onClick={() => {
                      setIsMainMediaLoading(true)
                      setIsActiveVideoPlaying(true)
                    }}
                    className='group relative inline-flex max-h-[64vh] max-w-full items-center justify-center'
                    aria-label='Play video'
                  >
                    {activePreviewMedia.poster || previewImage ? (
                      <Image
                        src={activePreviewMedia.poster || previewImage}
                        alt={product?.name || 'Video preview'}
                        width={1100}
                        height={1100}
                        sizes='(max-width: 768px) 100vw, 50vw'
                        onLoad={() => setIsMainMediaLoading(false)}
                        onError={() => setIsMainMediaLoading(false)}
                        className='h-auto max-h-[64vh] w-auto max-w-full object-contain'
                      />
                    ) : (
                      <div className='h-[320px] w-[320px] bg-slate-100' />
                    )}
                    <span className='absolute inset-0 flex items-center justify-center'>
                      <svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-20 w-20 transition group-hover:scale-105'>
                        <path fillRule='evenodd' clipRule='evenodd' d='M11.0748 7.50835C9.74622 6.72395 8.25 7.79065 8.25 9.21316V14.7868C8.25 16.2093 9.74622 17.276 11.0748 16.4916L15.795 13.7048C17.0683 12.953 17.0683 11.047 15.795 10.2952L11.0748 7.50835ZM9.75 9.21316C9.75 9.01468 9.84615 8.87585 9.95947 8.80498C10.0691 8.73641 10.1919 8.72898 10.3122 8.80003L15.0324 11.5869C15.165 11.6652 15.25 11.8148 15.25 12C15.25 12.1852 15.165 12.3348 15.0324 12.4131L10.3122 15.2C10.1919 15.271 10.0691 15.2636 9.95947 15.195C9.84615 15.1242 9.75 14.9853 9.75 14.7868V9.21316Z' fill='#ededed' />
                        <path fillRule='evenodd' clipRule='evenodd' d='M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12Z' fill='#ededed' />
                      </svg>
                    </span>
                  </button>
                )
              ) : previewImage ? (
                <Image
                  src={previewImage}
                  alt={product?.name || 'Product'}
                  width={1100}
                  height={1100}
                  sizes='(max-width: 768px) 100vw, 50vw'
                  onLoad={() => setIsMainMediaLoading(false)}
                  onError={() => setIsMainMediaLoading(false)}
                  className='h-auto max-h-[64vh] w-auto max-w-full object-contain'
                />
              ) : null}
              {isMainMediaLoading ? (
                <div className='pointer-events-none absolute inset-0 rounded-md bg-slate-100/95 animate-pulse' />
              ) : null}
              {mediaItems.length > 1 ? (
                <>
                  <button
                    type='button'
                    onClick={goPrevMainMedia}
                    className='absolute left-2 top-1/2 z-10 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white/95 text-gray-700 shadow-sm hover:bg-white'
                    aria-label='Previous media'
                  >
                    <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2.2'>
                      <path d='M15 18l-6-6 6-6' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                  </button>
                  <button
                    type='button'
                    onClick={goNextMainMedia}
                    className='absolute right-2 top-1/2 z-10 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white/95 text-gray-700 shadow-sm hover:bg-white'
                    aria-label='Next media'
                  >
                    <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2.2'>
                      <path d='M9 6l6 6-6 6' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                  </button>
                </>
              ) : null}
            </div>
            {mediaItems.length > 1 ? (
              <div className='mt-3 flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => setThumbStart((value) => Math.max(0, value - 1))}
                  disabled={!canShiftLeft}
                  className='inline-flex h-10 w-10 shrink-0 items-center justify-center text-gray-700 disabled:cursor-not-allowed disabled:opacity-30'
                  aria-label='Previous thumbnails'
                >
                  <svg viewBox='0 0 24 24' className='h-7 w-7' fill='none' stroke='currentColor' strokeWidth='2.2'>
                    <path d='M15 18l-6-6 6-6' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                </button>
                <div className='flex min-w-0 flex-1 gap-2 overflow-hidden pb-1'>
                {visibleMediaItems.map((item, index) => {
                  const active = String(activePreviewMedia?.url || previewImage) === String(item?.url || '')
                  return (
                    <button
                      key={`${item.type}-${item.url}-${thumbStart + index}`}
                      type='button'
                      onClick={() => {
                        setActivePreviewMedia(item)
                        setIsActiveVideoPlaying(false)
                        if (item.type === 'image') {
                          setActivePreviewImage(item.url)
                        } else if (item.poster) {
                          setActivePreviewImage(item.poster)
                        }
                      }}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border transition ${
                        active ? 'border-gray-900 ring-2 ring-gray-200' : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {item.type === 'video' ? (
                        <div className='relative h-full w-full bg-black'>
                          {item.poster ? (
                            <Image
                              src={item.poster}
                              alt='Video thumbnail'
                              fill
                              sizes='64px'
                              className='object-cover'
                            />
                          ) : (
                            <div className='h-full w-full bg-slate-700' />
                          )}
                          <span className='absolute inset-0 flex items-center justify-center'>
                            <svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-7 w-7'>
                              <path fillRule='evenodd' clipRule='evenodd' d='M11.0748 7.50835C9.74622 6.72395 8.25 7.79065 8.25 9.21316V14.7868C8.25 16.2093 9.74622 17.276 11.0748 16.4916L15.795 13.7048C17.0683 12.953 17.0683 11.047 15.795 10.2952L11.0748 7.50835ZM9.75 9.21316C9.75 9.01468 9.84615 8.87585 9.95947 8.80498C10.0691 8.73641 10.1919 8.72898 10.3122 8.80003L15.0324 11.5869C15.165 11.6652 15.25 11.8148 15.25 12C15.25 12.1852 15.165 12.3348 15.0324 12.4131L10.3122 15.2C10.1919 15.271 10.0691 15.2636 9.95947 15.195C9.84615 15.1242 9.75 14.9853 9.75 14.7868V9.21316Z' fill='#ededed' />
                              <path fillRule='evenodd' clipRule='evenodd' d='M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12Z' fill='#ededed' />
                            </svg>
                          </span>
                        </div>
                      ) : (
                        <Image
                          src={item.url}
                          alt={`${product?.name || 'Product'} preview ${index + 1}`}
                          fill
                          sizes='64px'
                          className='object-cover'
                        />
                      )}
                    </button>
                  )
                })}
                </div>
                <button
                  type='button'
                  onClick={() => setThumbStart((value) => Math.min(Math.max(0, mediaItems.length - maxThumbs), value + 1))}
                  disabled={!canShiftRight}
                  className='inline-flex h-10 w-10 shrink-0 items-center justify-center text-gray-700 disabled:cursor-not-allowed disabled:opacity-30'
                  aria-label='Next thumbnails'
                >
                  <svg viewBox='0 0 24 24' className='h-7 w-7' fill='none' stroke='currentColor' strokeWidth='2.2'>
                    <path d='M9 6l6 6-6 6' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                </button>
              </div>
            ) : null}
          </div>
          <div className='relative min-h-0 min-w-0 border-t border-gray-100 p-4 md:border-l md:border-t-0 md:p-5 flex h-full flex-col overflow-hidden'>
            <button
              type='button'
              onClick={onClose}
              className='absolute right-8 top-4 z-50 rounded-full bg-white/95 p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 md:right-9 md:top-5'
              aria-label='Close'
            >
              <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2'>
                <path d='M6 6l12 12M18 6L6 18' strokeLinecap='round' />
              </svg>
            </button>
            <div
              onScroll={handlePanelScroll}
              className={`variant-quick-add-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5 pb-4 ${
                isScrollActive ? 'variant-quick-add-scroll--active' : ''
              }`}
            >
              <div className='mb-3 rounded-md border border-gray-200 p-2 md:hidden'>
                <div className='grid grid-cols-2 gap-2'>
                  {mobileGalleryItems.map((item, index) => (
                    <button
                      key={`m-gallery-${item.type}-${item.url}-${index}`}
                      type='button'
                      onClick={() => selectMediaAtIndex((activeMediaIndex + index) % Math.max(1, mediaItems.length))}
                      className='relative aspect-[3/4] overflow-hidden rounded-md bg-gray-100'
                    >
                      {item.type === 'video' ? (
                        <>
                          {item.poster ? (
                            <Image
                              src={item.poster}
                              alt='Video preview'
                              fill
                              sizes='50vw'
                              className='object-cover'
                            />
                          ) : (
                            <div className='h-full w-full bg-slate-200' />
                          )}
                          <span className='absolute inset-0 flex items-center justify-center bg-black/15'>
                            <svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-10 w-10'>
                              <path fillRule='evenodd' clipRule='evenodd' d='M11.0748 7.50835C9.74622 6.72395 8.25 7.79065 8.25 9.21316V14.7868C8.25 16.2093 9.74622 17.276 11.0748 16.4916L15.795 13.7048C17.0683 12.953 17.0683 11.047 15.795 10.2952L11.0748 7.50835ZM9.75 9.21316C9.75 9.01468 9.84615 8.87585 9.95947 8.80498C10.0691 8.73641 10.1919 8.72898 10.3122 8.80003L15.0324 11.5869C15.165 11.6652 15.25 11.8148 15.25 12C15.25 12.1852 15.165 12.3348 15.0324 12.4131L10.3122 15.2C10.1919 15.271 10.0691 15.2636 9.95947 15.195C9.84615 15.1242 9.75 14.9853 9.75 14.7868V9.21316Z' fill='#ededed' />
                              <path fillRule='evenodd' clipRule='evenodd' d='M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12Z' fill='#ededed' />
                            </svg>
                          </span>
                        </>
                      ) : (
                        <Image
                          src={item.url}
                          alt={`${product?.name || 'Product'} preview`}
                          fill
                          sizes='50vw'
                          className='object-cover'
                        />
                      )}
                    </button>
                  ))}
                </div>
                <div className='mt-2 flex items-center justify-between gap-2'>
                  <p className='truncate text-sm font-semibold text-gray-900'>{product?.name}</p>
                  {productDetailsHref ? (
                    <a
                      href={productDetailsHref}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='shrink-0 text-xs font-medium text-slate-600'
                    >
                      Details
                    </a>
                  ) : null}
                </div>
              </div>
              <div className='flex items-start justify-between gap-4'>
                <div className='min-w-0'>
                  <h3 className='text-[30px] font-semibold leading-tight text-gray-900 line-clamp-2 [font-family:Georgia,serif]'>
                    {product?.name}
                  </h3>
                  <div className='mt-1.5 flex items-center gap-3 text-sm'>
                    <span className='text-gray-600'>
                      {reviewsCount > 0 ? `${reviewsCount} reviews` : 'No reviews yet'}
                    </span>
                    <span className={stockCount <= 0 ? 'text-rose-600' : 'text-green-600'}>{stockLabel}</span>
                  </div>
                  {String(product?.sku || '').trim() ? (
                    <div className='mt-1.5 text-xs text-gray-500'>SKU: {String(product.sku).trim()}</div>
                  ) : null}
                  {product?.shortDescription ? (
                    <p className='mt-2 text-sm text-gray-600 line-clamp-2'>{String(product.shortDescription)}</p>
                  ) : null}
                </div>
                <div className='h-8 w-8 shrink-0' aria-hidden='true' />
              </div>

              <div className='mt-3 flex items-end gap-2'>
                <span className='text-2xl font-semibold text-gray-900'>{formatCurrency(pricing.price)}</span>
                {pricing.originalPrice ? (
                  <span className='text-sm text-gray-400 line-through'>{formatCurrency(pricing.originalPrice)}</span>
                ) : null}
              </div>
              {discountAmount > 0 ? (
                <div className='mt-1 text-sm font-semibold text-green-700'>
                  Save {formatCurrency(discountAmount)} if you buy now
                </div>
              ) : null}
              {tags.length ? (
                <div className='mt-3 flex flex-wrap gap-1.5'>
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className='rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700'
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className={`mt-4 space-y-4 overflow-x-hidden rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 ${shakeOptions ? 'oc-shake border-rose-300' : ''}`}>
              {colorVariationCards.length > 0 ? (
                <div>
                  <div className='mb-2 text-sm font-semibold text-gray-900'>Color</div>
                  <div className='flex flex-wrap gap-2'>
                    {colorVariationCards.map((entry) => {
                      const active = String(selected.color || '') === String(entry.color)
                      return (
                        <button
                          key={entry.color}
                          type='button'
                          onClick={() => {
                            applyOptionSelection('color', entry.color)
                            setActivePreviewImage(entry.image)
                            setActivePreviewMedia({ type: 'image', url: entry.image, poster: '' })
                            setIsActiveVideoPlaying(false)
                          }}
                          className={`w-[86px] overflow-hidden rounded-lg border bg-white p-0.5 text-left transition ${
                            active ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                          }`}
                        >
                          <div className='relative h-[82px] w-full overflow-hidden rounded-md bg-gray-100'>
                            <Image
                              src={entry.image}
                              alt={entry.color}
                              fill
                              sizes='86px'
                              className='object-cover'
                            />
                          </div>
                          <div className='pt-1 text-[10px] font-semibold text-gray-900 truncate capitalize'>{entry.color}</div>
                          <div className='text-[9px] font-semibold text-gray-900'>{formatCurrency(entry.price)}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
              {variationVideoItems.length > 0 ? (
                <div>
                  <div className='mb-2 text-sm font-semibold text-gray-900'>Video Variation</div>
                  <div className='flex flex-wrap gap-2'>
                    {variationVideoItems.map((video) => {
                      const active = activePreviewMedia?.type === 'video' && activePreviewMedia?.url === video.url
                      return (
                        <button
                          key={video.url}
                          type='button'
                          onClick={() => {
                            setActivePreviewMedia({ type: 'video', url: video.url, poster: video.poster || '' })
                            if (video.poster) setActivePreviewImage(video.poster)
                            setIsActiveVideoPlaying(false)
                          }}
                          className={`relative h-12 rounded-full border px-3 text-xs font-semibold transition ${
                            active ? 'border-gray-900 bg-white text-gray-900' : 'border-gray-300 bg-white text-gray-700'
                          }`}
                        >
                          <span className='inline-flex items-center gap-1.5'>
                            <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.7'>
                              <path d='M3 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' />
                              <path d='m15 10 5-3v10l-5-3z' />
                            </svg>
                            {video.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
              {nonColorAttributes.map((section) => (
                <div key={section.key}>
                  <div className='mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-gray-900 capitalize'>{section.label}</div>
                  <div className='flex flex-wrap gap-2'>
                    {section.options.map((option) => {
                      const active = String(selected[section.key] || '') === String(option)
                      return (
                        <button
                          key={`${section.key}-${option}`}
                          type='button'
                          onClick={() => applyOptionSelection(section.key, option)}
                          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                            active
                              ? 'border-gray-900 bg-white text-gray-900'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {String(option).toUpperCase()}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              </div>
              {productDetailsHref ? (
                <div className='mt-3'>
                  <a
                    href={productDetailsHref}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900'
                  >
                    See more details
                    <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8'>
                      <path d='M7 5h8v8' strokeLinecap='round' strokeLinejoin='round' />
                      <path d='M13 5 5 13' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                  </a>
                </div>
              ) : null}
            </div>

            <div className='z-40 mt-2 shrink-0 bg-white px-1 pb-2 pt-2'>
              <div className='flex items-center gap-3'>
                <div className='inline-flex h-11 items-center rounded-full border border-slate-800 bg-white px-2'>
                  <button
                    type='button'
                    onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                    className='h-8 w-8 rounded-full text-lg text-slate-700 hover:bg-slate-100'
                    aria-label='Decrease quantity'
                  >
                    -
                  </button>
                  <span className='w-12 text-center text-sm font-semibold text-slate-900'>Qty {quantity}</span>
                  <button
                    type='button'
                    onClick={() => setQuantity((value) => Math.min(50, value + 1))}
                    className='h-8 w-8 rounded-full text-lg text-slate-700 hover:bg-slate-100'
                    aria-label='Increase quantity'
                  >
                    +
                  </button>
                </div>
                <button
                  type='button'
                  onClick={() => {
                    if (!matching) {
                      setShakeOptions(true)
                      window.setTimeout(() => setShakeOptions(false), 500)
                      return
                    }
                    onConfirm({
                      selectedColor: selected.color || initialColor || '',
                      selectedSize: selected.size || initialSize || '',
                      selectedAttributes: selected,
                      selectedVariationId: matching.variation?.id,
                      selectedVariationLabel: buildVariationLabel(matching.attrs),
                      image: previewImage || product?.image || '',
                      price: pricing.price,
                      originalPrice: pricing.originalPrice,
                      quantity: Math.max(1, Number(quantity) || 1),
                    })
                  }}
                  className='inline-flex h-11 flex-1 items-center justify-center rounded-full border border-black bg-black px-4 text-sm font-semibold text-white transition hover:opacity-95'
                >
                  {canConfirm ? 'Add to Cart' : 'Select an option'}
                </button>
              </div>
              {matching ? (
                <div className='mt-2 text-[11px] text-gray-500'>
                  Selected: {buildVariationLabel(matching.attrs)}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default ProductVariantQuickAddModal
