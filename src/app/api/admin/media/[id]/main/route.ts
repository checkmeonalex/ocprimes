import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const bodySchema = z.object({
  main: z.boolean(),
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { supabase, applyCookies, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(request)

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  const db = isAdmin ? createAdminSupabaseClient() : supabase

  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return jsonError('Invalid media id.', 400)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch (error) {
    console.error('Batch-main parse error:', error)
    return jsonError('Invalid request body.', 400)
  }
  const parsedBody = bodySchema.safeParse(body)
  if (!parsedBody.success) {
    return jsonError('Invalid request body.', 400)
  }

  let lookupQuery = db
    .from('product_images')
    .select('id, source_batch_id, created_by')
    .eq('id', parsedParams.data.id)
  if (isVendor) {
    lookupQuery = lookupQuery.eq('created_by', user.id)
  }
  const { data: existing, error: lookupError } = await lookupQuery.maybeSingle()

  if (lookupError) {
    console.error('Media lookup failed:', lookupError.message)
    const errorCode = (lookupError as { code?: string })?.code
    if (errorCode === '42703') {
      return jsonError('Batch-main column missing. Run migration 119_product_images_batch_main.sql.', 500)
    }
    return jsonError('Unable to update media.', 500)
  }

  if (!existing) {
    return jsonError('Media not found.', 404)
  }

  if (!existing.source_batch_id) {
    return jsonError('This image is not part of a batch.', 400)
  }

  if (parsedBody.data.main) {
    // Clear any existing main for the batch first — the partial unique
    // index only allows one is_batch_main = true row per source_batch_id.
    const { error: clearError } = await db
      .from('product_images')
      .update({ is_batch_main: false })
      .eq('source_batch_id', existing.source_batch_id)
      .eq('is_batch_main', true)
    if (clearError) {
      console.error('Clear batch-main failed:', clearError.message)
      return jsonError('Unable to update media.', 500)
    }
  }

  const { data: updated, error: updateError } = await db
    .from('product_images')
    .update({ is_batch_main: parsedBody.data.main })
    .eq('id', existing.id)
    .select('id, is_batch_main')
    .single()

  if (updateError) {
    console.error('Set batch-main failed:', updateError.message)
    return jsonError('Unable to update media.', 500)
  }

  const response = jsonOk({ id: updated?.id || existing.id, is_batch_main: updated?.is_batch_main ?? parsedBody.data.main })
  applyCookies(response)
  return response
}
