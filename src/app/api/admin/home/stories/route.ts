import type { NextRequest } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { homeStoriesSchema } from '@/lib/home-stories/schema'
import { getHomeStories, replaceHomeStories, HOME_STORIES_CACHE_TAG } from '@/lib/home/stories'
import { HOME_PAGE_CACHE_TAG } from '@/lib/home/settings'

export async function GET(request: NextRequest) {
  const { applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const db = createAdminSupabaseClient()
  const result = await getHomeStories(db)
  if (result.errorMessage) return jsonError(result.errorMessage, 500)

  const response = jsonOk({ items: result.items || [] })
  applyCookies(response)
  return response
}

export async function PUT(request: NextRequest) {
  const { applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const body = await request.json().catch(() => null)
  const parsed = homeStoriesSchema.safeParse(body)
  if (!parsed.success) return jsonError('Invalid payload.', 400)

  const db = createAdminSupabaseClient()
  const result = await replaceHomeStories(db, parsed.data.items)
  if (result.errorMessage) return jsonError(result.errorMessage, 500)

  revalidateTag(HOME_PAGE_CACHE_TAG)
  revalidateTag(HOME_STORIES_CACHE_TAG)
  revalidatePath('/')

  const response = jsonOk({ items: result.items || [] })
  applyCookies(response)
  return response
}

export async function DELETE(request: NextRequest) {
  const { applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const db = createAdminSupabaseClient()
  const result = await replaceHomeStories(db, [])
  if (result.errorMessage) return jsonError(result.errorMessage, 500)

  revalidateTag(HOME_PAGE_CACHE_TAG)
  revalidateTag(HOME_STORIES_CACHE_TAG)
  revalidatePath('/')

  const response = jsonOk({ ok: true })
  applyCookies(response)
  return response
}
