import type { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'

const TABLE = 'admin_categories'

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const params = await context.params
  const { slug } = params

  if (!slug) {
    return jsonError('Missing slug parameter.', 400)
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select(
      'id, name, slug, description, parent_id, sort_order, image_url, image_alt, image_key, banner_image_url, banner_image_key, banner_image_secondary_url, banner_image_secondary_key, banner_slider_urls, banner_slider_keys, banner_slider_mobile_urls, banner_slider_mobile_keys, banner_slider_links, banner_title, banner_subtitle, banner_cta_text, banner_cta_link, featured_strip_image_url, featured_strip_image_key, featured_strip_tag_id, featured_strip_category_id, hotspot_title_main, featured_strip_title_main, browse_categories_title, home_catalog_title, home_catalog_description, home_catalog_filter_mode, home_catalog_category_id, home_catalog_tag_id, home_catalog_limit, layout_order, is_active, created_at, created_by'
    )
    .eq('slug', slug)
    .single()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('category by slug lookup failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError('Categories table not found. Run migration 010_admin_taxonomies.sql.', 500)
    }
    if (errorCode === 'PGRST116') { // Record not found
      return jsonError('Category not found.', 404)
    }
    return jsonError('Unable to load category.', 500)
  }

  const response = jsonOk({ item: data })
  applyCookies(response)
  return response
}
