import { productsData } from '@/components/data/products'

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const normalizeSeedProduct = (item) => {
  const basePrice = Number(item?.originalPrice) || Number(item?.price) || 0
  const salePrice = Number(item?.price) || 0
  const hasDiscount = salePrice > 0 && salePrice < basePrice
  const gallery = Array.isArray(item?.gallery) ? item.gallery : []
  const images = (gallery.length ? gallery : [item?.image])
    .filter(Boolean)
    .map((url, index) => ({
      id: `seed-${item?.id || 'product'}-image-${index}`,
      product_id: `seed-${item?.id || 'product'}`,
      url,
      alt_text: item?.name || '',
      sort_order: index,
    }))

  return {
    id: `seed-${item?.id || 'product'}`,
    name: item?.name || 'Untitled product',
    slug: item?.slug || slugify(item?.name || ''),
    short_description: item?.shortDescription || '',
    description: item?.fullDescription || '',
    price: basePrice,
    discount_price: hasDiscount ? salePrice : null,
    sku: item?.sku || null,
    stock_quantity: Number(item?.stock) || 0,
    status: 'publish',
    main_image_id: images[0]?.id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    images,
    image_url: images[0]?.url || '',
    categories: item?.category
      ? [
          {
            id: `seed-category-${slugify(item.category)}`,
            name: item.category,
            slug: slugify(item.category),
          },
        ]
      : [],
    tags: [],
    brands: item?.vendor
      ? [
          {
            id: `seed-brand-${slugify(item.vendor)}`,
            name: item.vendor,
            slug: slugify(item.vendor),
          },
        ]
      : [],
  }
}

const SEED_PRODUCTS = Array.isArray(productsData)
  ? productsData.map(normalizeSeedProduct)
  : []

export const getSeedProducts = () => SEED_PRODUCTS

export const findSeedProduct = (slug) =>
  SEED_PRODUCTS.find((item) => item.slug === slug)

export const filterSeedProducts = ({ search = '', category = '', vendor = '' } = {}) => {
  const searchTerm = search ? String(search).toLowerCase() : ''
  const categorySlug = category ? slugify(category) : ''
  const vendorSlug = vendor ? slugify(vendor) : ''

  return SEED_PRODUCTS.filter((item) => {
    if (categorySlug) {
      const matchesCategory = item.categories?.some(
        (cat) => cat?.slug === categorySlug,
      )
      if (!matchesCategory) return false
    }
    if (vendorSlug) {
      const matchesVendor = item.brands?.some((brand) => brand?.slug === vendorSlug)
      if (!matchesVendor) return false
    }
    if (!searchTerm) return true
    return (
      item.name?.toLowerCase().includes(searchTerm) ||
      item.slug?.toLowerCase().includes(searchTerm) ||
      item.sku?.toLowerCase().includes(searchTerm)
    )
  })
}

export const mergeSeedAndDbProducts = (seedItems, dbItems, { dbFirst = true } = {}) => {
  const merged = new Map()
  seedItems.forEach((item) => merged.set(item.slug, item))
  dbItems.forEach((item) => merged.set(item.slug, item))

  const ordered = dbFirst ? [...dbItems, ...seedItems] : [...seedItems, ...dbItems]
  const seen = new Set()
  const result = []

  ordered.forEach((item) => {
    const slug = item?.slug
    if (!slug || seen.has(slug)) return
    const mergedItem = merged.get(slug)
    if (!mergedItem) return
    result.push(mergedItem)
    seen.add(slug)
  })

  return result
}
