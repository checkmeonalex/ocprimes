'use client'
import { useEffect, useMemo, useRef, useState, use, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getSwatchStyle } from '../../../components/product/colorUtils.mjs'
import StarRating from '../../../components/product/StarRating'
import Gallery from '../../../components/product/ProductDetails/gallery'
import Breadcrumb from '../../../components/Breadcrumb'
import ShippingInfoCard from '../../../components/product/ShippingInfoCard'
import AboutStoreCard from '../../../components/product/AboutStoreCard'
import CustomerReviews from '../../../components/product/CustomerReviews'
import { useCart } from '../../../context/CartContext'
import RelatedProductsSection from '../../../components/product/RelatedProductsSection'
import { findCartEntry } from '../../../lib/cart/cart-match'
import RecentlyViewedSection from '../../../components/product/RecentlyViewedSection'
import { addRecentlyViewed } from '../../../lib/recently-viewed/storage'
import ShareProductModal from '../../../components/product/ShareProductModal'
import CartQuantitySelect from '../../../components/cart/CartQuantitySelect'
import ProductFloatingDock from '../../../components/product/ProductFloatingDock'
import SellerChatPopup from '../../../components/product/SellerChatPopup'
import {
  DeferredSectionLoader,
  RelatedProductsSkeleton,
} from '../../../components/product/ProductDeferredSection'
import { useWishlist } from '../../../context/WishlistContext'

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

const buildCategoryHref = (slugOrName: string) => {
  const normalized = slugifyCategory(slugOrName)
  return normalized ? `/products/${encodeURIComponent(normalized)}` : '/products'
}

const CONDITION_COPY: Record<string, { label: string; details: string }> = {
  brand_new: {
    label: 'Brand New',
    details:
      'This product is brand new, unused, and shipped directly from the manufacturer or authorized source.',
  },
  like_new: {
    label: 'Like New',
    details:
      'This product is in excellent condition with minimal signs of handling and full functionality.',
  },
  open_box: {
    label: 'Open Box',
    details:
      'This product was opened for inspection but remains unused and fully functional with complete quality checks.',
  },
  refurbished: {
    label: 'Refurbished',
    details:
      'This product has been professionally restored, tested, and verified to meet performance standards.',
  },
  handmade: {
    label: 'Handmade',
    details:
      'This product is crafted by hand by the seller or maker, with unique finishing and artisanal character.',
  },
  okx: {
    label: 'OKX',
    details:
      'This product is imported through trusted international supply channels and quality-checked before listing.',
  },
}

const RETURN_POLICY_COPY: Record<string, { label: string; details: string }> = {
  not_returnable: {
    label: 'Not Returnable',
    details: 'This product is final sale and cannot be returned after purchase.',
  },
  support_return: {
    label: 'Support Return',
    details:
      'This product supports returns under our return window and policy guidelines.',
  },
}

const PACKAGING_STYLE_COPY: Record<string, { label: string; details: string }> = {
  in_wrap_nylon: {
    label: 'In Wrap Nylon',
    details:
      'Packed securely in protective nylon wrap to reduce dust and moisture exposure.',
  },
  in_a_box: {
    label: 'In a Box',
    details: 'Packed in a standard shipping box for stable protection during delivery.',
  },
  premium_gift_packaging: {
    label: 'Premium / Gift Packaging',
    details: 'Packed in premium presentation packaging suitable for gifting.',
  },
  cardboard_wrap: {
    label: 'Cardboard Wrap',
    details:
      'Wrapped with reinforced cardboard layers for practical transit protection.',
  },
}

const PACKAGING_IMAGE_BY_STYLE: Record<string, string> = {
  in_wrap_nylon: '/images/packaging/preview3.png',
  in_a_box: '/images/packaging/preview1.png',
  premium_gift_packaging: '/images/packaging/preview4.png',
  cardboard_wrap: '/images/packaging/preview2.png',
}

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

const hasMeaningfulRichText = (input: string) =>
  String(input || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim().length > 0

const fetchRelatedBatch = async (params: URLSearchParams) => {
  const response = await fetch(`/api/products?${params.toString()}`, {
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null)
  return Array.isArray(payload?.items) ? payload.items : []
}

const createEmptyReviewData = () => ({
  summary: {
    rating: 0,
    totalReviews: 0,
    wouldRecommendPercent: 0,
    wouldRecommendCount: 0,
    verifiedBy: 'OCPRIMES',
  },
  breakdown: [
    { stars: 5, count: 0 },
    { stars: 4, count: 0 },
    { stars: 3, count: 0 },
    { stars: 2, count: 0 },
    { stars: 1, count: 0 },
  ],
  reviews: [],
  canWriteReview: false,
})

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
  const rawTags = Array.isArray(item.tags)
    ? item.tags
    : Array.isArray(item.admin_tags)
      ? item.admin_tags
      : []
  const fallbackTagNames = Array.isArray(item.tag_names) ? item.tag_names : []
  const normalizedTagLinks = [
    ...rawTags.map((tag: any) => {
      if (typeof tag === 'string') {
        const name = String(tag || '').trim()
        if (!name) return null
        return {
          name,
          slug: slugifyCategory(name),
        }
      }
      const nested = tag?.admin_tags && typeof tag.admin_tags === 'object' ? tag.admin_tags : null
      const source = nested || tag
      const name = String(source?.name || '').trim()
      if (!name) return null
      const slug = String(source?.slug || slugifyCategory(name)).trim()
      if (!slug) return null
      return { name, slug }
    }),
    ...fallbackTagNames.map((value: any) => {
      const name = String(value || '').trim()
      if (!name) return null
      return {
        name,
        slug: slugifyCategory(name),
      }
    }),
  ]
    .filter(Boolean)
    .filter((tag: any, index: number, list: any[]) => {
      const key = `${String(tag.slug || '').toLowerCase()}::${String(tag.name || '').toLowerCase()}`
      return list.findIndex((entry: any) => {
        const compareKey = `${String(entry?.slug || '').toLowerCase()}::${String(entry?.name || '').toLowerCase()}`
        return compareKey === key
      }) === index
    })
  const images = Array.isArray(item.images) ? item.images : []
  const imageUrls = images.map((image) => image?.url).filter(Boolean)
  const videoUrl = String(item.product_video_url || '').trim()
  const basePrice = Number(item.price) || 0
  const discountPrice = Number(item.discount_price) || 0
  const hasDiscount = discountPrice > 0 && discountPrice < basePrice
  const displayPrice = hasDiscount ? discountPrice : basePrice
  const primaryCategory = Array.isArray(item.categories) ? item.categories[0] : null
  const primaryBrand = Array.isArray(item.brands) ? item.brands[0] : null
  const vendorProfile = item.vendor_profile || null
  const resolvedVendorName = String(
    primaryBrand?.name || vendorProfile?.name || item?.vendor || item?.vendor_name || '',
  ).trim()
  const resolvedVendorSlug = String(
    primaryBrand?.slug || vendorProfile?.slug || item?.vendor_slug || item?.vendorSlug || '',
  ).trim()
  const fallbackImage = item.image_url || imageUrls[0] || ''
  const galleryMedia = []
  if (videoUrl) {
    galleryMedia.push({
      type: 'video',
      url: videoUrl,
      poster: fallbackImage || '',
    })
  }
  imageUrls.forEach((url) => {
    galleryMedia.push({ type: 'image', url })
  })
  if (!galleryMedia.length && fallbackImage) {
    galleryMedia.push({ type: 'image', url: fallbackImage })
  }
  const categorySlug = primaryCategory?.slug || slugifyCategory(primaryCategory?.name)
  const primaryCategoryPath = Array.isArray(item.primary_category_path)
    ? item.primary_category_path
        .map((segment: any) => {
          const label = String(segment?.label || segment?.name || '').trim()
          if (!label) return null
          const source = String(segment?.slug || label)
          return {
            label,
            href: String(segment?.href || buildCategoryHref(source)),
          }
        })
        .filter(Boolean)
    : []

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
    createdAt: item.created_at || null,
    category: primaryCategory?.name || 'Uncategorized',
    categorySlug,
    categoryPath: primaryCategoryPath,
    vendor: resolvedVendorName || 'Seller',
    vendorSlug: resolvedVendorSlug,
    vendorRating: Math.max(0, Number(vendorProfile?.rating ?? item.rating) || 0),
    vendorFollowers: Math.max(0, Number(vendorProfile?.followers) || 0),
    vendorSoldCount: Math.max(0, Number(vendorProfile?.sold) || 0),
    vendorItemsCount: Math.max(0, Number(vendorProfile?.items) || 0),
    vendorBadge: String(vendorProfile?.badge || '').trim(),
    vendorLogoUrl: String(vendorProfile?.logo_url || primaryBrand?.logo_url || '').trim(),
    vendorFont: 'Georgia, serif',
    shortDescription: item.short_description || '',
    fullDescription: item.description || '',
    sku: item.sku || '',
    conditionCheck: String(item.condition_check || ''),
    packagingStyle: String(item.packaging_style || 'in_wrap_nylon'),
    returnPolicy: String(item.return_policy || 'not_returnable'),
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
    video: videoUrl,
    galleryMedia,
    stock: Number.isFinite(Number(item.stock_quantity)) ? Number(item.stock_quantity) : 0,
    tags: normalizedTagLinks.map((tag: any) => tag?.name).filter(Boolean),
    tagLinks: normalizedTagLinks,
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
  const [isInlineAddToCartVisible, setIsInlineAddToCartVisible] = useState(false)
  const [showFloatingDock, setShowFloatingDock] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileGalleryVisible, setIsMobileGalleryVisible] = useState(false)
  const [showSellerChat, setShowSellerChat] = useState(false)
  const [selectedVariation, setSelectedVariation] = useState<any>(null)
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({})
  const [shakeKeys, setShakeKeys] = useState<string[]>([])
  const [showSelectionErrors, setShowSelectionErrors] = useState(false)
  const [variationError, setVariationError] = useState('')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showSeeMore, setShowSeeMore] = useState(false)
  const [showAllTags, setShowAllTags] = useState(false)
  const [showConditionInfo, setShowConditionInfo] = useState(false)
  const [showReturnInfo, setShowReturnInfo] = useState(false)
  const [pendingQuantity, setPendingQuantity] = useState(1)
  const [reviewData, setReviewData] = useState<any>(createEmptyReviewData())
  const [reviewReloadKey, setReviewReloadKey] = useState(0)
  const [shouldLoadReviews, setShouldLoadReviews] = useState(false)
  const [shouldLoadRelated, setShouldLoadRelated] = useState(false)
  const [isReviewsLoading, setIsReviewsLoading] = useState(false)
  const [isRelatedLoading, setIsRelatedLoading] = useState(false)
  const { addItem, items, updateQuantity } = useCart()
  const { openSaveModal, isRecentlySaved } = useWishlist()
  const searchParams = useSearchParams()
  const addToCartRef = useRef<HTMLDivElement | null>(null)
  const galleryMainRef = useRef<HTMLDivElement | null>(null)
  const conditionInfoRef = useRef<HTMLDivElement | null>(null)
  const returnInfoRef = useRef<HTMLDivElement | null>(null)
  const productContentAreaRef = useRef<HTMLDivElement | null>(null)
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const rightColumnRef = useRef<HTMLDivElement | null>(null)
  const rightPinRef = useRef<HTMLDivElement | null>(null)
  const rightSpacerRef = useRef<HTMLDivElement | null>(null)
  const leftColumnRef = useRef<HTMLDivElement | null>(null)
  const mobileGallerySectionRef = useRef<HTMLDivElement | null>(null)
  const reviewsTriggerRef = useRef<HTMLDivElement | null>(null)
  const relatedTriggerRef = useRef<HTMLDivElement | null>(null)
  const descriptionRef = useRef<HTMLDivElement | null>(null)
  const variationSectionRef = useRef<HTMLDivElement | null>(null)
  const cartSelectionHydratedRef = useRef<string | null>(null)
  const handleReviewSubmitted = useCallback(() => {
    setShouldLoadReviews(true)
    setReviewReloadKey((prev) => prev + 1)
  }, [])

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
  const hasSelectionConflict = useCallback(
    (nextSelectionMap: Record<string, string>) => {
      if (!normalizedVariations.length) return false
      return Object.entries(nextSelectionMap).some(([key, value]) => {
        if (!value) return false
        return !normalizedVariations.some(({ attrs }) => {
          if (attrs[key] !== value) return false
          return Object.entries(nextSelectionMap).every(([selKey, selValue]) => {
            if (!selValue || selKey === key) return true
            return attrs[selKey] === selValue
          })
        })
      })
    },
    [normalizedVariations],
  )
  const requiresColor = attributeOptions.some((item) => item.key === 'color')
  const requiresSize = attributeOptions.some((item) => item.key === 'size')
  const requiresExtras = extraAttributeOptions.map((item) => item.key)
  const requiredSelectionKeys = useMemo(
    () => attributeOptions.map((item) => item.key),
    [attributeOptions],
  )
  const missingSelectionKeys = useMemo(
    () => requiredSelectionKeys.filter((key) => !selectionMap[key]),
    [requiredSelectionKeys, selectionMap],
  )
  const missingSelectionKeySet = useMemo(
    () => new Set(missingSelectionKeys),
    [missingSelectionKeys],
  )
  const attributeLabelByKey = useMemo(
    () => new Map(attributeOptions.map((item) => [item.key, item.label])),
    [attributeOptions],
  )
  const getSelectionErrorMessage = useCallback(
    (key: string) => {
      const fallback = key.replace(/[_-]+/g, ' ')
      const label = String(attributeLabelByKey.get(key) || fallback)
        .trim()
        .toLowerCase()
      const article = /^[aeiou]/.test(label) ? 'an' : 'a'
      return `Select ${article} ${label}.`
    },
    [attributeLabelByKey],
  )
  const hasMatchingSelection = useMemo(() => {
    if (!variationList.length) return true
    const requiredKeys = attributeOptions.map((item) => item.key)
    const isComplete = requiredKeys.every((key) => Boolean(selectionMap[key]))
    if (!isComplete) return false
    return normalizedVariations.some(({ attrs }) =>
      requiredKeys.every((key) => attrs[key] === selectionMap[key]),
    )
  }, [attributeOptions, normalizedVariations, selectionMap, variationList.length])
  const isSelectionComplete =
    (!variationList.length ||
      (!requiresColor || Boolean(selectedColor)) &&
        (!requiresSize || Boolean(selectedSize)) &&
        requiresExtras.every((key) => Boolean(selectionMap[key]))) &&
    hasMatchingSelection
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
    if (!match) {
      setSelectedVariation(null)
      return
    }
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
        setCurrentImage(mapped?.video || mapped?.image || '')
        setSelectedVariation(null)
        setShowSelectionErrors(false)
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
    setShouldLoadReviews(false)
    setShouldLoadRelated(false)
    setIsReviewsLoading(false)
    setIsRelatedLoading(false)
    setReviewData(createEmptyReviewData())
    setRelatedProducts([])
  }, [resolvedParams.slug])

  useEffect(() => {
    if (!product?.id) return
    if (typeof window === 'undefined') return

    const reviewTarget = reviewsTriggerRef.current
    const relatedTarget = relatedTriggerRef.current
    if (!reviewTarget && !relatedTarget) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === reviewTarget && entry.isIntersecting) {
            setShouldLoadReviews(true)
          }
          if (entry.target === relatedTarget && entry.isIntersecting) {
            setShouldLoadRelated(true)
          }
        })
      },
      { root: null, rootMargin: '380px 0px', threshold: 0.01 },
    )

    if (reviewTarget) observer.observe(reviewTarget)
    if (relatedTarget) observer.observe(relatedTarget)

    return () => observer.disconnect()
  }, [product?.id, isMobile])

  useEffect(() => {
    if (!shouldLoadReviews) return
    let isActive = true
    const loadReviews = async () => {
      if (!resolvedParams.slug) {
        setReviewData(createEmptyReviewData())
        return
      }
      try {
        setIsReviewsLoading(true)
        const response = await fetch(
          `/api/products/${encodeURIComponent(resolvedParams.slug)}/reviews?per_page=40`,
          {
            method: 'GET',
            cache: 'no-store',
          },
        )
        const payload = await response.json().catch(() => null)
        if (!isActive) return
        if (!response.ok) {
          setReviewData(createEmptyReviewData())
          return
        }
        const summary = payload?.summary || {}
        const breakdown = Array.isArray(payload?.breakdown)
          ? payload.breakdown
          : createEmptyReviewData().breakdown
        const reviews = Array.isArray(payload?.reviews) ? payload.reviews : []
        const canWriteReview = Boolean(payload?.canWriteReview)
        setReviewData({
          summary: {
            rating: Number(summary?.rating) || 0,
            totalReviews: Number(summary?.totalReviews) || 0,
            wouldRecommendPercent: Number(summary?.wouldRecommendPercent) || 0,
            wouldRecommendCount: Number(summary?.wouldRecommendCount) || 0,
            verifiedBy: String(summary?.verifiedBy || 'OCPRIMES'),
          },
          breakdown,
          reviews,
          canWriteReview,
        })
      } catch (_error) {
        if (!isActive) return
        setReviewData(createEmptyReviewData())
      } finally {
        if (!isActive) return
        setIsReviewsLoading(false)
      }
    }
    loadReviews()
    return () => {
      isActive = false
    }
  }, [resolvedParams.slug, reviewReloadKey, shouldLoadReviews])

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
    if (!shouldLoadRelated) return
    let isActive = true
    const loadRelated = async () => {
      if (!product) {
        setRelatedProducts([])
        return
      }
      try {
        setIsRelatedLoading(true)
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
      } finally {
        if (!isActive) return
        setIsRelatedLoading(false)
      }
    }
    loadRelated()
    return () => {
      isActive = false
    }
  }, [product, shouldLoadRelated])

  useEffect(() => {
    setShowAllTags(false)
  }, [product?.id])

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
    if (!product?.id) return
    cartSelectionHydratedRef.current = null
  }, [product?.id])

  useEffect(() => {
    if (!product?.id) return

    const variantParam = searchParams.get('variant')
    const colorParam = searchParams.get('color')
    const sizeParam = searchParams.get('size')
    const hasExplicitSelection = Boolean(variantParam || colorParam || sizeParam)
    if (hasExplicitSelection) return

    const productEntries = (Array.isArray(items) ? items : []).filter((item: any) => {
      if (!item) return false
      return String(item.id) === String(product.id) && Number(item.quantity || 0) > 0
    })
    if (!productEntries.length) return

    const preferredEntry =
      productEntries.find((item: any) => item.selectedVariationId && item.selectedVariationId !== 'default') ||
      productEntries[0]
    if (!preferredEntry) return

    const hydrationKey = `${product.id}:${preferredEntry.key || ''}:${preferredEntry.quantity || 0}`
    if (cartSelectionHydratedRef.current === hydrationKey) return
    cartSelectionHydratedRef.current = hydrationKey

    const preferredVariationId = String(preferredEntry.selectedVariationId || '')
    const matchedVariation =
      preferredVariationId && preferredVariationId !== 'default'
        ? normalizedVariations.find(({ variation }: any) =>
            String(variation?.id || '') === preferredVariationId,
          )
        : null

    if (matchedVariation) {
      const attrs = matchedVariation.attrs || {}
      const extras: Record<string, string> = {}
      Object.entries(attrs).forEach(([key, value]) => {
        if (!value || key === 'color' || key === 'size') return
        extras[key] = String(value)
      })
      setSelectedColor(String(attrs.color || ''))
      setSelectedSize(String(attrs.size || ''))
      setSelectedAttributes(extras)
      setSelectedVariation(matchedVariation.variation)
      if (matchedVariation.variation?.image) {
        setCurrentImage(matchedVariation.variation.image)
      }
      setVariationError('')
      return
    }

    const normalizedColor =
      preferredEntry.selectedColor && preferredEntry.selectedColor !== 'default'
        ? String(preferredEntry.selectedColor)
        : ''
    const normalizedSize =
      preferredEntry.selectedSize && preferredEntry.selectedSize !== 'default'
        ? String(preferredEntry.selectedSize)
        : ''
    setSelectedColor(normalizedColor)
    setSelectedSize(normalizedSize)
    setSelectedAttributes({})
    setSelectedVariation(null)
    setVariationError('')
  }, [product?.id, normalizedVariations, items, searchParams])

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth < 768)
    updateIsMobile()
    window.addEventListener('resize', updateIsMobile)
    return () => window.removeEventListener('resize', updateIsMobile)
  }, [])

  useEffect(() => {
    if (!addToCartRef.current) {
      setIsInlineAddToCartVisible(false)
      setShowFloatingCart(false)
      return
    }
    const panel = rightPinRef.current
    let frameId = 0

    const measureInlineCartVisibility = () => {
      const anchor = addToCartRef.current
      if (!anchor) {
        setIsInlineAddToCartVisible(false)
        setShowFloatingCart(false)
        return
      }
      const rect = anchor.getBoundingClientRect()
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0
      const visibleTop = Math.max(0, rect.top)
      const visibleBottom = Math.min(viewportHeight, rect.bottom)
      const visibleHeight = Math.max(0, visibleBottom - visibleTop)
      const height = Math.max(1, rect.height)
      const ratio = visibleHeight / height
      const isInlineVisible = ratio > 0.05

      setIsInlineAddToCartVisible(isInlineVisible)
      setShowFloatingCart(isMobile ? ratio < 0.6 : false)
    }

    const scheduleMeasureInlineCartVisibility = () => {
      if (frameId) return
      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        measureInlineCartVisibility()
      })
    }

    scheduleMeasureInlineCartVisibility()
    window.addEventListener('scroll', scheduleMeasureInlineCartVisibility, { passive: true })
    window.addEventListener('resize', scheduleMeasureInlineCartVisibility, { passive: true })
    panel?.addEventListener('scroll', scheduleMeasureInlineCartVisibility, { passive: true })

    return () => {
      window.removeEventListener('scroll', scheduleMeasureInlineCartVisibility)
      window.removeEventListener('resize', scheduleMeasureInlineCartVisibility)
      panel?.removeEventListener('scroll', scheduleMeasureInlineCartVisibility)
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [isMobile, product?.id])

  useEffect(() => {
    const contentArea = productContentAreaRef.current
    if (!contentArea) {
      setShowFloatingDock(false)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFloatingDock(!entry.isIntersecting)
      },
      { threshold: 0.05 },
    )

    observer.observe(contentArea)
    return () => observer.disconnect()
  }, [product?.id])

  useEffect(() => {
    if (isMobile) return
    if (!product) return

    const sectionEl = sectionRef.current
    const pinEl = rightPinRef.current
    const spacerEl = rightSpacerRef.current
    const rightCol = rightColumnRef.current
    if (!sectionEl || !pinEl || !spacerEl || !rightCol) return

    let frameId = 0
    let autoScrollFrameId = 0
    let isAutoScrollingRight = false
    let autoScrollDirection: 'down' | 'up' | null = null
    const headerOffset = 96
    const epsilon = 1
    const autoStepPx = 18
    let previousScrollY = window.scrollY

    const stopAutoScroll = () => {
      if (autoScrollFrameId) {
        window.cancelAnimationFrame(autoScrollFrameId)
        autoScrollFrameId = 0
      }
      isAutoScrollingRight = false
      autoScrollDirection = null
    }

    const update = () => {
      const scrollY = window.scrollY
      const sectionRect = sectionEl.getBoundingClientRect()
      const rightRect = rightCol.getBoundingClientRect()
      const sectionTop = sectionRect.top + scrollY
      const sectionBottom = sectionRect.bottom + scrollY
      const pinHeight = pinEl.offsetHeight
      const maxTop = Math.max(0, sectionBottom - pinHeight - sectionTop)
      const pinStartScrollY = sectionTop - headerOffset
      const pinEndScrollY = sectionBottom - pinHeight - headerOffset
      const pinTravel = Math.max(1, pinEndScrollY - pinStartScrollY)
      const rightMaxScroll = Math.max(0, pinEl.scrollHeight - pinEl.clientHeight)
      const isScrollingUp = scrollY < previousScrollY - epsilon
      const shouldPin = scrollY + headerOffset >= sectionTop
      const shouldUnpinBottom =
        scrollY + headerOffset >= sectionBottom - pinHeight - epsilon

      spacerEl.style.height = `${pinHeight}px`
      rightCol.style.minHeight = `${pinHeight}px`

      if (!shouldPin) {
        stopAutoScroll()
        pinEl.style.position = 'absolute'
        pinEl.style.top = '0px'
        pinEl.style.left = '0px'
        pinEl.style.width = '100%'
        pinEl.style.zIndex = '1'
        previousScrollY = scrollY
        return
      }

      if (shouldUnpinBottom) {
        const canAutoFinishRight =
          rightMaxScroll > 0 && pinEl.scrollTop < rightMaxScroll - epsilon

        if (canAutoFinishRight) {
          // Keep the panel constrained to the section while auto-finishing right scroll.
          pinEl.style.position = 'absolute'
          pinEl.style.top = `${maxTop}px`
          pinEl.style.left = '0px'
          pinEl.style.width = '100%'
          pinEl.style.zIndex = '1'
          if (!isAutoScrollingRight) {
            isAutoScrollingRight = true
            autoScrollDirection = 'down'
            if (Math.abs(window.scrollY - pinEndScrollY) > epsilon) {
              window.scrollTo({ top: pinEndScrollY, behavior: 'auto' })
            }
            const autoStep = () => {
              if (!isAutoScrollingRight || autoScrollDirection !== 'down') return
              pinEl.scrollTop = Math.min(rightMaxScroll, pinEl.scrollTop + autoStepPx)
              if (pinEl.scrollTop >= rightMaxScroll - epsilon) {
                stopAutoScroll()
                return
              }
              autoScrollFrameId = window.requestAnimationFrame(autoStep)
            }
            autoScrollFrameId = window.requestAnimationFrame(autoStep)
          }
          previousScrollY = scrollY
          return
        }

        stopAutoScroll()
        pinEl.style.position = 'absolute'
        pinEl.style.top = `${maxTop}px`
        pinEl.style.left = '0px'
        pinEl.style.width = '100%'
        pinEl.style.zIndex = '1'
        previousScrollY = scrollY
        return
      }

      pinEl.style.position = 'fixed'
      pinEl.style.top = `${headerOffset}px`
      pinEl.style.left = `${rightRect.left}px`
      pinEl.style.width = `${rightRect.width}px`
      pinEl.style.zIndex = '10'

      if (isScrollingUp && rightMaxScroll > 0) {
        const progress = Math.min(
          1,
          Math.max(0, (scrollY - pinStartScrollY) / pinTravel)
        )
        const syncedRightTop = progress * rightMaxScroll
        if (Math.abs(pinEl.scrollTop - syncedRightTop) > 0.5) {
          pinEl.scrollTop = syncedRightTop
        }
      }

      if (isAutoScrollingRight) {
        stopAutoScroll()
      }
      previousScrollY = scrollY
    }

    const onScroll = () => {
      if (frameId) return
      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        update()
      })
    }

    const onWheelWhileAuto = (event: WheelEvent) => {
      if (!isAutoScrollingRight) return
      if (autoScrollDirection === 'down' && event.deltaY > 0) {
        event.preventDefault()
        return
      }
      if (autoScrollDirection === 'up' && event.deltaY < 0) {
        event.preventDefault()
        return
      }
      stopAutoScroll()
    }

    const onRightWheelSyncUp = (event: WheelEvent) => {
      if (isAutoScrollingRight) return
      if (event.deltaY >= 0) return

      const scrollY = window.scrollY
      const sectionRect = sectionEl.getBoundingClientRect()
      const sectionTop = sectionRect.top + scrollY
      const sectionBottom = sectionRect.bottom + scrollY
      const pinHeight = pinEl.offsetHeight
      const pinStartScrollY = sectionTop - headerOffset
      const pinEndScrollY = sectionBottom - pinHeight - headerOffset
      const inPinnedRange =
        scrollY >= pinStartScrollY - epsilon && scrollY <= pinEndScrollY + epsilon
      if (!inPinnedRange) return

      // Scroll left/body together while right column scrolls upward.
      window.scrollBy({ top: event.deltaY, behavior: 'auto' })
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    window.addEventListener('wheel', onWheelWhileAuto, { passive: false })
    pinEl.addEventListener('wheel', onRightWheelSyncUp, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('wheel', onWheelWhileAuto)
      pinEl.removeEventListener('wheel', onRightWheelSyncUp)
      stopAutoScroll()
      if (frameId) window.cancelAnimationFrame(frameId)
    }
  }, [isMobile, product])

  useEffect(() => {
    if (!isMobile) return
    const pinEl = rightPinRef.current
    const spacerEl = rightSpacerRef.current
    const rightCol = rightColumnRef.current
    if (spacerEl) spacerEl.style.height = '0px'
    if (rightCol) rightCol.style.minHeight = ''
    if (!pinEl) return
    pinEl.style.position = ''
    pinEl.style.top = ''
    pinEl.style.left = ''
    pinEl.style.width = ''
    pinEl.style.zIndex = ''
    pinEl.style.maxHeight = ''
    pinEl.style.overflowY = ''
  }, [isMobile, product?.id])

  useEffect(() => {
    if (!isMobile) {
      setIsMobileGalleryVisible(false)
      return
    }
    const gallerySection = mobileGallerySectionRef.current
    if (!gallerySection) {
      setIsMobileGalleryVisible(false)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsMobileGalleryVisible(entry.isIntersecting)
      },
      { threshold: 0.15 },
    )
    observer.observe(gallerySection)
    return () => observer.disconnect()
  }, [isMobile, product?.id])

  useEffect(() => {
    if (isMobile && isMobileGalleryVisible) {
      setShowSellerChat(false)
    }
  }, [isMobile, isMobileGalleryVisible])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previous
    }
  }, [])

  useEffect(() => {
    if (!product?.id) return
    if (typeof window === 'undefined') return

    const storageKey = `product-scroll:${resolvedParams.slug}`

    const restore = () => {
      const raw = window.sessionStorage.getItem(storageKey)
      if (raw === null) {
        window.scrollTo({ top: 0, behavior: 'auto' })
        if (rightPinRef.current) {
          rightPinRef.current.scrollTop = 0
        }
        return
      }
      let windowTop = 0
      let rightTop = 0
      try {
        const parsed = JSON.parse(raw)
        windowTop = Number.isFinite(Number(parsed?.windowY))
          ? Math.max(0, Number(parsed.windowY))
          : 0
        rightTop = Number.isFinite(Number(parsed?.rightY))
          ? Math.max(0, Number(parsed.rightY))
          : 0
      } catch {
        const parsed = Number(raw)
        windowTop = Number.isFinite(parsed) ? Math.max(0, parsed) : 0
      }
      window.scrollTo({ top: windowTop, behavior: 'auto' })
      if (rightPinRef.current) {
        rightPinRef.current.scrollTop = rightTop
      }
    }

    const restoreTimer = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(restore)
    })

    const persistPosition = () => {
      const payload = {
        windowY: window.scrollY,
        rightY: rightPinRef.current?.scrollTop || 0,
      }
      window.sessionStorage.setItem(storageKey, JSON.stringify(payload))
    }

    let ticking = false
    const persist = () => {
      persistPosition()
      ticking = false
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(persist)
    }
    const onPageHide = () => {
      persistPosition()
    }
    const onRightScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(persist)
    }

    const rightScrollEl = rightPinRef.current
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', onPageHide)
    rightScrollEl?.addEventListener('scroll', onRightScroll, { passive: true })

    return () => {
      window.cancelAnimationFrame(restoreTimer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', onPageHide)
      rightScrollEl?.removeEventListener('scroll', onRightScroll)
      persistPosition()
    }
  }, [product?.id, resolvedParams.slug])

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
    if (!isSelectionComplete) return
    if (shakeKeys.length) {
      setShakeKeys([])
    }
    if (showSelectionErrors) {
      setShowSelectionErrors(false)
    }
  }, [isSelectionComplete, shakeKeys.length, showSelectionErrors])

  useEffect(() => {
    if (!product) return
    const hasDetails = hasMeaningfulRichText(product.fullDescription || '')
    if (!hasDetails && activeTab === 'details') {
      setActiveTab('packaging')
    }
  }, [activeTab, product])

  useEffect(() => {
    if (!showConditionInfo) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (conditionInfoRef.current?.contains(target)) return
      setShowConditionInfo(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showConditionInfo])

  useEffect(() => {
    if (!showReturnInfo) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (returnInfoRef.current?.contains(target)) return
      setShowReturnInfo(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showReturnInfo])

  useEffect(() => {
    if (!product?.id) return
    const entry = findCartEntry(items, {
      id: product.id,
      selectedVariationId: selectedVariation?.id,
      selectedColor,
      selectedSize,
    })
    const quantity = entry?.quantity || 0
    if (quantity > 0) {
      setPendingQuantity(quantity)
    }
  }, [items, product?.id, selectedVariation?.id, selectedColor, selectedSize])

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
  const createdAtTimestamp = new Date(String(product.createdAt || '')).getTime()
  const ageMs = Number.isNaN(createdAtTimestamp)
    ? Number.POSITIVE_INFINITY
    : Date.now() - createdAtTimestamp
  const isNewProduct = ageMs >= 0 && ageMs <= 12 * 60 * 60 * 1000

  const handleAddToCart = (quantity = 1) => {
    if (!isSelectionComplete) {
      variationSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      setShakeKeys(['__all__'])
      setShowSelectionErrors(true)
      setVariationError('')
      setTimeout(() => setShakeKeys([]), 650)
      return
    }
    setShowSelectionErrors(false)
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
      Math.max(1, Number(quantity) || 1)
    )
  }

  const shortDescription = product.shortDescription ?? ''
  const fullDescription = product.fullDescription ?? ''
  const sanitizeRichHtml = (input: string) =>
    String(input || '')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '')
  const sanitizedFullDescription = sanitizeRichHtml(fullDescription)
  const hasDetailsDescription = hasMeaningfulRichText(sanitizedFullDescription)
  const stockRemaining = product.stockRemaining ?? product.stock ?? 0
  const sku = product.sku || 'N/A'
  const shippingEstimate = product.shippingEstimate || 'Ships in 3-5 business days'
  const tags = Array.isArray(product.tagLinks) ? product.tagLinks : []
  const visibleTags = showAllTags ? tags : tags.slice(0, 6)
  const hasMoreTags = tags.length > 6
  const activePrice = selectedVariation?.price ?? product.price
  const activeOriginalPrice =
    selectedVariation?.originalPrice ?? product.originalPrice
  const savingsAmount =
    activeOriginalPrice && activeOriginalPrice > activePrice
      ? activeOriginalPrice - activePrice
      : 0
  const savingsAmountLabel = Number.isInteger(savingsAmount)
    ? String(savingsAmount)
    : savingsAmount.toFixed(2)
  const activeImage = currentImage || selectedVariation?.image || product.video || product.image
  const conditionKey = String(product.conditionCheck || '').trim().toLowerCase()
  const conditionMeta =
    CONDITION_COPY[conditionKey] || {
      label: conditionKey
        ? conditionKey.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
        : 'Brand New',
      details: 'Condition information provided by the seller for this product.',
    }
  const visibleSizeSummary = sizeOptions.slice(0, 4)
  const extraSizeCount = Math.max(0, sizeOptions.length - visibleSizeSummary.length)
  const sizeSummaryLabel = visibleSizeSummary.length ? visibleSizeSummary.join(', ') : 'One size'
  const packagingStyleKey = String(product.packagingStyle || 'in_wrap_nylon').trim().toLowerCase()
  const packagingStyleMeta =
    PACKAGING_STYLE_COPY[packagingStyleKey] || PACKAGING_STYLE_COPY.in_wrap_nylon
  const packagingImageSrc =
    PACKAGING_IMAGE_BY_STYLE[packagingStyleKey] || PACKAGING_IMAGE_BY_STYLE.in_wrap_nylon
  const returnPolicyKey = String(product.returnPolicy || 'not_returnable').trim().toLowerCase()
  const returnPolicyMeta =
    RETURN_POLICY_COPY[returnPolicyKey] || RETURN_POLICY_COPY.not_returnable
  const rawCategorySlug = product.categorySlug || product.category || ''
  const categorySlug = encodeURIComponent(
    slugifyCategory(String(rawCategorySlug)),
  )
  const fallbackCategoryHref = categorySlug ? `/products/${categorySlug}` : '/products'
  const breadcrumbItems =
    Array.isArray(product.categoryPath) && product.categoryPath.length > 0
      ? product.categoryPath
      : [
          { label: product.category, href: fallbackCategoryHref },
        ]
  const cartSelection = {
    id: product.id,
    selectedVariationId: selectedVariation?.id,
    selectedColor,
    selectedSize,
  }
  const cartEntry = findCartEntry(items, cartSelection)
  const cartQuantity = cartEntry?.quantity || 0
  const storeReviewsCount = Number(reviewData?.summary?.totalReviews || 0)
  const productReviewsCount = Number(product.reviews) || 0
  const canWriteReview = Boolean(reviewData?.canWriteReview)
  const shouldShowReviewsSection = productReviewsCount > 0 || storeReviewsCount > 0 || canWriteReview
  const totalReviewsCount =
    Number(reviewData?.summary?.totalReviews) > 0
      ? Number(reviewData.summary.totalReviews)
      : productReviewsCount
  const displayRating =
    Number(reviewData?.summary?.rating) > 0
      ? Number(reviewData.summary.rating)
      : Number(product.rating) || 0
  const hasReviews = totalReviewsCount > 0
  const hasRating = displayRating > 0
  const stockCount = Number(stockRemaining) || 0
  const generalStockLimitRaw = Number(product.stockRemaining ?? product.stock)
  const generalStockLimit =
    Number.isFinite(generalStockLimitRaw) && generalStockLimitRaw > 0
      ? Math.floor(generalStockLimitRaw)
      : null
  const variationStockLimitRaw = Number(selectedVariation?.stock)
  const variationStockLimit =
    Number.isFinite(variationStockLimitRaw) && variationStockLimitRaw > 0
      ? Math.floor(variationStockLimitRaw)
      : null
  const quantitySelectorMax = variationStockLimit ?? generalStockLimit ?? 50
  const isAddedToCart = cartQuantity > 0
  const displayQuantity = cartQuantity > 0
    ? cartQuantity
    : Math.max(1, Math.min(quantitySelectorMax, pendingQuantity))
  const ctaLabel =
    isAddedToCart
      ? `Added to cart (${cartQuantity})`
      : isSelectionComplete
        ? 'Add to Cart'
        : 'Select an option'
  const isWishlisted = isRecentlySaved(product?.id)
  const shouldShowMobileFloatingCart =
    isMobile && showFloatingCart && !showFloatingDock && !isMobileGalleryVisible
  const shouldRenderFloatingDock = !isMobile || !isMobileGalleryVisible

  const handleQuantitySelectChange = (nextQuantity: number) => {
    const parsed = Number(nextQuantity)
    if (!Number.isFinite(parsed)) return

    if (cartEntry?.key) {
      const safeCartQuantity = Math.max(0, parsed)
      updateQuantity(cartEntry.key, safeCartQuantity)
      if (safeCartQuantity <= 0) {
        setPendingQuantity(1)
      }
      return
    }

    const safePendingQuantity = Math.max(1, Math.min(quantitySelectorMax, parsed))
    setPendingQuantity(safePendingQuantity)
  }
  const stockLabel =
    stockCount <= 0
      ? 'Out of stock'
      : stockCount < 5
        ? `${stockCount} remaining`
        : `${stockCount} in stock`
  const stockTextClass =
    stockCount <= 0 ? 'text-rose-600' : stockCount < 5 ? 'text-amber-600' : 'text-green-600'
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/product/${product.slug}`
      : `/product/${product.slug}`
  const handleWishlistClick = () => {
    if (!product?.id) return
    openSaveModal({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: activePrice,
      image: activeImage || product.image,
    })
  }
  const handleOpenSellerChat = () => setShowSellerChat(true)

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const tabs = [
    ...(hasDetailsDescription
      ? [
          {
            id: 'details',
            label: 'Product Details',
            content: sanitizedFullDescription,
          },
        ]
      : []),
    {
      id: 'packaging',
      label: 'Packaging',
      content: `
        <p>${packagingStyleMeta.label}. ${packagingStyleMeta.details}</p>
        <h4 class="mt-2 text-sm font-semibold text-gray-800">Packing will look like this</h4>
        <img class="packaging-preview-image" src="${packagingImageSrc}" alt="${packagingStyleMeta.label} packaging example" loading="lazy" />
      `,
    },
    {
      id: 'shipping',
      label: 'Shipping Information',
      content: `${shippingEstimate}. Express options available at checkout.`,
    },
  ]
  const activeTabData = tabs.find((tab) => tab.id === activeTab) || tabs[0]
  const activeTabHtml = sanitizeRichHtml(String(activeTabData?.content || ''))

  return (
    <div className='min-h-screen flex overflow-x-hidden'>
      <div className='flex-1 min-w-0'>
        <main className='min-h-screen bg-white overflow-x-hidden w-full'>
          {isMobile ? (
            <div className='main-container px-2 pt-2 md:hidden'>
              <Breadcrumb
                items={breadcrumbItems}
                collapseFrom={4}
              />
            </div>
          ) : null}

          {isMobile ? (
            <div ref={mobileGallerySectionRef} className='w-full md:hidden'>
              <Gallery
                images={product.gallery}
                media={product.galleryMedia}
                currentImage={activeImage}
                setCurrentImage={setCurrentImage}
                productName={product.name}
                vendorNameOverlay={String(product.vendor || '').trim()}
                forceMobileView
                badgeText={
                  isNewProduct
                    ? 'New'
                    : discountPercentage
                      ? `-${discountPercentage}%`
                      : null
                }
                badgeVariant={isNewProduct ? 'new' : 'discount'}
                mainImageRef={galleryMainRef}
              />
            </div>
          ) : null}

          <div className='main-container px-2 sm:px-4 lg:px-6 py-0'>
              <div className='hidden md:block pt-2 sm:pt-0'>
                <Breadcrumb
                  items={breadcrumbItems}
                  collapseFrom={4}
                />
              </div>
            <div ref={productContentAreaRef} className='bg-white rounded-none shadow-none sm:rounded-2xl sm:shadow-sm'>
              <div
                ref={sectionRef}
                className='grid md:grid-cols-[minmax(0,45%)_minmax(0,55%)] md:items-stretch lg:grid-cols-[minmax(0,40%)_minmax(0,60%)] xl:grid-cols-[640px_minmax(0,1fr)]'
              >
                {/* Left side - Images */}
                <div ref={leftColumnRef} className='space-y-6 md:pr-4 lg:pr-6'>
                  <div className='hidden md:block'>
                    <Gallery
                      images={product.gallery}
                      media={product.galleryMedia}
                      currentImage={activeImage}
                      setCurrentImage={setCurrentImage}
                      productName={product.name}
                      vendorNameOverlay={String(product.vendor || '').trim()}
                      badgeText={
                        isNewProduct
                          ? 'New'
                          : discountPercentage
                            ? `-${discountPercentage}%`
                            : null
                      }
                      badgeVariant={isNewProduct ? 'new' : 'discount'}
                      mainImageRef={galleryMainRef}
                    />
                  </div>
                  {!isMobile && shouldShowReviewsSection && (
                    <div id='reviews-section'>
                      <div ref={reviewsTriggerRef} className='h-0 w-full' aria-hidden='true' />
                      {!shouldLoadReviews ? (
                        <DeferredSectionLoader
                          title='Customer reviews will load as you scroll'
                          description='We prioritize product media and key buying details first.'
                        />
                      ) : isReviewsLoading ? (
                        <DeferredSectionLoader
                          title='Loading customer reviews'
                          description='Fetching latest reviews and ratings...'
                        />
                      ) : (
                        <CustomerReviews
                          data={reviewData}
                          productSlug={product.slug}
                          onReviewSubmitted={handleReviewSubmitted}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Right side - Product info */}
                <div
                  ref={rightColumnRef}
                  className='relative overflow-x-hidden'
                >
                  <div ref={rightSpacerRef} />
                  <div
                    ref={rightPinRef}
                    className='space-y-4 md:space-y-5 no-scrollbar overflow-x-hidden lg:sticky lg:top-6'
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
                    <Link
                      href={fallbackCategoryHref}
                      className='text-[11px] font-medium bg-gray-50 text-gray-500 px-2 py-0.5 rounded-[3px] hover:text-gray-700 transition'
                    >
                      {product.category}
                    </Link>
                    <button
                      type='button'
                      onClick={() => setShowShareModal(true)}
                      className='flex items-center gap-2 text-xs font-medium text-gray-600 px-3 py-2 hover:bg-gray-50 transition'
                    >
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

                  <div className='space-y-2 !mt-0'>
                    <h1 className='text-3xl font-semibold text-gray-900 font-serif'>
                      {product.name}
                    </h1>
                    <div className='flex items-center gap-3 text-sm text-gray-600'>
                      {hasRating && (
                        <div className='flex items-center gap-2'>
                          <StarRating rating={displayRating} />
                          <span className='font-medium text-gray-800'>
                            {displayRating.toFixed(1)}
                          </span>
                        </div>
                      )}
                      <button
                        type='button'
                        onClick={() => {
                          setShouldLoadReviews(true)
                          const el = document.getElementById('reviews-section')
                          if (!el) return
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }}
                        className='text-xs underline underline-offset-2 decoration-gray-300 hover:text-gray-800 hover:decoration-gray-500 transition'
                      >
                        {hasReviews ? `${totalReviewsCount} reviews` : 'No reviews yet'}
                      </button>
                      <span className={stockTextClass}>{stockLabel}</span>
                    </div>
                    <div className='text-xs text-gray-500'>SKU: {sku}</div>
                    <p className='text-sm text-gray-600 leading-relaxed'>
                      {shortDescription}
                    </p>
                  </div>

                  <div>
                    <div className='flex items-center gap-4'>
                      <span className='text-3xl font-semibold text-gray-900'>
                        ${activePrice}
                      </span>
                      {activeOriginalPrice && (
                        <span className='text-base text-gray-400 line-through'>
                          ${activeOriginalPrice}
                        </span>
                      )}
                    </div>
                    {savingsAmount > 0 && (
                      <div className='mt-0.5 text-xs font-semibold text-green-600'>
                        Save ${savingsAmountLabel} if you buy now
                      </div>
                    )}
                  </div>

                  <button
                    type='button'
                    onClick={handleWishlistClick}
                    aria-label={isWishlisted ? 'Saved to wishlist' : 'Add to wishlist'}
                    aria-pressed={isWishlisted}
                    className='inline-flex items-center gap-1 pb-0.5 text-[15px] font-semibold text-gray-800 transition hover:text-gray-950'
                  >
                    <svg
                      className='h-5 w-5'
                      viewBox='0 0 24 24'
                      fill={isWishlisted ? 'currentColor' : 'none'}
                      stroke='currentColor'
                      strokeWidth='2'
                      aria-hidden='true'
                    >
                      <path
                        d='M15.7 4C18.87 4 21 6.98 21 9.76C21 15.39 12.16 20 12 20C11.84 20 3 15.39 3 9.76C3 6.98 5.13 4 8.3 4C10.12 4 11.31 4.91 12 5.71C12.69 4.91 13.88 4 15.7 4Z'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                    <span>{isWishlisted ? 'Saved to Wishlist' : 'Add to Wishlist'}</span>
                  </button>
                  {tags.length > 0 && (
                    <div className='flex flex-wrap gap-1.5 -mt-0.5'>
                      {visibleTags.map((tag: any) => (
                        <Link
                          key={`${tag.slug}-${tag.name}`}
                          href={`/products?tag=${encodeURIComponent(tag.slug)}`}
                          className='text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:text-gray-800 transition underline underline-offset-2 decoration-gray-300 hover:decoration-gray-500'
                        >
                          #{tag.name}
                        </Link>
                      ))}
                      {hasMoreTags && (
                        <button
                          type='button'
                          onClick={() => setShowAllTags((prev) => !prev)}
                          className='text-[10px] text-gray-700 hover:text-gray-900 transition underline underline-offset-2 decoration-gray-300 hover:decoration-gray-500'
                        >
                          {showAllTags ? 'See less' : `See more (${tags.length - 6})`}
                        </button>
                      )}
                    </div>
                  )}

                  <div
                    ref={variationSectionRef}
                    className={`border-t border-gray-200 pt-2 space-y-2.5 transition ${
                      shakeKeys.length
                        ? 'rounded-2xl border border-rose-400 px-3 pb-3 oc-shake'
                        : ''
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
                        <div className='space-y-1'>
                          <div className='text-sm font-semibold text-gray-900'>
                            Variations
                          </div>
                          {showSelectionErrors && missingSelectionKeySet.has('color') && (
                            <p className='text-xs font-semibold text-rose-600'>
                              {getSelectionErrorMessage('color')}
                            </p>
                          )}
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
                                  const nextColor = String(variation?.color || '')
                                  if (nextColor) {
                                    setSelectedColor(nextColor)
                                  }
                                  const nextSelectionMap = {
                                    ...selectedAttributes,
                                    ...(selectedSize ? { size: selectedSize } : {}),
                                    ...(nextColor ? { color: nextColor } : {}),
                                  }
                                  if (hasSelectionConflict(nextSelectionMap)) {
                                    setVariationError('The option you selected is sold out.')
                                  } else {
                                    setVariationError('')
                                  }
                                  setCurrentImage(variation.image || product.image)
                                }}
                                className={`w-[76px] text-left border rounded-lg p-0.5 transition ${
                                  isSelected
                                    ? 'border-blue-500 ring-2 ring-blue-200'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className='h-[78px] w-full rounded-md overflow-hidden bg-gray-100 relative'>
                                  <Image
                                    src={variation.image}
                                    alt={variation.label}
                                    fill
                                    sizes='78px'
                                    className='object-cover'
                                  />
                                </div>
                                <div className='pt-1 text-[10px] font-semibold text-gray-900 truncate'>
                                  {variation.color || variation.label}
                                </div>
                                <div className='text-[9px] font-semibold text-gray-900'>
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
                              <div className='mb-2 space-y-1'>
                                <div className='text-xs font-semibold uppercase tracking-wide text-gray-600'>
                                  Color
                                </div>
                                {showSelectionErrors && missingSelectionKeySet.has('color') && (
                                  <p className='text-xs font-semibold text-rose-600'>
                                    {getSelectionErrorMessage('color')}
                                  </p>
                                )}
                              </div>
                              <div className='flex flex-wrap gap-2'>
                                {colorOptions.map((color: string) => {
                                  const isAvailable = isOptionAvailable('color', String(color))
                                  const isSelected = selectedColor === color
                                  return (
                                  <button
                                    key={color}
                                    type='button'
                                    aria-disabled={!isAvailable}
                                    onClick={() => {
                                      if (!isAvailable) {
                                        setVariationError('The option you selected is sold out.')
                                        return
                                      }
                                      setVariationError('')
                                      setSelectedColor((prev) =>
                                        String(prev) === String(color) ? '' : String(color),
                                      )
                                    }}
                                    className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                                      isSelected && !isAvailable
                                        ? 'border-rose-500 bg-white text-gray-900'
                                        : isSelected
                                        ? 'border-gray-900 bg-white text-gray-900'
                                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                                    } ${!isAvailable && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    aria-pressed={isSelected}
                                  >
                                    <span
                                      className='h-3.5 w-3.5 rounded-full border border-gray-300'
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
                            <div className='mb-2 space-y-1'>
                              <div className='text-xs font-semibold uppercase tracking-wide text-gray-600'>
                                Size
                              </div>
                              {showSelectionErrors && missingSelectionKeySet.has('size') && (
                                <p className='text-xs font-semibold text-rose-600'>
                                  {getSelectionErrorMessage('size')}
                                </p>
                              )}
                            </div>
                            <div className='flex flex-wrap gap-2'>
                              {sizeOptions.map((size: string) => {
                                const isAvailable = isOptionAvailable('size', String(size))
                                const isSelected = selectedSize === size
                                return (
                                <button
                                  key={size}
                                  aria-disabled={!isAvailable}
                                  className={`inline-flex min-w-[52px] items-center justify-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                                    isSelected && !isAvailable
                                      ? 'border-rose-500 bg-white text-gray-900'
                                      : isSelected
                                      ? 'border-gray-900 bg-white text-gray-900'
                                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                                  } ${!isAvailable && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
                                  onClick={() => {
                                    if (!isAvailable) {
                                      setVariationError('The option you selected is sold out.')
                                      return
                                    }
                                    setVariationError('')
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
                              <div className='mb-2 space-y-1'>
                                <div className='text-xs font-semibold uppercase tracking-wide text-gray-600'>
                                  {attribute.label}
                                </div>
                                {showSelectionErrors && missingSelectionKeySet.has(attribute.key) && (
                                  <p className='text-xs font-semibold text-rose-600'>
                                    {getSelectionErrorMessage(attribute.key)}
                                  </p>
                                )}
                              </div>
                              <div className='flex flex-wrap gap-2'>
                                {attribute.options.map((option) => {
                                  const isAvailable = isOptionAvailable(attribute.key, String(option))
                                  const isSelected = selectionMap[attribute.key] === option
                                  return (
                                  <button
                                    key={`${attribute.key}-${option}`}
                                    aria-disabled={!isAvailable}
                                    className={`inline-flex min-w-[52px] items-center justify-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                                      isSelected && !isAvailable
                                        ? 'border-rose-500 bg-white text-gray-900'
                                        : isSelected
                                        ? 'border-gray-900 bg-white text-gray-900'
                                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                                    } ${!isAvailable && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    onClick={() => {
                                      if (!isAvailable) {
                                        setVariationError('The option you selected is sold out.')
                                        return
                                      }
                                      setVariationError('')
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
                    className='sticky bottom-0 bg-white px-2 py-2 border-t border-gray-100 shadow-[0_-8px_20px_rgba(0,0,0,0.05)]'
                  >
                    <div className='pointer-events-none absolute -top-4 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent' />
                    <div className='relative flex items-center gap-3'>
                      <CartQuantitySelect
                        quantity={displayQuantity}
                        onChange={handleQuantitySelectChange}
                        maxQuantity={quantitySelectorMax}
                        size='md'
                      />
                      <button
                        onClick={() => handleAddToCart(displayQuantity)}
                        disabled={isAddedToCart}
                        className={`inline-flex h-11 flex-1 items-center justify-center rounded-full border border-black bg-black px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-black disabled:border-black disabled:text-white ${
                          isAddedToCart ? '' : 'hover:bg-gray-900'
                        }`}
                      >
                        {ctaLabel}
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
                    <div
                      ref={descriptionRef}
                      className={`overflow-x-hidden text-sm text-gray-600 leading-relaxed [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-gray-900 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-gray-800 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_figure]:max-w-full [&_figure]:overflow-hidden [&_img]:mt-0 [&_img]:block [&_img]:mx-auto [&_img]:max-w-full [&_img]:h-auto [&_img]:object-contain [&_img]:!max-w-full [&_img]:!h-auto [&_.packaging-preview-image]:-mt-8 ${
                        activeTab === 'details' ? 'max-h-28 overflow-hidden' : ''
                      }`}
                      dangerouslySetInnerHTML={{ __html: activeTabHtml }}
                    >
                    </div>
                    {showSeeMore && (
                      <>
                        <div className='pointer-events-none absolute inset-0 z-10 backdrop-blur-[0.6px] bg-gradient-to-b from-white/0 via-white/65 to-white' />
                        <div className='relative z-30 flex justify-center bg-white pt-1'>
                          <button
                            onClick={() => setShowDetailsModal(true)}
                            className='inline-flex items-center gap-1 text-xs font-semibold text-gray-800 hover:text-gray-900 transition'
                          >
                            <span>See more</span>
                            <svg
                              viewBox='0 0 20 20'
                              className='h-3.5 w-3.5'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='1.8'
                              aria-hidden='true'
                            >
                              <path d='M7 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                            </svg>
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
                        <span>Available Sizes</span>
                        <span className='text-right'>
                          {sizeSummaryLabel}
                          {extraSizeCount > 0 ? ` +${extraSizeCount} more` : ''}
                        </span>
                      </div>
                      <div className='relative flex items-center justify-between text-gray-600 mt-2'>
                        <span>Condition</span>
                        <span ref={conditionInfoRef} className='inline-flex items-center gap-1'>
                          <span>{conditionMeta.label}</span>
                          <button
                            type='button'
                            onClick={() => setShowConditionInfo((prev) => !prev)}
                            className='inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-600 hover:bg-gray-50'
                            aria-label='Show condition details'
                          >
                            <svg viewBox='0 0 20 20' className='h-3 w-3' fill='none' stroke='currentColor' strokeWidth='1.8'>
                              <circle cx='10' cy='10' r='7' />
                              <path d='M10 8.2v5' strokeLinecap='round' />
                              <circle cx='10' cy='5.7' r='0.8' fill='currentColor' stroke='none' />
                            </svg>
                          </button>
                        </span>
                        {showConditionInfo && (
                          <div className='absolute right-0 top-7 z-20 w-64 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600 shadow-lg'>
                            {conditionMeta.details}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className='border border-gray-200 rounded-xl p-4 text-sm'>
                      <div className='font-semibold text-gray-900 mb-2'>
                        Returns
                      </div>
                      <div className='relative flex items-center justify-between text-gray-600'>
                        <span>Policy</span>
                        <span ref={returnInfoRef} className='inline-flex items-center gap-1'>
                          <span>{returnPolicyMeta.label}</span>
                          <button
                            type='button'
                            onClick={() => setShowReturnInfo((prev) => !prev)}
                            className='inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-600 hover:bg-gray-50'
                            aria-label='Show return policy details'
                          >
                            <svg viewBox='0 0 20 20' className='h-3 w-3' fill='none' stroke='currentColor' strokeWidth='1.8'>
                              <circle cx='10' cy='10' r='7' />
                              <path d='M10 8.2v5' strokeLinecap='round' />
                              <circle cx='10' cy='5.7' r='0.8' fill='currentColor' stroke='none' />
                            </svg>
                          </button>
                        </span>
                        {showReturnInfo && (
                          <div className='absolute right-0 top-7 z-20 w-64 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600 shadow-lg'>
                            {returnPolicyMeta.details}
                          </div>
                        )}
                      </div>
                      <div className='mt-2 text-xs text-gray-500'>
                        Return eligibility depends on product policy and order status.
                        {' '}
                        <Link href='/returns-policy' className='font-semibold text-gray-700 underline underline-offset-2 hover:text-gray-900'>
                          More on return
                        </Link>
                      </div>
                    </div>
                  </div>

                  {isMobile && shouldShowReviewsSection && (
                    <div id='reviews-section'>
                      <div ref={reviewsTriggerRef} className='h-0 w-full' aria-hidden='true' />
                      {!shouldLoadReviews ? (
                        <DeferredSectionLoader
                          title='Customer reviews will load as you scroll'
                          description='We prioritize product media and key buying details first.'
                        />
                      ) : isReviewsLoading ? (
                        <DeferredSectionLoader
                          title='Loading customer reviews'
                          description='Fetching latest reviews and ratings...'
                        />
                      ) : (
                        <CustomerReviews
                          data={reviewData}
                          productSlug={product.slug}
                          onReviewSubmitted={handleReviewSubmitted}
                        />
                      )}
                    </div>
                  )}
                  <AboutStoreCard
                    vendor={product.vendor}
                    vendorSlug={product.vendorSlug}
                    rating={product.vendorRating}
                    followers={product.vendorFollowers}
                    soldCount={product.vendorSoldCount}
                    itemsCount={product.vendorItemsCount}
                    badge={product.vendorBadge}
                    avatarUrl={product.vendorLogoUrl}
                  />
                  <ShippingInfoCard shippingEstimate={shippingEstimate} />
                  </div>
                  </div>
                </div>
              </div>
              <div ref={relatedTriggerRef} className='h-0 w-full' aria-hidden='true' />
              {!shouldLoadRelated ? (
                <DeferredSectionLoader
                  className='mt-4'
                  title='More products will load as you continue'
                  description='Related items are deferred to keep this page fast.'
                />
              ) : isRelatedLoading ? (
                <RelatedProductsSkeleton />
              ) : (
                <RelatedProductsSection
                  items={relatedProducts}
                  seeAllHref={categorySlug ? `/products/${categorySlug}` : undefined}
                />
              )}
              {shouldLoadRelated && !isRelatedLoading ? (
                <RecentlyViewedSection currentSlug={product.slug} />
              ) : null}
            </div>
        </main>
      </div>

      <SellerChatPopup
        isOpen={showSellerChat}
        onClose={() => setShowSellerChat(false)}
        productId={String(product?.id || '')}
        vendorName={String(product?.vendor || 'Seller')}
        vendorAvatarUrl={String(product?.vendorLogoUrl || '')}
        hasBottomOffset={shouldShowMobileFloatingCart}
        productPrice={Number(activePrice) || 0}
        currencySymbol='$'
      />

      {shouldRenderFloatingDock && (
        <ProductFloatingDock
          isTopMode={showFloatingDock}
          onMessageClick={handleOpenSellerChat}
          onTopClick={handleBackToTop}
          hasBottomOffset={shouldShowMobileFloatingCart}
        />
      )}

      {isMobile && (
        <div
          className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out ${
            shouldShowMobileFloatingCart
              ? 'translate-y-0 opacity-100'
              : 'translate-y-full opacity-0 pointer-events-none'
          }`}
        >
          <div className='flex items-center gap-3'>
            <CartQuantitySelect
              quantity={displayQuantity}
              onChange={handleQuantitySelectChange}
              maxQuantity={quantitySelectorMax}
              size='md'
            />
            <button
              onClick={() => handleAddToCart(displayQuantity)}
              disabled={isAddedToCart}
              className={`inline-flex h-11 flex-1 items-center justify-center rounded-full border border-black bg-black px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-black disabled:border-black disabled:text-white ${
                isAddedToCart ? '' : 'hover:bg-gray-900'
              }`}
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      )}

      {showDetailsModal && (
        <div
          className='fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4'
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowDetailsModal(false)
            }
          }}
        >
          <div className='flex h-screen w-full flex-col overflow-hidden bg-white px-4 py-4 shadow-2xl sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl sm:p-6'>
            <div className='flex shrink-0 items-center justify-between'>
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
            <div
              className='mt-4 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pr-0 text-sm text-gray-600 leading-relaxed whitespace-pre-line sm:pr-1 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-gray-900 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-gray-800 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_figure]:max-w-full [&_figure]:overflow-hidden [&_img]:mt-0 [&_img]:block [&_img]:mx-auto [&_img]:max-w-full [&_img]:h-auto [&_img]:object-contain [&_img]:!max-w-full [&_img]:!h-auto [&_.packaging-preview-image]:-mt-8'
              style={{ WebkitOverflowScrolling: 'touch' }}
              dangerouslySetInnerHTML={{ __html: activeTabHtml }}
            />
          </div>
        </div>
      )}

      <ShareProductModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={shareUrl}
        productName={product.name}
      />
    </div>
  )
}

export default function ProductPageWrapper(
  props: { params: Promise<{ slug: string }> }
) {
  return <ProductContent {...props} />
}
