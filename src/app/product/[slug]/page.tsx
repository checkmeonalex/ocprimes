'use client'
import { useEffect, useMemo, useRef, useState, use, useCallback } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { getSwatchStyle } from '../../../components/product/colorUtils.mjs'
import StarRating from '../../../components/product/StarRating'
import Gallery from '../../../components/product/ProductDetails/gallery'
import Breadcrumb from '../../../components/Breadcrumb'
import ShippingInfoCard from '../../../components/product/ShippingInfoCard'
import AboutStoreCard from '../../../components/product/AboutStoreCard'
import CustomerReviews from '../../../components/product/CustomerReviews'
import {
  customerReviewsByProductId,
  customerReviewsData,
} from '../../../components/data/customerReviews'
import { useCart } from '../../../context/CartContext'
import RelatedProductsSection from '../../../components/product/RelatedProductsSection'
import QuantityControl from '../../../components/cart/QuantityControl'
import { findCartEntry } from '../../../lib/cart/cart-match'
import RecentlyViewedSection from '../../../components/product/RecentlyViewedSection'
import { addRecentlyViewed } from '../../../lib/recently-viewed/storage'

const buildVariationLabel = (attributes: Record<string, string> | null | undefined) => {
  if (!attributes || typeof attributes !== 'object') return ''
  const parts = Object.entries(attributes)
    .map(([key, value]) => {
      if (!value) return ''
      const labelKey = key.replace(/[_-]+/g, ' ').trim()
      const labelValue = String(value).replace(/[_-]+/g, ' ').trim()
      if (!labelKey || !labelValue) return ''
      return `${labelKey}: ${labelValue}`
    })
    .filter(Boolean)
  return parts.join(' / ')
}

const resolveVariationPrice = (variation: any, fallbackPrice: number) => {
  const regular = Number(variation?.regular_price ?? fallbackPrice ?? 0)
  const sale = Number(variation?.sale_price ?? 0)
  const hasDiscount = sale > 0 && sale < regular
  return {
    price: hasDiscount ? sale : regular,
    originalPrice: hasDiscount ? regular : null,
  }
}

const resolveVariationImage = (variation: any, images: any[], fallback: string) => {
  if (variation?.image_id) {
    const match = images.find((image) => String(image?.id) === String(variation.image_id))
    if (match?.url) return match.url
  }
  return fallback
}

const normalizeAttributeKey = (key: string) =>
  key.toLowerCase().replace(/[^a-z0-9]/g, '')

const slugifyCategory = (value: string) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const buildSignalCsv = (values: string[], limit = 20) => {
  const cleaned = values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  const unique = Array.from(new Set(cleaned))
  return unique.slice(0, limit).join(',')
}

const buildAttributeSignals = (variations: any[], limit = 20) => {
  if (!Array.isArray(variations)) return ''
  const pairs: string[] = []
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

const fetchRelatedBatch = async (params: URLSearchParams) => {
  const response = await fetch(`/api/products?${params.toString()}`, {
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null)
  return Array.isArray(payload?.items) ? payload.items : []
}

const extractAttributeValue = (
  attributes: Record<string, string> | null | undefined,
  candidates: string[],
) => {
  if (!attributes || typeof attributes !== 'object') return ''
  const entries = Object.entries(attributes)
  for (const [key, value] of entries) {
    const normalizedKey = normalizeAttributeKey(key)
    if (!candidates.includes(normalizedKey)) continue
    if (value === undefined || value === null) return ''
    return String(value)
  }
  return ''
}

const mapApiProduct = (item: any) => {
  if (!item) return null
  const images = Array.isArray(item.images) ? item.images : []
  const imageUrls = images.map((image) => image?.url).filter(Boolean)
  const basePrice = Number(item.price) || 0
  const discountPrice = Number(item.discount_price) || 0
  const hasDiscount = discountPrice > 0 && discountPrice < basePrice
  const displayPrice = hasDiscount ? discountPrice : basePrice
  const primaryCategory = Array.isArray(item.categories) ? item.categories[0] : null
  const primaryBrand = Array.isArray(item.brands) ? item.brands[0] : null
  const fallbackImage = item.image_url || imageUrls[0] || ''
  const categorySlug = primaryCategory?.slug || slugifyCategory(primaryCategory?.name)

  const variations = Array.isArray(item.variations)
    ? item.variations.map((variation: any) => {
        const attributes = variation?.attributes || {}
        const color = extractAttributeValue(attributes, ['color', 'colour'])
        const size = extractAttributeValue(attributes, ['size'])
        const label = buildVariationLabel(variation?.attributes) || `Variant ${variation?.id || ''}`.trim()
        const pricing = resolveVariationPrice(variation, displayPrice)
        const hasImage = Boolean(variation?.image_id)
        const image = hasImage ? resolveVariationImage(variation, images, fallbackImage) : ''
        return {
          id: variation?.id,
          label,
          price: pricing.price,
          originalPrice: pricing.originalPrice,
          image,
          sku: variation?.sku || '',
          stock: Number.isFinite(Number(variation?.stock_quantity))
            ? Number(variation.stock_quantity)
            : 0,
          attributes,
          color,
          size,
          hasImage,
        }
      })
    : []

  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    category: primaryCategory?.name || 'Uncategorized',
    categorySlug,
    vendor: primaryBrand?.name || 'OCPRIMES',
    vendorFont: 'Georgia, serif',
    shortDescription: item.short_description || '',
    fullDescription: item.description || '',
    price: displayPrice,
    originalPrice: hasDiscount ? basePrice : null,
    rating: Number(item.rating) || 0,
    reviews: Number(item.reviews) || 0,
    colors: [],
    sizes: [],
    isTrending: false,
    isPortrait: false,
    image: fallbackImage,
    gallery: imageUrls.length ? imageUrls : fallbackImage ? [fallbackImage] : [],
    stock: Number.isFinite(Number(item.stock_quantity)) ? Number(item.stock_quantity) : 0,
    tags: Array.isArray(item.tags) ? item.tags.map((tag: any) => tag?.name).filter(Boolean) : [],
    variations,
  }
}

function ProductContent({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params)

  const [product, setProduct] = useState<any>(null)
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [currentImage, setCurrentImage] = useState('')
  const [activeTab, setActiveTab] = useState('details')
  const [showFloatingCart, setShowFloatingCart] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedVariation, setSelectedVariation] = useState<any>(null)
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({})
  const [shakeKeys, setShakeKeys] = useState<string[]>([])
  const [variationError, setVariationError] = useState('')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showSeeMore, setShowSeeMore] = useState(false)
  const { addItem, items, updateQuantity } = useCart()
  const searchParams = useSearchParams()
  const addToCartRef = useRef<HTMLDivElement | null>(null)
  const galleryMainRef = useRef<HTMLDivElement | null>(null)
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const rightColumnRef = useRef<HTMLDivElement | null>(null)
  const rightPinRef = useRef<HTMLDivElement | null>(null)
  const rightSpacerRef = useRef<HTMLDivElement | null>(null)
  const leftColumnRef = useRef<HTMLDivElement | null>(null)
  const descriptionRef = useRef<HTMLParagraphElement | null>(null)

  const variationList = useMemo(() => product?.variations || [], [product?.variations])
  const normalizedVariations = useMemo(() => {
    return variationList.map((variation: any) => {
      const attrs: Record<string, string> = {}
      const source = variation?.attributes || {}
      Object.entries(source).forEach(([key, value]) => {
        if (!key || value === undefined || value === null) return
        const normalized = String(key).toLowerCase().replace(/^pa_/, '')
        const mappedKey = normalized === 'colour' ? 'color' : normalized
        attrs[mappedKey] = String(value)
      })
      if (variation?.color) {
        attrs.color = String(variation.color)
      }
      if (variation?.size) {
        attrs.size = String(variation.size)
      }
      return { variation, attrs }
    })
  }, [variationList])
  const attributeOptions = useMemo(() => {
    const map = new Map<string, Set<string>>()
    normalizedVariations.forEach(({ attrs }) => {
      Object.entries(attrs).forEach(([key, value]) => {
        if (!key || value === undefined || value === null) return
        const stringValue = String(value).trim()
        if (!stringValue) return
        const set = map.get(key) || new Set<string>()
        set.add(stringValue)
        map.set(key, set)
      })
    })
    return Array.from(map.entries()).map(([key, values]) => ({
      key,
      label: key.replace(/[_-]+/g, ' '),
      options: Array.from(values),
    }))
  }, [normalizedVariations])
  const extraAttributeOptions = useMemo(
    () => attributeOptions.filter((item) => item.key !== 'color' && item.key !== 'size'),
    [attributeOptions],
  )
  const selectionMap = useMemo(() => {
    return {
      ...selectedAttributes,
      ...(selectedColor ? { color: selectedColor } : {}),
      ...(selectedSize ? { size: selectedSize } : {}),
    }
  }, [selectedAttributes, selectedColor, selectedSize])
  const isOptionAvailable = useCallback(
    (key: string, value: string) => {
      if (!normalizedVariations.length) return true
      return normalizedVariations.some(({ attrs }) => {
        if (attrs[key] !== value) return false
        return Object.entries(selectionMap).every(([selKey, selValue]) => {
          if (!selValue || selKey === key) return true
          return attrs[selKey] === selValue
        })
      })
    },
    [normalizedVariations, selectionMap],
  )
  const requiresColor = attributeOptions.some((item) => item.key === 'color')
  const requiresSize = attributeOptions.some((item) => item.key === 'size')
  const requiresExtras = extraAttributeOptions.map((item) => item.key)
  const isSelectionComplete =
    !variationList.length ||
    (!requiresColor || Boolean(selectedColor)) &&
      (!requiresSize || Boolean(selectedSize)) &&
      requiresExtras.every((key) => Boolean(selectionMap[key]))
  const addToCartLabel = isSelectionComplete ? 'Add to Cart' : 'Select an option'
  const colorVariationCards = useMemo(() => {
    const map = new Map<string, any>()
    variationList.forEach((variation: any) => {
      if (!variation?.hasImage) return
      const color = variation?.color
      if (!color) return
      const normalized = String(color)
      if (map.has(normalized)) return
      map.set(normalized, variation)
    })
    return Array.from(map.values())
  }, [variationList])
  const colorOptions = useMemo(() => {
    const fromAttrs = attributeOptions.find((item) => item.key === 'color')?.options || []
    return fromAttrs.length ? fromAttrs : product?.colors || []
  }, [attributeOptions, product?.colors])
  const sizeOptions = useMemo(() => {
    const fromAttrs = attributeOptions.find((item) => item.key === 'size')?.options || []
    return fromAttrs.length ? fromAttrs : product?.sizes || []
  }, [attributeOptions, product?.sizes])

  useEffect(() => {
    if (!selectedColor && !selectedSize && Object.keys(selectedAttributes).length === 0) return
    const nextAttributes: Record<string, string> = { ...selectedAttributes }
    Object.entries(nextAttributes).forEach(([key, value]) => {
      if (!value) return
      if (!isOptionAvailable(key, value)) {
        delete nextAttributes[key]
      }
    })
    const nextColor = selectedColor && !isOptionAvailable('color', selectedColor) ? '' : selectedColor
    const nextSize = selectedSize && !isOptionAvailable('size', selectedSize) ? '' : selectedSize
    const attributesChanged =
      Object.keys(nextAttributes).length !== Object.keys(selectedAttributes).length ||
      Object.entries(nextAttributes).some(([key, value]) => selectedAttributes[key] !== value)
    const colorChanged = nextColor !== selectedColor
    const sizeChanged = nextSize !== selectedSize
    if (colorChanged) {
      setSelectedColor(nextColor)
    }
    if (sizeChanged) {
      setSelectedSize(nextSize)
    }
    if (attributesChanged) {
      setSelectedAttributes(nextAttributes)
    }
    if (colorChanged || sizeChanged || attributesChanged) {
      setSelectedVariation(null)
    }
  }, [isOptionAvailable, selectedAttributes, selectedColor, selectedSize])

  useEffect(() => {
    if (!variationList.length) return
    if (!Object.keys(selectionMap).length) return
    const requiredKeys = attributeOptions.map((item) => item.key)
    const isComplete = requiredKeys.every((key) => selectionMap[key])
    if (!isComplete) {
      setSelectedVariation(null)
      return
    }
    const match = normalizedVariations.find(({ attrs }) =>
      requiredKeys.every((key) => attrs[key] === selectionMap[key]),
    )
    if (!match) return
    setSelectedVariation(match.variation)
    setCurrentImage(match.variation?.image || product?.image || '')
    setVariationError('')
  }, [attributeOptions, normalizedVariations, selectionMap, variationList.length, product?.image])

  const hasCompleteVariationImages = useMemo(() => {
    return variationList.length > 0 && variationList.every((variation: any) => variation?.hasImage)
  }, [variationList])

  useEffect(() => {
    let isActive = true
    const loadProduct = async () => {
      try {
        const previewParam = searchParams.get('preview')
        const query = previewParam ? `?preview=${encodeURIComponent(previewParam)}` : ''
        const response = await fetch(`/api/products/${resolvedParams.slug}${query}`)
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load product.')
        }
        const mapped = mapApiProduct(payload?.item)
        if (!isActive) return
        setProduct(mapped)
        setSelectedColor(mapped?.colors?.[0] || '')
        setSelectedSize(mapped?.sizes?.[0] || '')
        setCurrentImage(mapped?.image || '')
        setSelectedVariation(null)
        setVariationError('')
      } catch (_error) {
        if (!isActive) return
        setProduct(null)
      }
    }
    loadProduct()
    return () => {
      isActive = false
    }
  }, [resolvedParams.slug, searchParams])

  useEffect(() => {
    if (!product?.id) return
    addRecentlyViewed({
      id: String(product.id),
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: Number(product.price) || 0,
      originalPrice: product.originalPrice ?? null,
      stock: Number(product.stock) || 0,
      vendor: product.vendor || null,
      vendorFont: product.vendorFont || null,
    })
  }, [
    product?.id,
    product?.slug,
    product?.name,
    product?.image,
    product?.price,
    product?.originalPrice,
    product?.stock,
    product?.vendor,
    product?.vendorFont,
  ])

  useEffect(() => {
    let isActive = true
    const loadRelated = async () => {
      if (!product) {
        setRelatedProducts([])
        return
      }
      try {
        const MAX_RELATED = 20
        const related: any[] = []
        const seen = new Set<string>()

        const baseParams = new URLSearchParams()
        baseParams.set('page', '1')
        baseParams.set('per_page', String(MAX_RELATED))

        const tagSignals = Array.isArray(product.tags) ? buildSignalCsv(product.tags) : ''
        const brandSignals = product.vendor ? buildSignalCsv([product.vendor]) : ''
        const attributeSignals = buildAttributeSignals(product.variations || [])

        const stages: Array<URLSearchParams> = []

        if (product.categorySlug) {
          const params = new URLSearchParams(baseParams)
          params.set('category', product.categorySlug)
          params.set('visited_categories', product.categorySlug)
          stages.push(params)
        }
        if (brandSignals) {
          const params = new URLSearchParams(baseParams)
          params.set('visited_brands', brandSignals)
          stages.push(params)
        }
        if (tagSignals) {
          const params = new URLSearchParams(baseParams)
          params.set('visited_tags', tagSignals)
          stages.push(params)
        }
        if (attributeSignals) {
          const params = new URLSearchParams(baseParams)
          params.set('visited_attributes', attributeSignals)
          stages.push(params)
        }

        for (const params of stages) {
          if (related.length >= MAX_RELATED) break
          const items = await fetchRelatedBatch(params)
          const mapped = items
            .map(mapApiProduct)
            .filter(Boolean)
            .filter((item: any) => item.slug !== product.slug)
          for (const item of mapped) {
            if (related.length >= MAX_RELATED) break
            const slug = String(item.slug || '')
            if (!slug || seen.has(slug)) continue
            seen.add(slug)
            related.push(item)
          }
        }

        if (!isActive) return
        setRelatedProducts(related)
      } catch (_error) {
        if (!isActive) return
        setRelatedProducts([])
      }
    }
    loadRelated()
    return () => {
      isActive = false
    }
  }, [product])

  useEffect(() => {
    if (!product) return
    const variantParam = searchParams.get('variant')
    const colorParam = searchParams.get('color')
    const sizeParam = searchParams.get('size')

    if (colorParam && product.colors?.includes(colorParam)) {
      setSelectedColor(colorParam)
    }

    if (sizeParam && product.sizes?.includes(sizeParam)) {
      setSelectedSize(sizeParam)
    }

    if (variantParam && product.variations?.length) {
      const matched = product.variations.find(
        (variation: any) => String(variation.id) === variantParam
      )
      if (matched) {
        setSelectedVariation(matched)
        setCurrentImage(matched.image)
        setVariationError('')
      }
    }
  }, [product, searchParams])

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth < 1024)
    updateIsMobile()
    window.addEventListener('resize', updateIsMobile)
    return () => window.removeEventListener('resize', updateIsMobile)
  }, [])

  useEffect(() => {
    if (!isMobile || !addToCartRef.current) {
      setShowFloatingCart(false)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFloatingCart(entry.intersectionRatio < 0.6)
      },
      { threshold: [0, 0.6, 1] }
    )

    observer.observe(addToCartRef.current)
    return () => observer.disconnect()
  }, [isMobile])

  useEffect(() => {
    if (isMobile) return
    if (!product) return

    const sectionEl = sectionRef.current
    const pinEl = rightPinRef.current
    const spacerEl = rightSpacerRef.current
    const rightCol = rightColumnRef.current
    if (!sectionEl || !pinEl || !spacerEl || !rightCol) return

    let frameId = 0
    const headerOffset = 96

    const update = () => {
      const scrollY = window.scrollY
      const sectionRect = sectionEl.getBoundingClientRect()
      const rightRect = rightCol.getBoundingClientRect()
      const sectionTop = sectionRect.top + scrollY
      const sectionBottom = sectionRect.bottom + scrollY
      const pinHeight = pinEl.offsetHeight
      const maxTop = Math.max(0, sectionBottom - pinHeight - sectionTop)
      const shouldPin = scrollY + headerOffset >= sectionTop
      const shouldUnpinBottom =
        scrollY + headerOffset >= sectionBottom - pinHeight

      spacerEl.style.height = `${pinHeight}px`
      rightCol.style.minHeight = `${pinHeight}px`

      if (!shouldPin) {
        pinEl.style.position = 'absolute'
        pinEl.style.top = '0px'
        pinEl.style.left = '0px'
        pinEl.style.width = '100%'
        pinEl.style.zIndex = '1'
        return
      }

      if (shouldUnpinBottom) {
        pinEl.style.position = 'absolute'
        pinEl.style.top = `${maxTop}px`
        pinEl.style.left = '0px'
        pinEl.style.width = '100%'
        pinEl.style.zIndex = '1'
        return
      }

      pinEl.style.position = 'fixed'
      pinEl.style.top = `${headerOffset}px`
      pinEl.style.left = `${rightRect.left}px`
      pinEl.style.width = `${rightRect.width}px`
      pinEl.style.zIndex = '10'
    }

    const onScroll = () => {
      if (frameId) return
      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        update()
      })
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frameId) window.cancelAnimationFrame(frameId)
    }
  }, [isMobile, product])

  useEffect(() => {
    if (!product) {
      setShowSeeMore(false)
      return
    }

    if (activeTab !== 'details') {
      setShowSeeMore(false)
      return
    }

    const description =
      product.fullDescription ||
      product.shortDescription ||
      `Elevate your ${product.category.toLowerCase()} collection with the ${
        product.name
      }. Crafted with comfort and durability in mind, this piece balances style and everyday performance.`

    let animationFrame: number | null = null

    const measureOverflow = () => {
      if (!descriptionRef.current) {
        setShowSeeMore(false)
        return
      }

      const el = descriptionRef.current
      const hasOverflow = el.scrollHeight > el.clientHeight + 1
      setShowSeeMore(hasOverflow)
    }

    animationFrame = window.requestAnimationFrame(measureOverflow)
    window.addEventListener('resize', measureOverflow)

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame)
      }
      window.removeEventListener('resize', measureOverflow)
    }
  }, [activeTab, product])

  useEffect(() => {
    if (isSelectionComplete && shakeKeys.length) {
      setShakeKeys([])
    }
  }, [isSelectionComplete, shakeKeys.length])

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    )
  }

  const discountPercentage =
    product.originalPrice && product.price < product.originalPrice
      ? Math.max(
          1,
          Math.round(
            ((product.originalPrice - product.price) / product.originalPrice) * 100
          )
        )
      : null

  const handleAddToCart = () => {
    if (!isSelectionComplete) {
      setShakeKeys(['__all__'])
      setVariationError('Select a variation to continue.')
      setTimeout(() => setShakeKeys([]), 650)
      return
    }
    addItem(
      {
        ...product,
        selectedColor,
        selectedSize,
        selectedAttributes: selectionMap,
        image: selectedVariation?.image || product.image,
        price: selectedVariation?.price || product.price,
        originalPrice: selectedVariation?.originalPrice || product.originalPrice,
        selectedVariationId: selectedVariation?.id,
        selectedVariationLabel: selectedVariation?.label,
      },
      1
    )
  }

  const handleIncrementQuantity = () => {
    if (!isSelectionComplete) {
      setShakeKeys(['__all__'])
      setVariationError('Select a variation to continue.')
      setTimeout(() => setShakeKeys([]), 650)
      return
    }
    if (cartEntry?.key) {
      updateQuantity(cartEntry.key, cartQuantity + 1)
    } else {
      handleAddToCart()
    }
  }

  const handleDecrementQuantity = () => {
    if (cartEntry?.key) {
      updateQuantity(cartEntry.key, Math.max(0, cartQuantity - 1))
    }
  }

  const shortDescription = product.shortDescription ?? ''
  const fullDescription = product.fullDescription ?? ''
  const stockRemaining = product.stockRemaining ?? product.stock ?? 0
  const sku = product.sku || 'N/A'
  const material = product.material || 'Premium Mixed Materials'
  const dimensions = product.dimensions || '10 x 6 x 3 in'
  const shippingEstimate = product.shippingEstimate || 'Ships in 3-5 business days'
  const tags = product.tags || []
  const activePrice = selectedVariation?.price ?? product.price
  const activeOriginalPrice =
    selectedVariation?.originalPrice ?? product.originalPrice
  const activeImage = currentImage || selectedVariation?.image || product.image
  const sizeRange = product.sizes?.length ? product.sizes.join(', ') : 'One size'
  const rawCategorySlug = product.categorySlug || product.category || ''
  const categorySlug = encodeURIComponent(
    slugifyCategory(String(rawCategorySlug)),
  )
  const cartSelection = {
    id: product.id,
    selectedVariationId: selectedVariation?.id,
    selectedColor,
    selectedSize,
  }
  const cartEntry = findCartEntry(items, cartSelection)
  const cartQuantity = cartEntry?.quantity || 0

  const tabs = [
    {
      id: 'details',
      label: 'Product Details',
      content: fullDescription,
    },
    {
      id: 'packaging',
      label: 'Packaging',
      content: 'Ships in protective packaging with extra padding to keep it safe in transit.',
    },
    {
      id: 'shipping',
      label: 'Shipping Information',
      content: `${shippingEstimate}. Express options available at checkout.`,
    },
  ]
  const activeTabData = tabs.find((tab) => tab.id === activeTab)

  return (
    <div className='min-h-screen flex overflow-x-hidden'>
      <div className='flex-1 min-w-0'>
        <main className='lg:pl-16 min-h-screen bg-white overflow-x-hidden w-full'>
          <div className='main-container py-0'>
              <div className='pt-2 sm:pt-0'>
                <Breadcrumb
                  items={[
                    { label: 'Catalogue', href: '/' },
                    { label: product.category, href: `/products/${categorySlug}` },
                    { label: product.name },
                  ]}
                  rightAction={{
                    ariaLabel: 'Report This Product',
                    icon: (
                      <svg
                        className='h-4 w-4'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={1.8}
                          d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                        />
                      </svg>
                    ),
                  }}
                />
              </div>
            <div className='bg-white rounded-2xl shadow-sm border border-gray-100'>
              <div
                ref={sectionRef}
                className='grid lg:grid-cols-[640px_1fr] lg:items-stretch'
              >
                {/* Left side - Images */}
                <div ref={leftColumnRef} className='space-y-6 lg:pr-6'>
                  <div className='h-px w-full' />
                  <Gallery
                    images={product.gallery}
                    currentImage={activeImage}
                    setCurrentImage={setCurrentImage}
                    productName={product.name}
                    badgeText={
                      discountPercentage ? `-${discountPercentage}%` : null
                    }
                    mainImageRef={galleryMainRef}
                  />
                  {!isMobile && (
                    <CustomerReviews
                      data={
                        customerReviewsByProductId[product.id] ||
                        customerReviewsData
                      }
                    />
                  )}
                </div>

                {/* Right side - Product info */}
                <div
                  ref={rightColumnRef}
                  className='relative p-6 border-t border-gray-100 lg:border-t-0 lg:border-l overflow-x-hidden'
                >
                  <div ref={rightSpacerRef} />
                  <div
                    ref={rightPinRef}
                    className='space-y-6 no-scrollbar overflow-x-hidden lg:sticky lg:top-6'
                    style={
                      isMobile
                        ? undefined
                        : {
                            maxHeight: 'calc(100vh - 96px)',
                            overflowY: 'auto',
                          }
                    }
                  >
                  <div className='flex items-center justify-between'>
                    <span className='text-xs font-semibold uppercase tracking-wide bg-gray-100 text-gray-700 px-3 py-1 rounded-full'>
                      {product.category}
                    </span>
                    <button className='flex items-center gap-2 text-xs font-medium text-gray-600 border border-gray-200 px-3 py-2 rounded-full hover:bg-gray-50 transition'>
                      <svg
                        className='h-4 w-4'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={1.8}
                          d='M12 3v12m0-12l-4 4m4-4l4 4M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6'
                        />
                      </svg>
                      Share
                    </button>
                  </div>

                  <div className='space-y-3'>
                    <h1 className='text-3xl font-semibold text-gray-900 font-serif'>
                      {product.name}
                    </h1>
                    <div className='flex items-center gap-3 text-sm text-gray-600'>
                      <div className='flex items-center gap-2'>
                        <StarRating rating={product.rating} />
                        <span className='font-medium text-gray-800'>
                          {product.rating}
                        </span>
                      </div>
                      <span>{product.reviews} reviews</span>
                      <span className='text-green-600'>
                        {stockRemaining} in stock
                      </span>
                    </div>
                    <p className='text-sm text-gray-600 leading-relaxed'>
                      {shortDescription}
                    </p>
                    <div className='text-xs text-gray-500'>SKU: {sku}</div>
                    {tags.length > 0 && (
                      <div className='flex flex-wrap gap-2 pt-1'>
                        {tags.map((tag: string) => (
                          <span
                            key={tag}
                            className='text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600'
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className='flex items-center gap-4'>
                    <span className='text-3xl font-semibold text-gray-900'>
                      ${activePrice}
                    </span>
                    {activeOriginalPrice && (
                      <span className='text-lg text-gray-400 line-through'>
                        ${activeOriginalPrice}
                      </span>
                    )}
                    {discountPercentage && (
                      <span className='text-xs font-semibold text-white bg-red-500 px-2.5 py-1 rounded-full'>
                        {discountPercentage}% off
                      </span>
                    )}
                  </div>

                  <div
                    className={`border-t border-gray-200 pt-3 space-y-3 ${
                      shakeKeys.length ? 'ring-1 ring-rose-400/70 rounded-2xl' : ''
                    }`}
                  >
                    <style jsx global>{`
                      @keyframes oc-shake {
                        0% { transform: translateX(0); }
                        20% { transform: translateX(-6px); }
                        40% { transform: translateX(6px); }
                        60% { transform: translateX(-4px); }
                        80% { transform: translateX(4px); }
                        100% { transform: translateX(0); }
                      }
                      .oc-shake {
                        animation: oc-shake 0.45s ease-in-out;
                      }
                    `}</style>
                    {hasCompleteVariationImages && colorVariationCards.length > 0 && (
                      <div className={`space-y-2 ${shakeKeys.length ? 'oc-shake' : ''}`}>
                        <div className='text-sm font-semibold text-gray-900'>
                          Variations
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          {colorVariationCards.map((variation: any) => {
                            const isSelected =
                              Boolean(variation?.color) &&
                              String(selectedColor) === String(variation.color)
                            return (
                              <button
                                key={variation.id}
                                type='button'
                                onClick={() => {
                                  if (variation?.color) {
                                    setSelectedColor(variation.color)
                                  }
                                  setSelectedSize('')
                                  setSelectedAttributes({})
                                  setSelectedVariation(null)
                                  setCurrentImage(variation.image || product.image)
                                  setVariationError('')
                                }}
                                className={`w-[104px] text-left border rounded-lg p-0.5 transition ${
                                  isSelected
                                    ? 'border-blue-500 ring-2 ring-blue-200'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className='h-[110px] w-full rounded-md overflow-hidden bg-gray-100 relative'>
                                  <Image
                                    src={variation.image}
                                    alt={variation.label}
                                    fill
                                    sizes='110px'
                                    className='object-cover'
                                  />
                                </div>
                                <div className='pt-1 text-[11px] font-semibold text-gray-900 truncate'>
                                  {variation.color || variation.label}
                                </div>
                                <div className='text-[10px] font-semibold text-gray-900'>
                                  ${variation.price}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {((!hasCompleteVariationImages && (colorOptions.length > 0 || sizeOptions.length > 0)) ||
                      (hasCompleteVariationImages && sizeOptions.length > 0)) && (
                      <div className={`grid gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 ${shakeKeys.length ? 'oc-shake' : ''}`}>
                        <div className='flex flex-wrap items-start gap-4'>
                          {!hasCompleteVariationImages && (
                            <div className='flex-1 min-w-[220px]'>
                              <div className='text-[11px] uppercase tracking-wide text-gray-500 mb-2'>
                                Color
                              </div>
                              <div className='flex flex-wrap gap-2'>
                                {colorOptions.map((color: string) => {
                                  const isAvailable = isOptionAvailable('color', String(color))
                                  return (
                                  <button
                                    key={color}
                                    type='button'
                                    disabled={!isAvailable}
                                    onClick={() => {
                                      if (!isAvailable) return
                                      setSelectedColor((prev) =>
                                        String(prev) === String(color) ? '' : String(color),
                                      )
                                    }}
                                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${
                                      selectedColor === color
                                        ? 'border-gray-900 text-gray-900'
                                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                                    } ${!isAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    aria-pressed={selectedColor === color}
                                  >
                                    <span
                                      className='h-3 w-3 rounded-full border border-gray-300'
                                      style={getSwatchStyle(color)}
                                    />
                                    <span className='capitalize'>{color}</span>
                                  </button>
                                )
                                })}
                                {!colorOptions.length && (
                                  <span className='text-xs text-gray-400'>
                                    —
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          <div className='flex-1 min-w-[220px]'>
                            <div className='text-[11px] uppercase tracking-wide text-gray-500 mb-2'>
                              Size
                            </div>
                            <div className='flex flex-wrap gap-2'>
                              {sizeOptions.map((size: string) => {
                                const isAvailable = isOptionAvailable('size', String(size))
                                return (
                                <button
                                  key={size}
                                  disabled={!isAvailable}
                                  className={`rounded-full border px-3 py-1 text-xs transition ${
                                    selectedSize === size
                                      ? 'border-gray-900 bg-gray-900 text-white'
                                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                                  } ${!isAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
                                  onClick={() => {
                                    if (!isAvailable) return
                                    setSelectedSize((prev) =>
                                      String(prev) === String(size) ? '' : String(size),
                                    )
                                  }}
                                >
                                  {size}
                                </button>
                                )
                              })}
                              {!sizeOptions.length && (
                                <span className='text-xs text-gray-400'>
                                  —
                                </span>
                              )}
                            </div>
                          </div>
                          {extraAttributeOptions.map((attribute) => (
                            <div key={attribute.key} className='flex-1 min-w-[220px]'>
                              <div className='text-[11px] uppercase tracking-wide text-gray-500 mb-2'>
                                {attribute.label}
                              </div>
                              <div className='flex flex-wrap gap-2'>
                                {attribute.options.map((option) => {
                                  const isAvailable = isOptionAvailable(attribute.key, String(option))
                                  const isSelected = selectionMap[attribute.key] === option
                                  return (
                                  <button
                                    key={`${attribute.key}-${option}`}
                                    disabled={!isAvailable}
                                    className={`rounded-full border px-3 py-1 text-xs transition ${
                                      isSelected
                                        ? 'border-gray-900 bg-gray-900 text-white'
                                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                                    } ${!isAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    onClick={() => {
                                      if (!isAvailable) return
                                      setSelectedAttributes((prev) => {
                                        const next = { ...prev }
                                        if (String(prev[attribute.key]) === String(option)) {
                                          delete next[attribute.key]
                                          return next
                                        }
                                        next[attribute.key] = String(option)
                                        return next
                                      })
                                    }}
                                  >
                                    {String(option)}
                                  </button>
                                  )
                                })}
                                {!attribute.options.length && (
                                  <span className='text-xs text-gray-400'>
                                    —
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    ref={addToCartRef}
                    className='sticky bottom-0 -mx-6 bg-white/90 px-6 py-3 backdrop-blur border-t border-gray-100 shadow-[0_-8px_20px_rgba(0,0,0,0.05)]'
                  >
                    <div className='pointer-events-none absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-white/90 to-transparent' />
                    <div className='flex items-center gap-3 relative'>
                      {cartQuantity > 0 ? (
                        <QuantityControl
                          quantity={cartQuantity}
                          onIncrement={handleIncrementQuantity}
                          onDecrement={handleDecrementQuantity}
                          size='md'
                          fullWidth
                          isLoading={Boolean(cartEntry?.isSyncing)}
                        />
                      ) : (
                        <button
                          onClick={handleAddToCart}
                          aria-disabled={!isSelectionComplete}
                          className={`flex-1 bg-amber-400 text-gray-900 font-semibold py-3 rounded-full transition ${
                            !isSelectionComplete
                              ? 'opacity-80'
                              : 'hover:bg-amber-300'
                          }`}
                        >
                          {addToCartLabel}
                        </button>
                      )}
                      <button
                        type='button'
                        className='w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition'
                      >
                        <svg
                          className='h-5 w-5'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={1.8}
                            d='M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z'
                          />
                        </svg>
                      </button>
                    </div>
                    {variationError && (
                      <p className='mt-2 text-xs text-rose-600'>{variationError}</p>
                    )}
                  </div>
                  <div className='bg-gray-100 rounded-full p-1 flex items-center gap-2 text-xs'>
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 px-3 py-2 rounded-full transition ${
                          activeTab === tab.id
                            ? 'bg-white shadow-sm text-gray-900 font-semibold'
                            : 'text-gray-600'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className='relative'>
                    <p
                      ref={descriptionRef}
                      className={`text-sm text-gray-600 leading-relaxed ${
                        activeTab === 'details' ? 'max-h-24 overflow-hidden' : ''
                      }`}
                    >
                      {activeTabData?.content}
                    </p>
                    {showSeeMore && (
                      <>
                        <div className='pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent' />
                        <div className='mt-2 flex justify-center'>
                          <button
                            onClick={() => setShowDetailsModal(true)}
                            className='text-xs font-semibold text-gray-800 hover:text-gray-900 transition'
                          >
                            See more &gt;
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className='grid gap-3 sm:grid-cols-2'>
                    <div className='border border-gray-200 rounded-xl p-4 text-sm'>
                      <div className='font-semibold text-gray-900 mb-2'>
                        Size & Fit
                      </div>
                      <div className='flex justify-between text-gray-600'>
                        <span>Range</span>
                        <span>{sizeRange}</span>
                      </div>
                      <div className='flex justify-between text-gray-600 mt-2'>
                        <span>Dimensions</span>
                        <span>{dimensions}</span>
                      </div>
                    </div>
                    <div className='border border-gray-200 rounded-xl p-4 text-sm'>
                      <div className='font-semibold text-gray-900 mb-2'>
                        Material
                      </div>
                      <div className='flex justify-between text-gray-600'>
                        <span>Material</span>
                        <span>{material}</span>
                      </div>
                      <div className='flex justify-between text-gray-600 mt-2'>
                        <span>Shipping</span>
                        <span>{shippingEstimate}</span>
                      </div>
                    </div>
                  </div>

                  {isMobile && (
                    <CustomerReviews
                      data={
                        customerReviewsByProductId[product.id] ||
                        customerReviewsData
                      }
                    />
                  )}
                  <AboutStoreCard
                    vendor={product.vendor}
                    rating={product.vendorRating}
                    followers={product.vendorFollowers}
                    soldCount={product.vendorSoldCount}
                    itemsCount={product.vendorItemsCount}
                    badge={product.vendorBadge}
                    avatarUrl={product.image}
                  />
                  <ShippingInfoCard shippingEstimate={shippingEstimate} />
                  </div>
                  </div>
                </div>
              </div>
              <RelatedProductsSection
                items={relatedProducts}
                seeAllHref={categorySlug ? `/products/${categorySlug}` : undefined}
              />
              <RecentlyViewedSection currentSlug={product.slug} />
            </div>
        </main>
      </div>

      {showFloatingCart && (
        <div className='lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-6px_20px_rgba(0,0,0,0.08)]'>
          <div className='flex items-center gap-3'>
            <div className='text-sm text-gray-600'>
              <div className='text-xs uppercase tracking-wide text-gray-400'>
                Price
              </div>
              <div className='text-lg font-semibold text-gray-900'>
                ${activePrice}
              </div>
            </div>
            {cartQuantity > 0 ? (
              <QuantityControl
                quantity={cartQuantity}
                onIncrement={handleIncrementQuantity}
                onDecrement={handleDecrementQuantity}
                size='md'
                fullWidth
                isLoading={Boolean(cartEntry?.isSyncing)}
              />
            ) : (
              <button
                onClick={handleAddToCart}
                aria-disabled={!isSelectionComplete}
                className={`flex-1 bg-amber-400 text-gray-900 font-semibold py-3 rounded-full transition ${
                  !isSelectionComplete ? 'opacity-80' : 'hover:bg-amber-300'
                }`}
              >
                {addToCartLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {showDetailsModal && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowDetailsModal(false)
            }
          }}
        >
          <div className='w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-semibold text-gray-900'>
                {activeTabData?.label}
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className='rounded-full p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition'
                aria-label='Close'
              >
                ✕
              </button>
            </div>
            <p className='mt-4 text-sm text-gray-600 leading-relaxed whitespace-pre-line'>
              {activeTabData?.content}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProductPageWrapper(
  props: { params: Promise<{ slug: string }> }
) {
  return <ProductContent {...props} />
}
