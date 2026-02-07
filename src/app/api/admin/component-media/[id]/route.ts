import type { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { deleteFromR2 } from '@/lib/storage/r2'

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const params = await context.params
  const id = params?.id
  if (!id) return jsonError('Missing id.', 400)

  const { data, error: fetchErr } = await supabase
    .from('component_images')
    .select('id, r2_key')
    .eq('id', id)
    .single()
  if (fetchErr) {
    console.error('component media fetch failed:', fetchErr.message)
    return jsonError('Unable to load image.', 500)
  }

  if (data?.r2_key) {
    try {
      await deleteFromR2(data.r2_key)
    } catch (err) {
      console.error('component media delete R2 failed:', err)
      // continue; we still clear DB
    }
  }

  const { error: delErr } = await supabase.from('component_images').delete().eq('id', id)
  if (delErr) {
    console.error('component media delete DB failed:', delErr.message)
    return jsonError('Unable to delete image.', 500)
  }

  const response = jsonOk({ deleted: true })
  applyCookies(response)
  return response
}
