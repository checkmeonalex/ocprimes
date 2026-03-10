import type { NextRequest } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { homeSettingsUpdateSchema } from '@/lib/home/schema'
import { getHomePageSettings, updateHomePageSettings, HOME_PAGE_CACHE_TAG } from '@/lib/home/settings'
import { HOME_BROWSE_CARDS_CACHE_TAG } from '@/lib/home/browse-cards'
import { HOME_STORIES_CACHE_TAG } from '@/lib/home/stories'

export async function GET(request: NextRequest) {
  const { applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const db = createAdminSupabaseClient()
  const result = await getHomePageSettings(db)
  if (result.errorMessage) return jsonError(result.errorMessage, 500)

  const response = jsonOk({ item: result.item })
  applyCookies(response)
  return response
}

export async function PUT(request: NextRequest) {
  const { applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const body = await request.json().catch(() => null)
  const parsed = homeSettingsUpdateSchema.safeParse(body)
  if (!parsed.success) return jsonError('Invalid payload.', 400)

  const db = createAdminSupabaseClient()
  const result = await updateHomePageSettings(db, parsed.data)
  if (result.errorMessage) return jsonError(result.errorMessage, 500)

  revalidateTag(HOME_PAGE_CACHE_TAG)
  revalidateTag(HOME_BROWSE_CARDS_CACHE_TAG)
  revalidateTag(HOME_STORIES_CACHE_TAG)
  revalidatePath('/')

  const response = jsonOk({ item: result.item })
  applyCookies(response)
  return response
}
