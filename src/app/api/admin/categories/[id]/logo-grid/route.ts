import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { logoGridSchema } from '@/lib/admin/logo-grid'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const GRID_TABLE = 'admin_category_logo_grids'
const ITEM_TABLE = 'admin_category_logo_items'

const loadGrid = async (supabase, categoryId) => {
  const { data: grid, error } = await supabase
    .from(GRID_TABLE)
    .select('id, category_id, title, title_bg_color, title_text_color')
    .eq('category_id', categoryId)
    .maybeSingle()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    if (errorCode === '42P01') {
      return { errorMessage: 'Missing logo grid tables. Run migration 026_admin_category_logo_grid.sql.' }
    }
    return { errorMessage: 'Unable to load logo grid.' }
  }

  if (!grid?.id) {
    return { item: null }
  }

  const { data: items } = await supabase
    .from(ITEM_TABLE)
    .select('id, image_url, image_key, image_alt, sort_order')
    .eq('grid_id', grid.id)
    .order('sort_order', { ascending: true })

  return {
    item: {
      ...grid,
      items: items || [],
    },
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const params = await context.params
  const parsed = paramsSchema.safeParse(params || {})
  if (!parsed.success) return jsonError('Invalid category.', 400)

  const result = await loadGrid(supabase, parsed.data.id)
  if (result?.errorMessage) return jsonError(result.errorMessage, 500)

  const response = jsonOk({ item: result.item || null })
  applyCookies(response)
  return response
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params || {})
  if (!parsedParams.success) return jsonError('Invalid category.', 400)

  const body = await request.json().catch(() => null)
  const parsedBody = logoGridSchema.safeParse(body)
  if (!parsedBody.success) return jsonError('Invalid payload.', 400)

  const categoryId = parsedParams.data.id
  const { title, title_bg_color, title_text_color, items } = parsedBody.data

  const { data: grid, error } = await supabase
    .from(GRID_TABLE)
    .upsert(
      {
        category_id: categoryId,
        title: title || null,
        title_bg_color: title_bg_color || null,
        title_text_color: title_text_color || null,
      },
      { onConflict: 'category_id' },
    )
    .select('id, category_id, title, title_bg_color, title_text_color')
    .single()

  if (error || !grid?.id) {
    const errorCode = (error as { code?: string })?.code
    if (errorCode === '42P01') {
      return jsonError('Missing logo grid tables. Run migration 026_admin_category_logo_grid.sql.', 500)
    }
    return jsonError('Unable to save logo grid.', 500)
  }

  const { error: deleteError } = await supabase
    .from(ITEM_TABLE)
    .delete()
    .eq('grid_id', grid.id)

  if (deleteError) return jsonError('Unable to update logo grid.', 500)

  if (items.length) {
    const payload = items.map((item, index) => ({
      grid_id: grid.id,
      image_url: item.image_url,
      image_key: item.image_key || null,
      image_alt: item.image_alt || null,
      sort_order: index,
    }))
    const { error: insertError } = await supabase.from(ITEM_TABLE).insert(payload)
    if (insertError) return jsonError('Unable to save logo items.', 500)
  }

  const result = await loadGrid(supabase, categoryId)
  if (result?.errorMessage) return jsonError(result.errorMessage, 500)

  const response = jsonOk({ item: result.item || null })
  applyCookies(response)
  return response
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const params = await context.params
  const parsed = paramsSchema.safeParse(params || {})
  if (!parsed.success) return jsonError('Invalid category.', 400)

  const { error } = await supabase
    .from(GRID_TABLE)
    .delete()
    .eq('category_id', parsed.data.id)

  if (error) {
    const errorCode = (error as { code?: string })?.code
    if (errorCode === '42P01') {
      return jsonError('Missing logo grid tables. Run migration 026_admin_category_logo_grid.sql.', 500)
    }
    return jsonError('Unable to remove logo grid.', 500)
  }

  const response = jsonOk({ ok: true })
  applyCookies(response)
  return response
}
