import type { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const params = await context.params
  const categoryId = params?.id
  if (!categoryId) {
    return jsonError('Missing category id.', 400)
  }

  const { data, error } = await supabase
    .from('admin_categories')
    .select(
      'id, name, slug, description, parent_id, sort_order, image_url, image_alt, image_key, banner_image_url, banner_image_key, banner_image_secondary_url, banner_image_secondary_key, banner_slider_urls, banner_slider_keys, banner_slider_mobile_urls, banner_slider_mobile_keys, banner_slider_links, banner_title, banner_subtitle, banner_cta_text, banner_cta_link, featured_strip_image_url, featured_strip_image_key, featured_strip_tag_id, featured_strip_category_id, hotspot_title_main, featured_strip_title_main, browse_categories_title, home_catalog_title, home_catalog_description, home_catalog_filter_mode, home_catalog_category_id, home_catalog_tag_id, home_catalog_limit, layout_order, is_active, created_at, created_by',
    )
    .eq('id', categoryId)
    .single()

  if (error) {
    console.error('category fetch failed:', error.message)
    return jsonError('Unable to load category.', 500)
  }

  const response = jsonOk({ item: data })
  applyCookies(response)
  return response
}
