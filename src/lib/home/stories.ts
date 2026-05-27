import 'server-only'

import { z } from 'zod'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { homeStoriesSchema } from '@/lib/home-stories/schema'
import {
  getHomePageSettings,
} from '@/lib/home/settings'
import {
  listCategoryStories,
} from '@/lib/home-stories/service'

const HOME_STORIES_TABLE = 'admin_home_stories'
const MISSING_COLUMN_CODE = '42703'

const HOME_STORY_RECORD_SCHEMA = z.object({
  id: z.string().uuid(),
  home_page_id: z.string().uuid(),
  title: z.string().min(1).max(80),
  media_type: z.enum(['image', 'video']),
  media_url: z.string().url().min(1),
  media_key: z.string().nullable().optional(),
  media_alt: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
  created_at: z.string().nullable().optional(),
})

type HomeStoryRecord = z.infer<typeof HOME_STORY_RECORD_SCHEMA>

type ProductVideoRow = {
  product_id?: string | null
  r2_key?: string | null
  url?: string | null
  created_by?: string | null
}

type ProductRow = {
  id?: string | null
  name?: string | null
  slug?: string | null
  status?: string | null
  price?: number | string | null
  discount_price?: number | string | null
  main_image_id?: string | null
  product_video_key?: string | null
  product_video_url?: string | null
  product_type?: string | null
  created_by?: string | null
}

type ProductImageRow = {
  id?: string | null
  product_id?: string | null
  url?: string | null
  sort_order?: number | null
}

type ProductVariationRow = {
  product_id?: string | null
}

type BrandLinkRow = {
  product_id?: string | null
  admin_brands?:
    | { name?: string | null; created_by?: string | null }
    | Array<{ name?: string | null; created_by?: string | null }>
}

type HomeStoryWithMetadata = HomeStoryRecord & {
  seller_name?: string
  product_name?: string
  product_id?: string
  product_slug?: string
  product_price?: number
  product_discount_price?: number
  product_image_url?: string
  has_variants?: boolean
}

type StoryRecordWithMedia = {
  id: string
  title: string
  media_type: 'image' | 'video'
  media_url: string
  media_key?: string | null
  media_alt?: string | null
  sort_order?: number
  created_at?: string | null
}

const STORY_SELECT =
  'id, home_page_id, title, media_type, media_url, media_key, media_alt, sort_order, created_at'

export const HOME_STORIES_CACHE_TAG = 'home-stories'

const normalizeStoryRows = (rows: unknown[] = []): HomeStoryRecord[] =>
  rows
    .map((row) => HOME_STORY_RECORD_SCHEMA.safeParse(row))
    .filter((result) => result.success)
    .map((result) => result.data)

const appendUnique = (list: string[], values: string[]) => {
  values.forEach((value) => {
    const next = String(value || '').trim()
    if (!next || list.includes(next)) return
    list.push(next)
  })
}

const buildSellerMaps = async (
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  productIds: string[],
  ownerIds: string[],
) => {
  const sellerNameByProductId = new Map<string, string>()
  const profileNameByUserId = new Map<string, string>()

  if (productIds.length) {
    const { data: brandLinks, error: brandError } = await supabase
      .from('product_brand_links')
      .select('product_id, admin_brands(name, created_by)')
      .in('product_id', productIds)

    if (brandError) {
      console.error('home stories seller brand lookup failed:', brandError.message)
    } else {
      ;((brandLinks || []) as BrandLinkRow[]).forEach((row) => {
        const productId = String(row?.product_id || '').trim()
        if (!productId || sellerNameByProductId.has(productId)) return
        const relation = row.admin_brands
        const brandName = Array.isArray(relation)
          ? String(relation[0]?.name || '').trim()
          : String(relation?.name || '').trim()
        if (brandName) sellerNameByProductId.set(productId, brandName)
      })
    }
  }

  if (ownerIds.length) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', ownerIds)

    if (profileError) {
      if ((profileError as { code?: string })?.code !== MISSING_COLUMN_CODE) {
        console.error('home stories seller profile lookup failed:', profileError.message)
      }
    } else {
      ;(profiles || []).forEach((row: { id?: string | null; full_name?: string | null }) => {
        const id = String(row?.id || '').trim()
        const name = String(row?.full_name || '').trim()
        if (id && name) profileNameByUserId.set(id, name)
      })
    }
  }

  return { sellerNameByProductId, profileNameByUserId }
}

const enrichStoriesWithMetadata = async <TStory extends StoryRecordWithMedia>(
  stories: TStory[],
  supabase: ReturnType<typeof createAdminSupabaseClient>,
): Promise<Array<TStory & Omit<HomeStoryWithMetadata, keyof HomeStoryRecord>>> => {
  const videoStories = stories.filter((story) => story.media_type === 'video')
  if (!videoStories.length) return stories

  const keys: string[] = []
  const urls: string[] = []
  videoStories.forEach((story) => {
    appendUnique(keys, [String(story.media_key || '').trim()])
    appendUnique(urls, [String(story.media_url || '').trim()])
  })

  const inventoryByKey = new Map<string, ProductVideoRow>()
  const inventoryByUrl = new Map<string, ProductVideoRow>()

  if (keys.length) {
    const { data, error } = await supabase
      .from('product_videos')
      .select('product_id, r2_key, url, created_by')
      .in('r2_key', keys)

    if (error && (error as { code?: string })?.code !== '42P01') {
      console.error('home stories product video key lookup failed:', error.message)
    } else {
      ;((data || []) as ProductVideoRow[]).forEach((row) => {
        const key = String(row?.r2_key || '').trim()
        const url = String(row?.url || '').trim()
        if (key && !inventoryByKey.has(key)) inventoryByKey.set(key, row)
        if (url && !inventoryByUrl.has(url)) inventoryByUrl.set(url, row)
      })
    }
  }

  if (urls.length) {
    const { data, error } = await supabase
      .from('product_videos')
      .select('product_id, r2_key, url, created_by')
      .in('url', urls)

    if (error && (error as { code?: string })?.code !== '42P01') {
      console.error('home stories product video url lookup failed:', error.message)
    } else {
      ;((data || []) as ProductVideoRow[]).forEach((row) => {
        const key = String(row?.r2_key || '').trim()
        const url = String(row?.url || '').trim()
        if (key && !inventoryByKey.has(key)) inventoryByKey.set(key, row)
        if (url && !inventoryByUrl.has(url)) inventoryByUrl.set(url, row)
      })
    }
  }

  const productsById = new Map<string, ProductRow>()

  const inventoryProductIds = Array.from(
    new Set(
      [...inventoryByKey.values(), ...inventoryByUrl.values()]
        .map((row) => String(row?.product_id || '').trim())
        .filter(Boolean),
    ),
  )

  if (inventoryProductIds.length) {
    const { data, error } = await supabase
      .from('products')
      .select(
        'id, name, slug, status, price, discount_price, main_image_id, product_type, product_video_key, product_video_url, created_by',
      )
      .eq('status', 'publish')
      .in('id', inventoryProductIds)

    if (error) {
      console.error('home stories product lookup by id failed:', error.message)
    } else {
      ;((data || []) as ProductRow[]).forEach((row) => {
        const id = String(row?.id || '').trim()
        if (id) productsById.set(id, row)
      })
    }
  }

  if (keys.length) {
    const { data, error } = await supabase
      .from('products')
      .select(
        'id, name, slug, status, price, discount_price, main_image_id, product_type, product_video_key, product_video_url, created_by',
      )
      .eq('status', 'publish')
      .in('product_video_key', keys)

    if (error) {
      console.error('home stories product lookup by key failed:', error.message)
    } else {
      ;((data || []) as ProductRow[]).forEach((row) => {
        const id = String(row?.id || '').trim()
        if (id && !productsById.has(id)) productsById.set(id, row)
      })
    }
  }

  if (urls.length) {
    const { data, error } = await supabase
      .from('products')
      .select(
        'id, name, slug, status, price, discount_price, main_image_id, product_type, product_video_key, product_video_url, created_by',
      )
      .eq('status', 'publish')
      .in('product_video_url', urls)

    if (error) {
      console.error('home stories product lookup by url failed:', error.message)
    } else {
      ;((data || []) as ProductRow[]).forEach((row) => {
        const id = String(row?.id || '').trim()
        if (id && !productsById.has(id)) productsById.set(id, row)
      })
    }
  }

  const productIds = Array.from(productsById.keys())
  const imageByProductId = new Map<string, string>()
  const imageById = new Map<string, string>()
  const variantProductIds = new Set<string>()

  if (productIds.length) {
    const { data: images, error: imageError } = await supabase
      .from('product_images')
      .select('id, product_id, url, sort_order')
      .in('product_id', productIds)
      .order('sort_order', { ascending: true })

    if (imageError) {
      console.error('home stories product image lookup failed:', imageError.message)
    } else {
      ;((images || []) as ProductImageRow[]).forEach((row) => {
        const imageId = String(row?.id || '').trim()
        const productId = String(row?.product_id || '').trim()
        const url = String(row?.url || '').trim()
        if (imageId && url && !imageById.has(imageId)) imageById.set(imageId, url)
        if (productId && url && !imageByProductId.has(productId)) imageByProductId.set(productId, url)
      })
    }

    const { data: variations, error: variationError } = await supabase
      .from('product_variations')
      .select('product_id')
      .in('product_id', productIds)

    if (variationError && (variationError as { code?: string })?.code !== '42P01') {
      console.error('home stories product variation lookup failed:', variationError.message)
    } else {
      ;((variations || []) as ProductVariationRow[]).forEach((row) => {
        const productId = String(row?.product_id || '').trim()
        if (productId) variantProductIds.add(productId)
      })
    }
  }

  const ownerIds = Array.from(
    new Set(
      [...inventoryByKey.values(), ...inventoryByUrl.values()]
        .map((row) => String(row?.created_by || '').trim())
        .concat(Array.from(productsById.values()).map((row) => String(row?.created_by || '').trim()))
        .filter(Boolean),
    ),
  )

  const { sellerNameByProductId, profileNameByUserId } = await buildSellerMaps(
    supabase,
    productIds,
    ownerIds,
  )

  return stories.map((story) => {
    if (story.media_type !== 'video') return story

    const key = String(story.media_key || '').trim()
    const url = String(story.media_url || '').trim()
    const inventoryRow = (key && inventoryByKey.get(key)) || (url && inventoryByUrl.get(url)) || null

    const matchedProduct =
      (inventoryRow?.product_id && productsById.get(String(inventoryRow.product_id).trim())) ||
      Array.from(productsById.values()).find((row) => {
        const productKey = String(row?.product_video_key || '').trim()
        const productUrl = String(row?.product_video_url || '').trim()
        return (key && productKey === key) || (url && productUrl === url)
      }) ||
      null

    const productId = String(matchedProduct?.id || inventoryRow?.product_id || '').trim()
    const ownerId = String(matchedProduct?.created_by || inventoryRow?.created_by || '').trim()
    const sellerName =
      sellerNameByProductId.get(productId) ||
      profileNameByUserId.get(ownerId) ||
      ''
    const productName = String(matchedProduct?.name || '').trim()
    const productSlug = String(matchedProduct?.slug || '').trim()
    const mainImageId = String(matchedProduct?.main_image_id || '').trim()
    const productImageUrl =
      (mainImageId && imageById.get(mainImageId)) ||
      imageByProductId.get(productId) ||
      ''
    const productPrice = Number(matchedProduct?.price) || 0
    const productDiscountPrice = Number(matchedProduct?.discount_price) || 0

    return {
      ...story,
      seller_name: sellerName || undefined,
      product_name: productName || undefined,
      product_id: productId || undefined,
      product_slug: productSlug || undefined,
      product_price: productPrice || undefined,
      product_discount_price: productDiscountPrice || undefined,
      product_image_url: productImageUrl || undefined,
      has_variants: variantProductIds.has(productId),
    }
  })
}

export async function getHomeStories(supabase = createAdminSupabaseClient()) {
  const home = await getHomePageSettings(supabase)

  if (!home.item) {
    return { items: [], errorMessage: home.errorMessage }
  }

  const { data, error } = await supabase
    .from(HOME_STORIES_TABLE)
    .select(STORY_SELECT)
    .eq('home_page_id', home.item.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    const errorCode = (error as { code?: string })?.code
    if (errorCode === '42P01' && home.item.legacy_category_id) {
      const fallback = await listCategoryStories(supabase, home.item.legacy_category_id)
      return {
        items: await enrichStoriesWithMetadata(fallback.items, supabase),
        errorMessage: fallback.errorMessage || '',
      }
    }
    return { items: [], errorMessage: 'Unable to load stories.' }
  }

  const items = normalizeStoryRows(data || [])
  return { items: await enrichStoriesWithMetadata(items, supabase), errorMessage: '' }
}

export async function replaceHomeStories(supabase: any, items: unknown[]) {
  const parsed = homeStoriesSchema.safeParse({ items })
  if (!parsed.success) {
    return { items: [], errorMessage: 'Invalid stories payload.' }
  }

  const home = await getHomePageSettings(supabase)
  if (!home.item) {
    return {
      items: [],
      errorMessage:
        home.errorMessage || 'Home page record is not ready. Run migration 087_admin_category_stories.sql (admin_home_pages).',
    }
  }

  const { error: deleteError } = await supabase
    .from(HOME_STORIES_TABLE)
    .delete()
    .eq('home_page_id', home.item.id)

  if (deleteError) {
    const errorCode = (deleteError as { code?: string })?.code
    if (errorCode === '42P01') {
      return { items: [], errorMessage: 'Missing home stories table. Run migration 089_admin_home_stories.sql.' }
    }
    return { items: [], errorMessage: 'Unable to update stories.' }
  }

  if (parsed.data.items.length) {
    const payload = parsed.data.items.map((item, index) => ({
      home_page_id: home.item?.id,
      title: item.title,
      media_type: item.media_type,
      media_url: item.media_url,
      media_key: item.media_key || null,
      media_alt: item.media_alt || null,
      sort_order: index,
    }))

    const { error: insertError } = await supabase.from(HOME_STORIES_TABLE).insert(payload)
    if (insertError) {
      const errorCode = (insertError as { code?: string })?.code
      if (errorCode === '42P01') {
        return { items: [], errorMessage: 'Missing home stories table. Run migration 089_admin_home_stories.sql.' }
      }
      return { items: [], errorMessage: 'Unable to save stories.' }
    }
  }

  return getHomeStories(supabase)
}

export const getCachedHomeStories = async () => {
  const result = await getHomeStories()
  if (result.errorMessage) {
    console.error('home stories load failed:', result.errorMessage)
  }
  return result.items
}
