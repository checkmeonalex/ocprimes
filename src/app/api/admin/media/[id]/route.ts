import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  buildObjectKey,
  deleteFromR2,
  uploadToR2,
} from '@/lib/storage/r2'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const formSchema = z.object({
  product_id: z.string().uuid().optional(),
  alt_text: z.string().max(200).optional(),
  sort_order: z.preprocess(
    (value) => (value === undefined || value === null || value === '' ? undefined : Number(value)),
    z.number().int().min(0).max(1000).optional(),
  ),
})

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { supabase, applyCookies, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(_request)

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  const db = isAdmin ? supabase : createAdminSupabaseClient()

  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return jsonError('Invalid media id.', 400)
  }

  let lookupQuery = db
    .from('product_images')
    .select('id, r2_key, created_by')
    .eq('id', parsed.data.id)
  if (isVendor) {
    lookupQuery = lookupQuery.eq('created_by', user.id)
  }
  const { data, error } = await lookupQuery.maybeSingle()

  if (error) {
    console.error('Media lookup failed:', error.message)
    const errorCode = (error as { code?: string })?.code
    if (errorCode === '42703') {
      return jsonError('Media ownership column missing. Run migration 042_vendor_access.sql.', 500)
    }
    return jsonError('Unable to delete media.', 500)
  }

  if (!data) {
    return jsonError('Media not found.', 404)
  }

  if (data.r2_key) {
    try {
      await deleteFromR2(data.r2_key)
    } catch (deleteError) {
      console.error('R2 delete failed:', deleteError)
      return jsonError('Unable to delete storage object.', 500)
    }
  }

  const { error: deleteError } = await db
    .from('product_images')
    .delete()
    .eq('id', data.id)

  if (deleteError) {
    console.error('DB delete failed:', deleteError.message)
    return jsonError('Unable to delete media.', 500)
  }

  const response = jsonOk({ id: data.id })
  applyCookies(response)
  return response
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { supabase, applyCookies, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(request)

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  const db = isAdmin ? supabase : createAdminSupabaseClient()

  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return jsonError('Invalid media id.', 400)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (error) {
    console.error('Replace parse error:', error)
    return jsonError('Invalid form data.', 400)
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return jsonError('Missing file.', 400)
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return jsonError('Unsupported file type.', 415)
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonError('File too large.', 413)
  }

  const parsedBody = formSchema.safeParse({
    product_id: formData.get('product_id') || undefined,
    alt_text: formData.get('alt_text') || undefined,
    sort_order: formData.get('sort_order') || undefined,
  })
  if (!parsedBody.success) {
    return jsonError('Invalid metadata.', 400)
  }

  let lookupQuery = db
    .from('product_images')
    .select('id, product_id, r2_key, url, alt_text, sort_order, created_by')
    .eq('id', parsedParams.data.id)
  if (isVendor) {
    lookupQuery = lookupQuery.eq('created_by', user.id)
  }
  const { data: existing, error: lookupError } = await lookupQuery.maybeSingle()

  if (lookupError) {
    console.error('Media lookup failed:', lookupError.message)
    const errorCode = (lookupError as { code?: string })?.code
    if (errorCode === '42703') {
      return jsonError('Media ownership column missing. Run migration 042_vendor_access.sql.', 500)
    }
    return jsonError('Unable to replace media.', 500)
  }

  if (!existing) {
    return jsonError('Media not found.', 404)
  }

  const nextProductId = parsedBody.data.product_id ?? existing.product_id ?? undefined
  const prefix = nextProductId ? `products/${nextProductId}` : 'products/unassigned'
  const nextKey = buildObjectKey(file, prefix)

  let uploaded: { key: string; url: string }
  try {
    uploaded = await uploadToR2(file, nextKey)
  } catch (uploadError) {
    console.error('R2 upload failed:', uploadError)
    return jsonError('Upload failed.', 500)
  }

  const nextAltText = parsedBody.data.alt_text ?? existing.alt_text ?? null
  const nextSortOrder = parsedBody.data.sort_order ?? existing.sort_order ?? 0
  const nextProduct = nextProductId ?? null

  const { data: updatedRows, error: updateError } = await db
    .from('product_images')
    .update({
      product_id: nextProduct,
      r2_key: uploaded.key,
      url: uploaded.url,
      alt_text: nextAltText,
      sort_order: nextSortOrder,
    })
    .eq('id', existing.id)
    .select('id, r2_key, url, alt_text, sort_order, product_id')

  if (updateError) {
    console.error('DB update failed:', updateError.message)
    try {
      await deleteFromR2(uploaded.key)
    } catch (rollbackError) {
      console.error('Rollback delete failed:', rollbackError)
    }
    return jsonError('Unable to replace media.', 500)
  }

  const updated = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows

  if (!updated) {
    console.error('DB update returned no rows for media replace:', existing.id)
    try {
      await deleteFromR2(uploaded.key)
    } catch (rollbackError) {
      console.error('Rollback delete failed:', rollbackError)
    }
    return jsonError('Unable to replace media.', 500)
  }

  if (existing.r2_key && existing.r2_key !== uploaded.key) {
    try {
      await deleteFromR2(existing.r2_key)
    } catch (deleteError) {
      console.error('Old media delete failed:', deleteError)
    }
  }

  const response = jsonOk({
    id: updated?.id || existing.id,
    key: updated?.r2_key || uploaded.key,
    url: updated?.url || uploaded.url,
    alt_text: updated?.alt_text || nextAltText,
    sort_order: updated?.sort_order ?? nextSortOrder,
    product_id: updated?.product_id || nextProduct,
  })
  applyCookies(response)
  return response
}
