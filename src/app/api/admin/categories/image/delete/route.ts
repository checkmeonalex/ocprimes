import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { deleteFromR2 } from '@/lib/storage/r2'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

const bodySchema = z.object({
  id: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const { isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error('category image delete parse error:', error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = bodySchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError('Invalid payload.', 400)
  }

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)

  const { data: category, error: fetchErr } = await supabase
    .from('admin_categories')
    .select('id, image_key, image_url')
    .eq('id', parsed.data.id)
    .single()
  if (fetchErr) {
    console.error('category image delete fetch error:', fetchErr.message)
    return jsonError('Unable to load category.', 500)
  }
  if (!category) {
    return jsonError('Category not found.', 404)
  }

  if (category.image_key) {
    try {
      await deleteFromR2(category.image_key)
    } catch (err) {
      console.error('category image delete storage error:', err)
      // continue; we still clear DB reference to avoid broken state
    }
  }

  const { error: updateErr } = await supabase
    .from('admin_categories')
    .update({ image_key: null, image_url: null, image_alt: null })
    .eq('id', parsed.data.id)
  if (updateErr) {
    console.error('category image delete update error:', updateErr.message)
    return jsonError('Unable to update category.', 500)
  }

  const response = jsonOk({ removed: true })
  applyCookies(response)
  return response
}
