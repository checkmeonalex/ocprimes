import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

const paramsSchema = z.object({
  slug: z.string().min(1),
})

const CATEGORY_TABLE = 'admin_categories'
const TABLE = 'admin_category_browse_cards'

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const params = await context.params
  const parsed = paramsSchema.safeParse(params || {})
  if (!parsed.success) return jsonError('Invalid category slug.', 400)

  const { data: category, error: categoryError } = await supabase
    .from(CATEGORY_TABLE)
    .select('id, browse_categories_title')
    .eq('slug', parsed.data.slug)
    .eq('is_active', true)
    .maybeSingle()

  if (categoryError) return jsonError('Unable to load browse cards.', 500)
  if (!category?.id) {
    const response = jsonOk({ title: null, items: [] })
    applyCookies(response)
    return response
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('id, segment, name, link, image_url, image_alt, sort_order')
    .eq('category_id', category.id)
    .order('segment', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) {
    const errorCode = (error as { code?: string })?.code
    if (errorCode === '42P01') {
      return jsonError('Missing browse card table. Run migration 031_admin_category_browse_cards.sql.', 500)
    }
    return jsonError('Unable to load browse cards.', 500)
  }

  const response = jsonOk({
    title: category.browse_categories_title || null,
    items: data || [],
  })
  applyCookies(response)
  return response
}
