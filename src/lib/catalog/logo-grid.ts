import { createServerSupabaseClient } from '@/lib/supabase/server'

const GRID_TABLE = 'admin_category_logo_grids'
const ITEM_TABLE = 'admin_category_logo_items'

export const fetchLogoGridByCategory = async (categoryId: string) => {
  if (!categoryId) return null
  const supabase = await createServerSupabaseClient()

  const { data: grid } = await supabase
    .from(GRID_TABLE)
    .select('id, category_id, title, title_bg_color, title_text_color')
    .eq('category_id', categoryId)
    .maybeSingle()

  if (!grid?.id) return null

  const { data: items } = await supabase
    .from(ITEM_TABLE)
    .select('id, image_url, image_alt, sort_order')
    .eq('grid_id', grid.id)
    .order('sort_order', { ascending: true })

  return {
    ...grid,
    items: items || [],
  }
}
