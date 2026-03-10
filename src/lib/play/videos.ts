import 'server-only'

import { unstable_noStore as noStore } from 'next/cache'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { slugifyVendor } from '@/lib/catalog/vendor'

const PRODUCT_TABLE = 'products'
const CATEGORY_LINKS = 'product_category_links'
const BRAND_LINKS = 'product_brand_links'
const BRAND_TABLE = 'admin_brands'
const IMAGE_TABLE = 'product_images'
const VARIATION_TABLE = 'product_variations'

const PRODUCT_LIMIT = 120

type ProductRow = {
  id?: string | null
  name?: string | null
  slug?: string | null
  short_description?: string | null
  product_video_url?: string | null
  price?: number | string | null
  discount_price?: number | string | null
  main_image_id?: string | null
  created_by?: string | null
  created_at?: string | null
}

type CategoryRow = {
  product_id?: string | null
  admin_categories?:
    | { id?: string | null; name?: string | null; slug?: string | null; parent_id?: string | null }
    | Array<{ id?: string | null; name?: string | null; slug?: string | null; parent_id?: string | null }>
}

type BrandRow = {
  product_id?: string | null
  admin_brands?:
    | {
        id?: string | null
        name?: string | null
        slug?: string | null
        logo_url?: string | null
        created_by?: string | null
      }
    | Array<{
        id?: string | null
        name?: string | null
        slug?: string | null
        logo_url?: string | null
        created_by?: string | null
      }>
}

type ImageRow = {
  id?: string | null
  product_id?: string | null
  url?: string | null
  sort_order?: number | null
}

type VariationRow = {
  id?: string | null
  product_id?: string | null
}

export type PlayVideoItem = {
  id: string
  slug: string
  product_name: string
  short_description: string
  video_url: string
  poster_url: string
  seller_name: string
  seller_slug: string
  seller_logo_url: string
  leaf_category_id: string
  leaf_category_name: string
  leaf_category_slug: string
  created_at: string
  price: number
  discount_price: number
  variation_count: number
}

type NormalizedBrand = {
  id: string
  name: string
  slug: string
  logo_url: string
  created_by: string
}

const normalizeCategoryRelation = (value: CategoryRow['admin_categories']) => {
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

const normalizeBrandRelation = (value: BrandRow['admin_brands']) => {
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

const pickLeafCategory = (
  categories: Array<{ id?: string | null; name?: string | null; slug?: string | null; parent_id?: string | null }>,
) => {
  if (!categories.length) return null
  const ids = new Set(categories.map((entry) => String(entry?.id || '').trim()).filter(Boolean))
  const leaf = categories.find((entry) => {
    const entryId = String(entry?.id || '').trim()
    if (!entryId) return false
    return !categories.some((candidate) => String(candidate?.parent_id || '').trim() === entryId)
  })

  if (leaf) return leaf

  const deepestFallback = categories.find((entry) => {
    const parentId = String(entry?.parent_id || '').trim()
    return parentId && ids.has(parentId)
  })

  return deepestFallback || categories[categories.length - 1] || null
}

const normalizeBrandRecord = (value: {
  id?: string | null
  name?: string | null
  slug?: string | null
  logo_url?: string | null
  created_by?: string | null
} | null | undefined): NormalizedBrand | null => {
  const id = String(value?.id || '').trim()
  const name = String(value?.name || '').trim()
  if (!id || !name) return null

  const slug = String(value?.slug || '').trim() || slugifyVendor(name)
  return {
    id,
    name,
    slug,
    logo_url: String(value?.logo_url || '').trim(),
    created_by: String(value?.created_by || '').trim(),
  }
}

export const listPlayVideos = async (): Promise<PlayVideoItem[]> => {
  noStore()

  const supabase = createAdminSupabaseClient()
  const { data: productRows, error: productError } = await supabase
    .from(PRODUCT_TABLE)
    .select(
      'id, name, slug, short_description, product_video_url, price, discount_price, main_image_id, created_by, created_at',
    )
    .eq('status', 'publish')
    .not('product_video_url', 'is', null)
    .neq('product_video_url', '')
    .order('created_at', { ascending: false })
    .limit(PRODUCT_LIMIT)

  if (productError) {
    console.error('play videos product lookup failed:', productError.message)
    return []
  }

  const products = (Array.isArray(productRows) ? productRows : []) as ProductRow[]
  const productIds = products
    .map((row) => String(row?.id || '').trim())
    .filter(Boolean)

  if (!productIds.length) return []

  const [categoryRes, brandRes, imageRes, variationRes] = await Promise.all([
    supabase
      .from(CATEGORY_LINKS)
      .select('product_id, admin_categories(id, name, slug, parent_id)')
      .in('product_id', productIds),
    supabase
      .from(BRAND_LINKS)
      .select('product_id, admin_brands(id, name, slug, logo_url, created_by)')
      .in('product_id', productIds),
    supabase
      .from(IMAGE_TABLE)
      .select('id, product_id, url, sort_order')
      .in('product_id', productIds)
      .order('sort_order', { ascending: true }),
    supabase
      .from(VARIATION_TABLE)
      .select('id, product_id')
      .in('product_id', productIds),
  ])

  if (categoryRes.error) {
    console.error('play videos category lookup failed:', categoryRes.error.message)
  }
  if (brandRes.error) {
    console.error('play videos brand lookup failed:', brandRes.error.message)
  }
  if (imageRes.error) {
    console.error('play videos image lookup failed:', imageRes.error.message)
  }
  if (variationRes.error) {
    console.error('play videos variation lookup failed:', variationRes.error.message)
  }

  const categoriesByProductId = new Map<string, ReturnType<typeof normalizeCategoryRelation>>()
  ;((categoryRes.data || []) as CategoryRow[]).forEach((row) => {
    const productId = String(row?.product_id || '').trim()
    if (!productId) return
    const list = categoriesByProductId.get(productId) || []
    categoriesByProductId.set(productId, [...list, ...normalizeCategoryRelation(row.admin_categories)])
  })

  const brandsByProductId = new Map<string, ReturnType<typeof normalizeBrandRelation>>()
  ;((brandRes.data || []) as BrandRow[]).forEach((row) => {
    const productId = String(row?.product_id || '').trim()
    if (!productId) return
    const list = brandsByProductId.get(productId) || []
    brandsByProductId.set(productId, [...list, ...normalizeBrandRelation(row.admin_brands)])
  })

  const creatorIds = Array.from(
    new Set(
      products
        .map((row) => String(row?.created_by || '').trim())
        .filter(Boolean),
    ),
  )
  const fallbackBrandByCreatorId = new Map<string, NormalizedBrand>()

  if (creatorIds.length) {
    const { data: creatorBrandRows, error: creatorBrandError } = await supabase
      .from(BRAND_TABLE)
      .select('id, name, slug, logo_url, created_by')
      .in('created_by', creatorIds)

    if (creatorBrandError) {
      console.error('play videos creator brand lookup failed:', creatorBrandError.message)
    } else {
      ;((creatorBrandRows || []) as Array<{
        id?: string | null
        name?: string | null
        slug?: string | null
        logo_url?: string | null
        created_by?: string | null
      }>).forEach((row) => {
        const creatorId = String(row?.created_by || '').trim()
        if (!creatorId || fallbackBrandByCreatorId.has(creatorId)) return
        const normalized = normalizeBrandRecord(row)
        if (normalized) fallbackBrandByCreatorId.set(creatorId, normalized)
      })
    }
  }

  const posterByProductId = new Map<string, string>()
  const posterByImageId = new Map<string, string>()
  ;((imageRes.data || []) as ImageRow[]).forEach((row) => {
    const imageId = String(row?.id || '').trim()
    const productId = String(row?.product_id || '').trim()
    const url = String(row?.url || '').trim()
    if (imageId && url && !posterByImageId.has(imageId)) {
      posterByImageId.set(imageId, url)
    }
    if (!productId || !url || posterByProductId.has(productId)) return
    posterByProductId.set(productId, url)
  })

  const variationCountByProductId = new Map<string, number>()
  ;((variationRes.data || []) as VariationRow[]).forEach((row) => {
    const productId = String(row?.product_id || '').trim()
    if (!productId) return
    variationCountByProductId.set(productId, (variationCountByProductId.get(productId) || 0) + 1)
  })

  return products
    .map((product) => {
      const productId = String(product?.id || '').trim()
      const slug = String(product?.slug || '').trim()
      const videoUrl = String(product?.product_video_url || '').trim()
      const productName = String(product?.name || '').trim()
      if (!productId || !slug || !videoUrl || !productName) return null

      const leafCategory = pickLeafCategory(categoriesByProductId.get(productId) || [])
      const leafCategoryId = String(leafCategory?.id || '').trim()
      const leafCategoryName = String(leafCategory?.name || '').trim()
      const leafCategorySlug = String(leafCategory?.slug || '').trim()
      if (!leafCategoryId || !leafCategoryName || !leafCategorySlug) return null

      const creatorId = String(product?.created_by || '').trim()
      const linkedBrand =
        (brandsByProductId.get(productId) || [])
          .map((entry) => normalizeBrandRecord(entry))
          .find(Boolean) || null
      const primaryBrand = linkedBrand || fallbackBrandByCreatorId.get(creatorId) || null
      const sellerName = String(primaryBrand?.name || '').trim() || 'Store'
      const mainImageId = String(product?.main_image_id || '').trim()

      return {
        id: productId,
        slug,
        product_name: productName,
        short_description: String(product?.short_description || '').trim() || productName,
        video_url: videoUrl,
        poster_url: String(
          (mainImageId && posterByImageId.get(mainImageId)) || posterByProductId.get(productId) || '',
        ).trim(),
        seller_name: sellerName,
        seller_slug: String(primaryBrand?.slug || '').trim() || slugifyVendor(sellerName),
        seller_logo_url: String(primaryBrand?.logo_url || '').trim(),
        leaf_category_id: leafCategoryId,
        leaf_category_name: leafCategoryName,
        leaf_category_slug: leafCategorySlug,
        created_at: String(product?.created_at || '').trim(),
        price: Number(product?.price) || 0,
        discount_price: Number(product?.discount_price) || 0,
        variation_count: variationCountByProductId.get(productId) || 0,
      }
    })
    .filter(Boolean) as PlayVideoItem[]
}
