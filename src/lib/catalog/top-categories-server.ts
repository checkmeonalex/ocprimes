import 'server-only'

import { unstable_cache } from 'next/cache'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { buildCategoryTree, mapCategoryTreeToMenu } from '@/lib/categories/tree.mjs'

const NAV_CATEGORY_LIMIT = 500

const loadTopCategories = unstable_cache(
  async () => {
    const db = createAdminSupabaseClient()
    const { data, error } = await db
      .from('admin_categories')
      .select('id, name, slug, parent_id, sort_order, image_url, image_alt, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .limit(NAV_CATEGORY_LIMIT)

    if (error) {
      console.error('server top category cache load failed:', error.message)
      return []
    }

    const tree = buildCategoryTree(data ?? [])
    const categories = mapCategoryTreeToMenu(tree)
    return Array.isArray(categories) ? categories : []
  },
  ['navbar-top-categories'],
  { revalidate: 300 },
)

export const getCachedTopCategories = async () => loadTopCategories()
