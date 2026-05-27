import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { homeStoriesSchema } from '@/lib/home-stories/schema'
import {
  listCategoryStories,
  replaceCategoryStories,
} from '@/lib/home-stories/service'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const params = await context.params
  const parsed = paramsSchema.safeParse(params || {})
  if (!parsed.success) return jsonError('Invalid category.', 400)

  const result = await listCategoryStories(supabase, parsed.data.id)
  if (result.errorMessage) return jsonError(result.errorMessage, 500)

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
  const parsedBody = homeStoriesSchema.safeParse(body)
  if (!parsedBody.success) return jsonError('Invalid payload.', 400)

  const result = await replaceCategoryStories(supabase, parsedParams.data.id, parsedBody.data.items)
  if (result.errorMessage) return jsonError(result.errorMessage, 500)

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
    .from('admin_category_stories')
    .delete()
    .eq('category_id', parsed.data.id)

  if (error) {
    const errorCode = (error as { code?: string })?.code
    if (errorCode === '42P01') {
      return jsonError('Missing stories table. Run migration 087_admin_category_stories.sql.', 500)
    }
    return jsonError('Unable to remove stories.', 500)
  }

  const response = jsonOk({ ok: true })
  applyCookies(response)
  return response
}
