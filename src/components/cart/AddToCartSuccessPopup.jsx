'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import normalizeProduct from '@/components/product/catalog/normalizeProduct.mjs'

const formatPrice = (value) => {
  const amount = Number(value || 0)
  return `$${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`
}

const shortenText = (value, limit = 40) => {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.length <= limit) return text
  return `${text.slice(0, Math.max(0, limit - 3)).trimEnd()}...`
}

const toCategoryQuery = (product) => {
  const direct = String(product?.category || '').trim()
  if (direct) return direct
  const firstCategory = Array.isArray(product?.categories) ? product.categories[0] : null
  if (!firstCategory) return ''
  if (typeof firstCategory === 'string') return String(firstCategory).trim()
  return String(firstCategory?.slug || firstCategory?.name || '').trim()
}

const toTagQuery = (product) => {
  const firstTag = Array.isArray(product?.tags) ? product.tags[0] : null
  if (!firstTag) return ''
  if (typeof firstTag === 'string') return String(firstTag).trim()
  return String(firstTag?.slug || firstTag?.name || '').trim()
}

const toSearchQuery = (product) => {
  const words = String(product?.name || '')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
  return words.slice(0, 4).join(' ')
}

const normalizeRelated = (items = []) =>
  items
    .map((item) => normalizeProduct(item))
    .filter((item) => item?.id && item?.slug && item?.name)

const buildSignalCsv = (values = [], limit = 20) => {
  const cleaned = values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  const unique = Array.from(new Set(cleaned))
  return unique.slice(0, limit).join(',')
}

const buildAttributeSignals = (variations = [], limit = 20) => {
  if (!Array.isArray(variations)) return ''
  const pairs = []
  variations.forEach((variation) => {
    const attributes = variation?.attributes
    if (!attributes || typeof attributes !== 'object') return
    Object.entries(attributes).forEach(([rawKey, rawValue]) => {
      if (!rawKey || rawValue === undefined || rawValue === null) return
      const key = String(rawKey).trim()
      const value = String(rawValue).trim()
      if (!key || !value) return
      pairs.push(`${key}=${value}`)
    })
  })
  return buildSignalCsv(pairs, limit)
}

const toTagList = (product) => {
  const source = Array.isArray(product?.tags) ? product.tags : []
  return source
    .map((entry) => (typeof entry === 'string' ? entry : entry?.slug || entry?.name || ''))
    .map((value) => String(value || '').trim())
    .filter(Boolean)
}

const resolveCategorySignal = (product) => {
  const explicitSlug = String(product?.categorySlug || product?.category_slug || '').trim()
  if (explicitSlug) return explicitSlug
  const firstCategory = Array.isArray(product?.categories) ? product.categories[0] : null
  if (firstCategory && typeof firstCategory === 'object') {
    const categorySlug = String(firstCategory?.slug || '').trim()
    if (categorySlug) return categorySlug
    const categoryName = String(firstCategory?.name || '').trim()
    if (categoryName) return categoryName
  }
  return toCategoryQuery(product)
}

export default function AddToCartSuccessPopup() {
  const pathname = usePathname()
  const { lastAddedItem, clearLastAddedItem } = useCart()
  const [relatedItems, setRelatedItems] = useState([])
  const [isLoadingRelated, setIsLoadingRelated] = useState(false)
  const [open, setOpen] = useState(false)

  const addedProduct = lastAddedItem?.product || null

  useEffect(() => {
    if (!lastAddedItem?.createdAt) return
    setOpen(true)
  }, [lastAddedItem?.createdAt])

  useEffect(() => {
    if (!open || !lastAddedItem?.createdAt) return
    const shouldAutoClose =
      typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches
    if (!shouldAutoClose) return
    const timer = window.setTimeout(() => {
      setOpen(false)
      clearLastAddedItem()
    }, 9000)
    return () => window.clearTimeout(timer)
  }, [clearLastAddedItem, lastAddedItem?.createdAt, open])

  useEffect(() => {
    if (!open || !addedProduct) return
    let cancelled = false
    setIsLoadingRelated(true)
    const loadRelated = async () => {
      try {
        let sourceProduct = addedProduct
        const hasSignalData =
          toTagList(sourceProduct).length > 0 ||
          Boolean(resolveCategorySignal(sourceProduct)) ||
          (Array.isArray(sourceProduct?.variations) && sourceProduct.variations.length > 0)

        if (!hasSignalData && sourceProduct?.slug) {
          const detailResponse = await fetch(`/api/products/${encodeURIComponent(sourceProduct.slug)}`, {
            cache: 'no-store',
          })
          const detailPayload = await detailResponse.json().catch(() => null)
          const detailed = normalizeProduct(detailPayload?.item)
          if (detailed) {
            sourceProduct = {
              ...sourceProduct,
              ...detailed,
            }
          }
        }

        const MAX_RELATED = 8
        const collected = []
        const seen = new Set()
        const baseParams = new URLSearchParams({
          page: '1',
          per_page: '20',
        })
        const stages = []

        const tagSignals = buildSignalCsv(toTagList(sourceProduct))
        const categorySignal = resolveCategorySignal(sourceProduct)
        const attributeSignals = buildAttributeSignals(sourceProduct?.variations || [])
        const brandSignals = buildSignalCsv([sourceProduct?.vendor || ''])
        const searchFallback = toSearchQuery(sourceProduct)

        if (tagSignals) {
          const params = new URLSearchParams(baseParams)
          params.set('visited_tags', tagSignals)
          stages.push(params)
        }
        if (categorySignal) {
          const params = new URLSearchParams(baseParams)
          params.set('visited_categories', categorySignal)
          stages.push(params)
        }
        if (attributeSignals) {
          const params = new URLSearchParams(baseParams)
          params.set('visited_attributes', attributeSignals)
          stages.push(params)
        }
        if (brandSignals) {
          const params = new URLSearchParams(baseParams)
          params.set('visited_brands', brandSignals)
          stages.push(params)
        }
        if (searchFallback) {
          const params = new URLSearchParams(baseParams)
          params.set('search', searchFallback)
          stages.push(params)
        }
        if (!stages.length) {
          stages.push(new URLSearchParams(baseParams))
        }

        for (const params of stages) {
          if (collected.length >= MAX_RELATED) break
          const response = await fetch(`/api/products?${params.toString()}`, { cache: 'no-store' })
          const payload = await response.json().catch(() => null)
          const mapped = normalizeRelated(Array.isArray(payload?.items) ? payload.items : [])
          for (const item of mapped) {
            if (collected.length >= MAX_RELATED) break
            const slug = String(item?.slug || '')
            const id = String(item?.id || '')
            if (!slug && !id) continue
            if (
              String(item.id || '') === String(addedProduct.id || '') ||
              String(item.slug || '') === String(addedProduct.slug || '')
            ) {
              continue
            }
            const key = `${id}:${slug}`
            if (seen.has(key)) continue
            seen.add(key)
            collected.push(item)
          }
        }

        if (cancelled) return
        setRelatedItems(collected)
      } catch {
        if (cancelled) return
        setRelatedItems([])
      } finally {
        if (cancelled) return
        setIsLoadingRelated(false)
      }
    }
    void loadRelated()
    return () => {
      cancelled = true
    }
  }, [addedProduct, open])

  const showOnRoute = useMemo(() => {
    if (!pathname) return true
    if (pathname.startsWith('/backend/admin')) return false
    if (pathname.startsWith('/checkout')) return false
    return true
  }, [pathname])

  if (!showOnRoute || !open || !addedProduct) return null

  const savings =
    Number(addedProduct.originalPrice || 0) > Number(addedProduct.price || 0)
      ? Number(addedProduct.originalPrice || 0) - Number(addedProduct.price || 0)
      : 0

  return (
    <div className='pointer-events-none fixed inset-0 z-[2147483647] flex items-end sm:items-center sm:justify-center'>
      <div className='pointer-events-auto w-full rounded-t-2xl rounded-b-none border border-gray-200 bg-white p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.18)] sm:w-[min(94vw,1040px)] sm:min-h-[420px] sm:rounded-2xl sm:p-6 sm:shadow-[0_22px_60px_rgba(15,23,42,0.24)]'>
        <div className='mb-3 flex items-center justify-between gap-3'>
          <div className='inline-flex items-center gap-2'>
            <span className='inline-flex h-5 w-5 items-center justify-center text-black'>
              <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' aria-hidden='true'>
                <circle cx='12' cy='12' r='9' stroke='currentColor' strokeWidth='2' />
                <path
                  d='M8 12.5 10.6 15 16 9.8'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </span>
            <p className='text-base font-semibold text-gray-900'>Successfully Added To Cart</p>
          </div>
          <button
            type='button'
            onClick={() => {
              setOpen(false)
              clearLastAddedItem()
            }}
            className='inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100'
            aria-label='Close'
          >
            <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M6 6l12 12M18 6L6 18' strokeLinecap='round' />
            </svg>
          </button>
        </div>

        <div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_260px] sm:gap-5'>
          <div className='flex gap-3 rounded-xl bg-gray-50 p-2.5 sm:p-3.5'>
            <div className='relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100 sm:h-24 sm:w-24'>
              {addedProduct.image ? (
                <Image src={addedProduct.image} alt={addedProduct.name} fill sizes='80px' className='object-cover' />
              ) : null}
            </div>
            <div className='min-w-0 max-w-full flex-1 basis-0 overflow-hidden'>
              <p className='block w-full text-base font-semibold text-gray-900 sm:max-w-[420px]'>
                {shortenText(addedProduct.name, 44)}
              </p>
              <div className='mt-1 flex items-center gap-2'>
                <span className='text-base font-semibold text-gray-900'>{formatPrice(addedProduct.price)}</span>
                {addedProduct.originalPrice ? (
                  <span className='text-sm text-gray-400 line-through'>{formatPrice(addedProduct.originalPrice)}</span>
                ) : null}
              </div>
              {savings > 0 ? (
                <p className='mt-0.5 text-sm font-semibold text-green-600'>Save {formatPrice(savings)}</p>
              ) : null}
            </div>
          </div>

            <div className='grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-3'>
            <Link
              href='/checkout/review'
              className='inline-flex h-11 w-full items-center justify-center rounded-full bg-black px-4 text-sm font-semibold text-white sm:h-12 sm:max-w-[320px]'
              onClick={() => {
                setOpen(false)
                clearLastAddedItem()
              }}
            >
              Checkout Now
            </Link>
            <Link
              href='/cart'
              className='inline-flex h-11 w-full items-center justify-center rounded-full border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 sm:h-12 sm:max-w-[320px]'
              onClick={() => {
                setOpen(false)
                clearLastAddedItem()
              }}
            >
              View Cart
            </Link>
          </div>
        </div>

        <div className='mt-4 pb-[max(4px,env(safe-area-inset-bottom))]'>
          <h3 className='mb-2 text-base font-semibold text-gray-900'>You May Also Like</h3>
          {isLoadingRelated ? (
            <div className='flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:gap-3 sm:overflow-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'>
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`related-skeleton-${index}`}
                  className='w-[108px] shrink-0 overflow-hidden rounded-md border border-gray-200 sm:w-auto sm:shrink'
                >
                  <div className='aspect-square bg-slate-100 animate-pulse' />
                </div>
              ))}
            </div>
          ) : relatedItems.length ? (
            <div className='flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:gap-3 sm:overflow-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'>
              {relatedItems.slice(0, 5).map((item) => (
                <Link
                  key={`${item.id}-${item.slug}`}
                  href={`/product/${item.slug}`}
                  onClick={() => {
                    setOpen(false)
                    clearLastAddedItem()
                  }}
                  className='group w-[108px] shrink-0 overflow-hidden sm:w-auto sm:shrink'
                >
                  <div className='overflow-hidden rounded-md border border-gray-200 bg-white'>
                    <div className='relative aspect-square overflow-hidden bg-gray-100'>
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes='98px'
                          className='object-cover transition duration-200 group-hover:scale-105'
                        />
                      ) : null}
                    </div>
                  </div>
                  <p className='mt-1 block max-w-full text-sm font-semibold leading-tight text-gray-900'>
                    {shortenText(item.name, 15)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className='text-xs text-gray-500'>No recommendations available yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
