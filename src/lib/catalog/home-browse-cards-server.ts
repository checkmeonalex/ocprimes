import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { getSupabaseConfig } from '@/lib/supabase/config'

const CATEGORY_TABLE = 'admin_categories'
const TABLE = 'admin_category_browse_cards'

export const HOME_BROWSE_CARDS_REVALIDATE_SECONDS = 60

const createPublicSupabaseClient = () => {
  const { url, anonKey } = getSupabaseConfig()
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

const loadBrowseCardsBySlug = unstable_cache(
  async (slug: string) => {
    const supabase = createPublicSupabaseClient()

    const { data: category, error: categoryError } = await supabase
      .from(CATEGORY_TABLE)
      .select('id, browse_categories_title')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()

    if (categoryError) {
      console.error('home browse cards category load failed:', categoryError.message)
      return { title: null, items: [] }
    }

    if (!category?.id) {
      return { title: null, items: [] }
    }

    const { data, error } = await supabase
      .from(TABLE)
      .select('id, segment, name, link, image_url, image_alt, sort_order')
      .eq('category_id', category.id)
      .order('segment', { ascending: true })
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('home browse cards items load failed:', error.message)
      return {
        title: category.browse_categories_title || null,
        items: [],
      }
    }

    return {
      title: category.browse_categories_title || null,
      items: data || [],
    }
  },
  ['home-browse-cards'],
  { revalidate: HOME_BROWSE_CARDS_REVALIDATE_SECONDS },
)

export const getCachedBrowseCardsByCategorySlug = async (slug: string) =>
  loadBrowseCardsBySlug(String(slug || '').trim().toLowerCase())
