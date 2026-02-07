import { createServerSupabaseClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'

export const fetchCategoryWithChildren = async (slug: string) => {
  noStore()
  const supabase = await createServerSupabaseClient()

  const { data: parent } = await supabase
    .from('admin_categories')
    .select(
      'id, name, slug, description, image_url, image_alt, banner_image_url, banner_image_key, banner_image_secondary_url, banner_image_secondary_key, banner_slider_urls, banner_slider_keys, banner_slider_mobile_urls, banner_slider_mobile_keys, banner_slider_links, banner_title, banner_subtitle, banner_cta_text, banner_cta_link, featured_strip_image_url, featured_strip_image_key, featured_strip_tag_id, featured_strip_category_id, hotspot_title_main, featured_strip_title_main, browse_categories_title, home_catalog_title, home_catalog_description, home_catalog_filter_mode, home_catalog_category_id, home_catalog_tag_id, home_catalog_limit, layout_order, is_active',
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!parent?.id) return { parent: null, children: [] }

  const { data: children } = await supabase
    .from('admin_categories')
    .select('id, name, slug, image_url, image_alt, is_active')
    .eq('parent_id', parent.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return { parent, children: children || [] }
}
