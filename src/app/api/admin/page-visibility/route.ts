import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { TOGGLEABLE_NAV_ITEMS, isValidNavKey } from '@/lib/admin/page-visibility'

// Admin-only: list every toggleable nav item with its current public/private
// state (defaulting to false for any key with no row yet).
export async function GET(request: NextRequest) {
  const { isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const db = createAdminSupabaseClient()
  const { data, error } = await db
    .from('admin_page_visibility')
    .select('nav_key, is_public, updated_at')

  if (error) {
    console.error('page-visibility list failed:', error.message)
    return jsonError('Unable to load visibility settings.', 500)
  }

  const byKey = new Map((data ?? []).map((row: any) => [row.nav_key, row]))
  const items = TOGGLEABLE_NAV_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    description: item.description,
    is_public: Boolean(byKey.get(item.key)?.is_public),
    updated_at: byKey.get(item.key)?.updated_at || null,
  }))

  return jsonOk({ items })
}

const patchSchema = z.object({
  key: z.string().min(1).max(60),
  is_public: z.boolean(),
})

// Admin-only: flip one nav item's visibility to vendors.
export async function PATCH(request: NextRequest) {
  const { isAdmin, user } = await requireAdmin(request)
  if (!isAdmin || !user?.id) {
    return jsonError('Forbidden.', 403)
  }

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Invalid request.', 400)
  }

  if (!isValidNavKey(parsed.data.key)) {
    return jsonError('Unknown page.', 400)
  }

  const db = createAdminSupabaseClient()
  const { data, error } = await db
    .from('admin_page_visibility')
    .upsert(
      {
        nav_key: parsed.data.key,
        is_public: parsed.data.is_public,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: 'nav_key' },
    )
    .select('nav_key, is_public, updated_at')
    .single()

  if (error) {
    console.error('page-visibility update failed:', error.message)
    return jsonError('Unable to update visibility setting.', 500)
  }

  return jsonOk({ item: data })
}
