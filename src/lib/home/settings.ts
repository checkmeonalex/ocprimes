import 'server-only'

import { unstable_cache } from 'next/cache'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import {
  homePageRecordSchema,
  homeSettingsUpdateSchema,
  normalizeHomeLayoutOrder,
  type HomePageRecord,
  type HomeSettingsUpdateInput,
} from '@/lib/home/schema'

const HOME_TABLE = 'admin_home_pages'
const CATEGORY_TABLE = 'admin_categories'

const HOME_PAGE_SELECT = [
  'id',
  'page_key',
  'legacy_category_id',
  'banner_slider_urls',
  'banner_slider_keys',
  'banner_slider_mobile_urls',
  'banner_slider_mobile_keys',
  'banner_slider_links',
  'featured_strip_image_url',
  'featured_strip_image_key',
  'featured_strip_tag_id',
  'featured_strip_category_id',
  'hotspot_title_main',
  'featured_strip_title_main',
  'browse_categories_title',
  'home_catalog_title',
  'home_catalog_description',
  'home_catalog_filter_mode',
  'home_catalog_category_id',
  'home_catalog_tag_id',
  'home_catalog_limit',
  'layout_order',
  'home_blocks',
  'is_active',
  'created_at',
  'updated_at',
].join(', ')

const LEGACY_HOME_CATEGORY_SELECT = [
  'id',
  'banner_slider_urls',
  'banner_slider_keys',
  'banner_slider_mobile_urls',
  'banner_slider_mobile_keys',
  'banner_slider_links',
  'featured_strip_image_url',
  'featured_strip_image_key',
  'featured_strip_tag_id',
  'featured_strip_category_id',
  'hotspot_title_main',
  'featured_strip_title_main',
  'browse_categories_title',
  'home_catalog_title',
  'home_catalog_description',
  'home_catalog_filter_mode',
  'home_catalog_category_id',
  'home_catalog_tag_id',
  'home_catalog_limit',
  'layout_order',
  'is_active',
  'created_at',
  'updated_at',
].join(', ')

export const HOME_PAGE_REVALIDATE_SECONDS = 60
export const HOME_PAGE_CACHE_TAG = 'home-page'

const normalizeRecord = (value: unknown): HomePageRecord | null => {
  const parsed = homePageRecordSchema.safeParse(value)
  if (!parsed.success) return null

  return {
    ...parsed.data,
    layout_order: normalizeHomeLayoutOrder(parsed.data.layout_order),
    home_catalog_limit: Number(parsed.data.home_catalog_limit) > 0 ? parsed.data.home_catalog_limit : 12,
  }
}

const toInsertPayloadFromLegacyCategory = (category: Record<string, any>) => ({
  page_key: 'home',
  legacy_category_id: category?.id || null,
  banner_slider_urls: Array.isArray(category?.banner_slider_urls) ? category.banner_slider_urls : [],
  banner_slider_keys: Array.isArray(category?.banner_slider_keys) ? category.banner_slider_keys : [],
  banner_slider_mobile_urls: Array.isArray(category?.banner_slider_mobile_urls)
    ? category.banner_slider_mobile_urls
    : [],
  banner_slider_mobile_keys: Array.isArray(category?.banner_slider_mobile_keys)
    ? category.banner_slider_mobile_keys
    : [],
  banner_slider_links: Array.isArray(category?.banner_slider_links) ? category.banner_slider_links : [],
  featured_strip_image_url: category?.featured_strip_image_url || null,
  featured_strip_image_key: category?.featured_strip_image_key || null,
  featured_strip_tag_id: category?.featured_strip_tag_id || null,
  featured_strip_category_id: category?.featured_strip_category_id || null,
  hotspot_title_main: category?.hotspot_title_main || null,
  featured_strip_title_main: category?.featured_strip_title_main || null,
  browse_categories_title: category?.browse_categories_title || null,
  home_catalog_title: category?.home_catalog_title || null,
  home_catalog_description: category?.home_catalog_description || null,
  home_catalog_filter_mode: category?.home_catalog_filter_mode || 'none',
  home_catalog_category_id: category?.home_catalog_category_id || null,
  home_catalog_tag_id: category?.home_catalog_tag_id || null,
  home_catalog_limit: Number(category?.home_catalog_limit) > 0 ? Number(category.home_catalog_limit) : 12,
  layout_order: normalizeHomeLayoutOrder(category?.layout_order),
  is_active: category?.is_active ?? true,
})

async function readLegacyHomeCategory(supabase: any) {
  const { data, error } = await supabase
    .from(CATEGORY_TABLE)
    .select(LEGACY_HOME_CATEGORY_SELECT)
    .eq('slug', 'home')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { item: null, error }
  }

  return { item: data || null, error: null }
}

export async function getLegacyHomeCategory(supabase = createAdminSupabaseClient()) {
  const result = await readLegacyHomeCategory(supabase)
  return {
    item: result.item,
    errorMessage: result.error ? 'Unable to load home page category.' : '',
  }
}

async function readHomePageRecord(supabase: any) {
  const { data, error } = await supabase
    .from(HOME_TABLE)
    .select(HOME_PAGE_SELECT)
    .eq('page_key', 'home')
    .maybeSingle()

  if (error) {
    return { item: null, error }
  }

  return { item: normalizeRecord(data), error: null }
}

export async function ensureHomePageRecord(supabase: any) {
  const existing = await readHomePageRecord(supabase)
  if (existing.item) {
    return { item: existing.item, errorMessage: '' }
  }

  const existingCode = (existing.error as { code?: string } | null)?.code
  if (existingCode === '42P01') {
    return {
      item: null,
      errorMessage: 'Missing home page table. Run migration 087_admin_category_stories.sql (admin_home_pages).',
    }
  }

  if (existing.error) {
    return { item: null, errorMessage: 'Unable to load home page settings.' }
  }

  const legacy = await readLegacyHomeCategory(supabase)
  if (legacy.error) {
    return { item: null, errorMessage: 'Unable to load home page settings.' }
  }

  if (!legacy.item) {
    const { data: inserted, error: insertError } = await supabase
      .from(HOME_TABLE)
      .insert({ page_key: 'home' })
      .select(HOME_PAGE_SELECT)
      .single()

    if (insertError) {
      const insertCode = (insertError as { code?: string })?.code
      if (insertCode === '42P01') {
        return {
          item: null,
          errorMessage: 'Missing home page table. Run migration 087_admin_category_stories.sql (admin_home_pages).',
        }
      }
      return { item: null, errorMessage: 'Unable to create home page settings.' }
    }

    return { item: normalizeRecord(inserted), errorMessage: '' }
  }

  const payload = toInsertPayloadFromLegacyCategory(legacy.item)
  const { data: inserted, error: insertError } = await supabase
    .from(HOME_TABLE)
    .insert(payload)
    .select(HOME_PAGE_SELECT)
    .single()

  if (insertError) {
    const insertCode = (insertError as { code?: string })?.code
    if (insertCode === '42P01') {
      return {
        item: null,
        errorMessage: 'Missing home page table. Run migration 087_admin_category_stories.sql (admin_home_pages).',
      }
    }
    if (insertCode === '23505') {
      const retry = await readHomePageRecord(supabase)
      if (retry.item) {
        return { item: retry.item, errorMessage: '' }
      }
    }
    return { item: null, errorMessage: 'Unable to create home page settings.' }
  }

  return { item: normalizeRecord(inserted), errorMessage: '' }
}

export async function getHomePageSettings(supabase = createAdminSupabaseClient()) {
  const result = await ensureHomePageRecord(supabase)
  return {
    item: result.item,
    errorMessage: result.errorMessage,
  }
}

export async function updateHomePageSettings(
  supabase: any,
  input: HomeSettingsUpdateInput,
) {
  const parsed = homeSettingsUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { item: null, errorMessage: 'Invalid home page payload.' }
  }

  const current = await ensureHomePageRecord(supabase)
  if (!current.item) {
    return {
      item: null,
      errorMessage:
        current.errorMessage || 'Home page record is not ready. Run migration 087_admin_category_stories.sql (admin_home_pages).',
    }
  }

  const updates: Record<string, any> = {}
  const data = parsed.data

  if (data.banner_slider_urls !== undefined) updates.banner_slider_urls = data.banner_slider_urls
  if (data.banner_slider_keys !== undefined) updates.banner_slider_keys = data.banner_slider_keys
  if (data.banner_slider_mobile_urls !== undefined) {
    updates.banner_slider_mobile_urls = data.banner_slider_mobile_urls
  }
  if (data.banner_slider_mobile_keys !== undefined) {
    updates.banner_slider_mobile_keys = data.banner_slider_mobile_keys
  }
  if (data.banner_slider_links !== undefined) updates.banner_slider_links = data.banner_slider_links
  if (data.featured_strip_image_url !== undefined) {
    updates.featured_strip_image_url = data.featured_strip_image_url
  }
  if (data.featured_strip_image_key !== undefined) {
    updates.featured_strip_image_key = data.featured_strip_image_key
  }
  if (data.featured_strip_tag_id !== undefined) updates.featured_strip_tag_id = data.featured_strip_tag_id
  if (data.featured_strip_category_id !== undefined) {
    updates.featured_strip_category_id = data.featured_strip_category_id
  }
  if (data.hotspot_title_main !== undefined) updates.hotspot_title_main = data.hotspot_title_main
  if (data.featured_strip_title_main !== undefined) {
    updates.featured_strip_title_main = data.featured_strip_title_main
  }
  if (data.browse_categories_title !== undefined) {
    updates.browse_categories_title = data.browse_categories_title
  }
  if (data.home_catalog_title !== undefined) updates.home_catalog_title = data.home_catalog_title
  if (data.home_catalog_description !== undefined) {
    updates.home_catalog_description = data.home_catalog_description
  }
  if (data.home_catalog_filter_mode !== undefined) {
    updates.home_catalog_filter_mode = data.home_catalog_filter_mode
  }
  if (data.home_catalog_category_id !== undefined) {
    updates.home_catalog_category_id = data.home_catalog_category_id
  }
  if (data.home_catalog_tag_id !== undefined) updates.home_catalog_tag_id = data.home_catalog_tag_id
  if (data.home_catalog_limit !== undefined) updates.home_catalog_limit = data.home_catalog_limit
  if (data.layout_order !== undefined) updates.layout_order = normalizeHomeLayoutOrder(data.layout_order)
  if (data.home_blocks !== undefined) updates.home_blocks = Array.isArray(data.home_blocks) ? data.home_blocks : []

  const { data: updated, error } = await supabase
    .from(HOME_TABLE)
    .update(updates)
    .eq('id', current.item.id)
    .select(HOME_PAGE_SELECT)
    .single()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    if (errorCode === '42P01') {
      return {
        item: null,
        errorMessage: 'Missing home page table. Run migration 087_admin_category_stories.sql (admin_home_pages).',
      }
    }
    return { item: null, errorMessage: 'Unable to save home page settings.' }
  }

  return { item: normalizeRecord(updated), errorMessage: '' }
}

const loadCachedHomePageSettings = unstable_cache(
  async () => {
    const result = await getHomePageSettings()
    if (result.errorMessage) {
      console.error('home page settings load failed:', result.errorMessage)
    }
    return result.item
  },
  ['home-page-settings'],
  {
    revalidate: HOME_PAGE_REVALIDATE_SECONDS,
    tags: [HOME_PAGE_CACHE_TAG],
  },
)

export const getCachedHomePageSettings = async () => loadCachedHomePageSettings()
