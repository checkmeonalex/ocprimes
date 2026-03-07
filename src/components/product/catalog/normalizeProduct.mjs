import { deriveOptionsFromVariations } from '../variationUtils.mjs'

const CUSTOM_ATTRIBUTE_EXCLUDE = new Set([
  'id',
  'name',
  'slug',
  'sku',
  'status',
  'created_at',
  'updated_at',
  'price',
  'discount_price',
  'stock_quantity',
  'description',
  'short_description',
  'image',
  'image_url',
  'images',
  'gallery',
  'variations',
  'categories',
  'tags',
  'brands',
  'rating',
  'reviews',
  'vendor',
  'brand',
  'category',
  'colors',
  'sizes',
  'condition_check',
  'packaging_style',
  'return_policy',
  'product_type',
  'main_image_id',
  'main_image_key',
])

const normalizeCustomKey = (value = '') =>
  String(value || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const isScalar = (value) =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'

const toScalarList = (value) => {
  if (isScalar(value)) {
    const item = String(value).trim()
    return item ? [item] : []
  }
  if (Array.isArray(value)) {
    return value
      .filter(isScalar)
      .map((item) => String(item).trim())
      .filter(Boolean)
  }
  return []
}

const buildCustomAttributes = (item) => {
  const output = {}
  Object.entries(item || {}).forEach(([rawKey, rawValue]) => {
    const key = normalizeCustomKey(rawKey)
    if (!key || CUSTOM_ATTRIBUTE_EXCLUDE.has(key)) return
    if (key.endsWith('_id') || key.endsWith('_key')) return
    const values = toScalarList(rawValue)
    if (!values.length) return
    output[key] = values.length === 1 ? values[0] : values
  })
  return output
}

const resolveVendorName = (item) => {
  const directCandidates = [
    item?.vendor,
    item?.vendor_name,
    item?.vendorName,
    item?.brand_name,
    item?.brandName,
    item?.store_name,
    item?.storeName,
    item?.seller_name,
    item?.sellerName,
  ]

  const directMatch = directCandidates.find(
    (value) => String(value || '').trim(),
  )
  if (directMatch) return String(directMatch).trim()

  if (Array.isArray(item?.brands)) {
    const firstBrand = item.brands.find((brand) =>
      String(brand?.name || brand?.brand_name || '').trim(),
    )
    if (firstBrand) {
      return String(
        firstBrand?.name || firstBrand?.brand_name || '',
      ).trim()
    }
  }

  return ''
}

const resolveVendorSlug = (item) => {
  const directCandidates = [
    item?.vendorSlug,
    item?.vendor_slug,
    item?.brand_slug,
    item?.brandSlug,
    item?.store_slug,
    item?.storeSlug,
    item?.seller_slug,
    item?.sellerSlug,
  ]

  const directMatch = directCandidates.find(
    (value) => String(value || '').trim(),
  )
  if (directMatch) return String(directMatch).trim()

  if (Array.isArray(item?.brands)) {
    const firstBrand = item.brands.find((brand) =>
      String(brand?.slug || brand?.brand_slug || '').trim(),
    )
    if (firstBrand) {
      return String(
        firstBrand?.slug || firstBrand?.brand_slug || '',
      ).trim()
    }
  }

  return ''
}

const normalizeProduct = (item) => {
  const images = Array.isArray(item?.images) ? item.images : []
  const imageUrls = images
    .map((image) => (typeof image === 'string' ? image : image?.url))
    .filter(Boolean)
  const basePrice = Number(item?.price) || 0
  const discountPrice = Number(item?.discount_price) || 0
  const hasDiscount = discountPrice > 0 && discountPrice < basePrice
  const price = hasDiscount ? discountPrice : basePrice
  const originalPrice =
    hasDiscount && basePrice ? basePrice : Number(item?.originalPrice) || null
  const variationColors = deriveOptionsFromVariations(item?.variations, ['color', 'colour'])
  const variationSizes = deriveOptionsFromVariations(item?.variations, ['size'])
  const videoUrl = String(item?.product_video_url || item?.video || '').trim()
  const galleryMedia = []
  if (videoUrl) {
    galleryMedia.push({
      type: 'video',
      url: videoUrl,
      poster: imageUrls[0] || item?.image_url || item?.image || '',
    })
  }
  ;(Array.isArray(item?.galleryMedia) ? item.galleryMedia : []).forEach((entry) => {
    const type = entry?.type === 'video' ? 'video' : 'image'
    const url = String(entry?.url || '').trim()
    if (!url) return
    galleryMedia.push({
      type,
      url,
      poster: String(entry?.poster || '').trim(),
    })
  })
  imageUrls.forEach((url) => {
    galleryMedia.push({ type: 'image', url, poster: '' })
  })

  return {
    id: item?.id,
    name: item?.name || 'Untitled product',
    slug: item?.slug || '',
    categories: Array.isArray(item?.categories) ? item.categories : [],
    tags: Array.isArray(item?.tags) ? item.tags : [],
    category:
      item?.category ||
      (Array.isArray(item?.categories) ? item.categories[0]?.name : '') ||
      'Uncategorized',
    vendor: resolveVendorName(item),
    vendorSlug: resolveVendorSlug(item),
    vendorFont: item?.vendorFont || 'Georgia, serif',
    shortDescription: item?.short_description || item?.shortDescription || '',
    fullDescription: item?.description || item?.fullDescription || '',
    sku: item?.sku || '',
    price,
    originalPrice,
    rating: Number(item?.rating) || 0,
    reviews: Number(item?.reviews) || 0,
    colors: variationColors.length
      ? variationColors
      : Array.isArray(item?.colors)
        ? item.colors
        : [],
    sizes: variationSizes.length
      ? variationSizes
      : Array.isArray(item?.sizes)
        ? item.sizes
        : [],
    isTrending: Boolean(item?.isTrending),
    isPortrait: Boolean(item?.isPortrait),
    image: item?.image_url || item?.image || imageUrls[0] || '',
    gallery: imageUrls.length ? imageUrls : item?.gallery || [],
    video: videoUrl,
    galleryMedia,
    images,
    stock: Number.isFinite(Number(item?.stock_quantity))
      ? Number(item.stock_quantity)
      : Number(item?.stock) || 0,
    productType: item?.product_type || item?.productType || '',
    conditionCheck: item?.condition_check || item?.conditionCheck || '',
    packagingStyle: item?.packaging_style || item?.packagingStyle || '',
    returnPolicy: item?.return_policy || item?.returnPolicy || '',
    customAttributes: buildCustomAttributes(item),
    createdAt: item?.created_at || item?.createdAt || '',
    variations: Array.isArray(item?.variations) ? item.variations : [],
  }
}

export default normalizeProduct
