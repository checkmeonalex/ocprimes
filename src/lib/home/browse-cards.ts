import 'server-only'

import { unstable_cache } from 'next/cache'
import { browseCardsSchema } from '@/lib/admin/browse-cards'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import {
  getHomePageSettings,
  getLegacyHomeCategory,
  HOME_PAGE_CACHE_TAG,
  HOME_PAGE_REVALIDATE_SECONDS,
} from '@/lib/home/settings'

const HOME_BROWSE_TABLE = 'admin_home_browse_cards'
const LEGACY_BROWSE_TABLE = 'admin_category_browse_cards'

const BROWSE_SELECT =
  'id, segment, name, link, image_url, image_key, image_alt, sort_order, created_at'

export const HOME_BROWSE_CARDS_CACHE_TAG = 'home-browse-cards'

const normalizeItems = (items: unknown[] = []) => {
  const parsed = browseCardsSchema.safeParse({ items })
  return parsed.success ? parsed.data.items : []
}

async function listLegacyBrowseCards(supabase: any, categoryId: string) {
  if (!categoryId) return { items: [], errorMessage: '' }

  const { data, error } = await supabase
    .from(LEGACY_BROWSE_TABLE)
    .select(BROWSE_SELECT)
    .eq('category_id', categoryId)
    .order('segment', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) {
    const errorCode = (error as { code?: string })?.code
    if (errorCode === '42P01') {
      return { items: [], errorMessage: 'Missing browse card table. Run migration 031_admin_category_browse_cards.sql.' }
    }
    return { items: [], errorMessage: 'Unable to load browse cards.' }
  }

  return { items: normalizeItems(data || []), errorMessage: '' }
}

export async function getHomeBrowseCards(supabase = createAdminSupabaseClient()) {
  const home = await getHomePageSettings(supabase)
  const fallbackTitle = home.item?.browse_categories_title || null

  if (!home.item) {
    const legacy = await getLegacyHomeCategory(supabase)
    if (!legacy.item?.id) {
      return { title: fallbackTitle, items: [], errorMessage: home.errorMessage || legacy.errorMessage }
    }
    const legacyItems = await listLegacyBrowseCards(supabase, legacy.item.id)
    return {
      title: legacy.item.browse_categories_title || null,
      items: legacyItems.items,
      errorMessage: legacyItems.errorMessage,
    }
  }

  const { data, error } = await supabase
    .from(HOME_BROWSE_TABLE)
    .select(BROWSE_SELECT)
    .eq('home_page_id', home.item.id)
    .order('segment', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) {
    const errorCode = (error as { code?: string })?.code
    if (errorCode === '42P01' && home.item.legacy_category_id) {
      const legacyItems = await listLegacyBrowseCards(supabase, home.item.legacy_category_id)
      return {
        title: fallbackTitle,
        items: legacyItems.items,
        errorMessage: legacyItems.errorMessage,
      }
    }
    return {
      title: fallbackTitle,
      items: [],
      errorMessage: 'Unable to load browse cards.',
    }
  }

  return {
    title: fallbackTitle,
    items: normalizeItems(data || []),
    errorMessage: '',
  }
}

export async function replaceHomeBrowseCards(supabase: any, items: unknown[]) {
  const parsed = browseCardsSchema.safeParse({ items })
  if (!parsed.success) {
    return { items: [], errorMessage: 'Invalid browse cards payload.' }
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
    .from(HOME_BROWSE_TABLE)
    .delete()
    .eq('home_page_id', home.item.id)

  if (deleteError) {
    const errorCode = (deleteError as { code?: string })?.code
    if (errorCode === '42P01') {
      return { items: [], errorMessage: 'Missing home browse card table. Run migration 088_admin_home_browse_cards.sql.' }
    }
    return { items: [], errorMessage: 'Unable to update browse cards.' }
  }

  if (parsed.data.items.length) {
    const counters = { all: 0, men: 0, women: 0 }
    const payload = parsed.data.items.map((item) => {
      const sortOrder = counters[item.segment]
      counters[item.segment] += 1
      return {
        home_page_id: home.item?.id,
        segment: item.segment,
        name: item.name,
        link: item.link || null,
        image_url: item.image_url,
        image_key: item.image_key || null,
        image_alt: item.image_alt || null,
        sort_order: sortOrder,
      }
    })

    const { error: insertError } = await supabase.from(HOME_BROWSE_TABLE).insert(payload)
    if (insertError) {
      const errorCode = (insertError as { code?: string })?.code
      if (errorCode === '42P01') {
        return { items: [], errorMessage: 'Missing home browse card table. Run migration 088_admin_home_browse_cards.sql.' }
      }
      return { items: [], errorMessage: 'Unable to save browse cards.' }
    }
  }

  const latest = await getHomeBrowseCards(supabase)
  return { items: latest.items, errorMessage: latest.errorMessage }
}

const loadCachedHomeBrowseCards = unstable_cache(
  async () => {
    const result = await getHomeBrowseCards()
    if (result.errorMessage) {
      console.error('home browse cards load failed:', result.errorMessage)
    }
    return {
      title: result.title,
      items: result.items,
    }
  },
  ['home-browse-cards'],
  {
    revalidate: HOME_PAGE_REVALIDATE_SECONDS,
    tags: [HOME_PAGE_CACHE_TAG, HOME_BROWSE_CARDS_CACHE_TAG],
  },
)

export const getCachedHomeBrowseCards = async () => loadCachedHomeBrowseCards()
