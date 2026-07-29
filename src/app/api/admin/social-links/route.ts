import type { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import {
  EMPTY_SOCIAL_LINKS,
  SITE_SOCIAL_CACHE_TAG,
  siteSocialLinksSchema,
} from '@/lib/site/social-links'

const SELECT = 'instagram_url, tiktok_url, x_url, facebook_url'

export async function GET(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const { data, error } = await supabase
    .from('site_social_links')
    .select(SELECT)
    .eq('id', 1)
    .maybeSingle()

  const response = jsonOk({ item: error || !data ? EMPTY_SOCIAL_LINKS : data })
  applyCookies(response)
  return response
}

export async function PATCH(request: NextRequest) {
  const { applyCookies, user, isAdmin } = await requireAdmin(request)
  if (!isAdmin || !user) {
    return jsonError('Forbidden.', 403)
  }

  const body = await request.json().catch(() => null)
  const parsed = siteSocialLinksSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid payload.', 400)
  }

  const adminDb = createAdminSupabaseClient()
  const { data, error } = await adminDb
    .from('site_social_links')
    .upsert(
      {
        id: 1,
        ...parsed.data,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: 'id' },
    )
    .select(SELECT)
    .single()

  if (error || !data) {
    if (error) {
      console.error('site social links save failed:', error.message, error.details || '')
    }
    return jsonError('Unable to save social links.', 500)
  }

  revalidateTag(SITE_SOCIAL_CACHE_TAG)

  const response = jsonOk({ item: data })
  applyCookies(response)
  return response
}
