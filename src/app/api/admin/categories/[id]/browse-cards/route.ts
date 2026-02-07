import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { browseCardsSchema } from '@/lib/admin/browse-cards'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const TABLE = 'admin_category_browse_cards'

const loadCards = async (supabase, categoryId) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, category_id, segment, name, link, image_url, image_key, image_alt, sort_order')
    .eq('category_id', categoryId)
    .order('segment', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) {
    const errorCode = (error as { code?: string })?.code
    if (errorCode === '42P01') {
      return { errorMessage: 'Missing browse card table. Run migration 031_admin_category_browse_cards.sql.' }
    }
    return { errorMessage: 'Unable to load browse cards.' }
  }

  return { items: data || [] }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const params = await context.params
  const parsed = paramsSchema.safeParse(params || {})
  if (!parsed.success) return jsonError('Invalid category.', 400)

  const result = await loadCards(supabase, parsed.data.id)
  if (result?.errorMessage) return jsonError(result.errorMessage, 500)

  const response = jsonOk({ items: result.items || [] })
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
  const parsedBody = browseCardsSchema.safeParse(body)
  if (!parsedBody.success) return jsonError('Invalid payload.', 400)

  const categoryId = parsedParams.data.id
  const { error: deleteError } = await supabase.from(TABLE).delete().eq('category_id', categoryId)
  if (deleteError) return jsonError('Unable to update browse cards.', 500)

  const items = parsedBody.data.items
  if (items.length) {
    const counters = { all: 0, men: 0, women: 0 }
    const payload = items.map((item) => {
      const sort = counters[item.segment]
      counters[item.segment] += 1
      return {
        category_id: categoryId,
        segment: item.segment,
        name: item.name,
        link: item.link || null,
        image_url: item.image_url,
        image_key: item.image_key || null,
        image_alt: item.image_alt || null,
        sort_order: sort,
      }
    })
    const { error: insertError } = await supabase.from(TABLE).insert(payload)
    if (insertError) return jsonError('Unable to save browse cards.', 500)
  }

  const result = await loadCards(supabase, categoryId)
  if (result?.errorMessage) return jsonError(result.errorMessage, 500)

  const response = jsonOk({ items: result.items || [] })
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
    .from(TABLE)
    .delete()
    .eq('category_id', parsed.data.id)

  if (error) {
    const errorCode = (error as { code?: string })?.code
    if (errorCode === '42P01') {
      return jsonError('Missing browse card table. Run migration 031_admin_category_browse_cards.sql.', 500)
    }
    return jsonError('Unable to remove browse cards.', 500)
  }

  const response = jsonOk({ ok: true })
  applyCookies(response)
  return response
}
