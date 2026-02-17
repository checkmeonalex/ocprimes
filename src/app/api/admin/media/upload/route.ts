import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  buildObjectKey,
  uploadToR2,
} from '@/lib/storage/r2'

const formSchema = z.object({
  product_id: z.string().uuid().optional(),
  alt_text: z.string().max(200).optional(),
  sort_order: z.preprocess(
    (value) => (value === undefined || value === null || value === '' ? undefined : Number(value)),
    z.number().int().min(0).max(1000).optional(),
  ),
})

export async function POST(request: NextRequest) {
  const { supabase, applyCookies, canManageCatalog, isAdmin, user } = await requireDashboardUser(request)

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  const db = isAdmin ? supabase : createAdminSupabaseClient()

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (error) {
    console.error('Upload parse error:', error)
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

  const parsed = formSchema.safeParse({
    product_id: formData.get('product_id') || undefined,
    alt_text: formData.get('alt_text') || undefined,
    sort_order: formData.get('sort_order') || undefined,
  })
  if (!parsed.success) {
    return jsonError('Invalid metadata.', 400)
  }

  const prefix = parsed.data.product_id
    ? `products/${parsed.data.product_id}`
    : 'products/unassigned'
  const key = buildObjectKey(file, prefix)
  let uploaded
  try {
    uploaded = await uploadToR2(file, key)
  } catch (error) {
    console.error('R2 upload failed:', error)
    return jsonError('Upload failed.', 500)
  }

  const url = uploaded?.url || ''

  const { data, error } = await db
    .from('product_images')
    .insert({
      product_id: parsed.data.product_id || null,
      r2_key: uploaded?.key || key,
      url: url,
      alt_text: parsed.data.alt_text || null,
      sort_order: parsed.data.sort_order ?? 0,
      created_by: user.id,
    })
    .select('id, r2_key, url, alt_text, sort_order, product_id')
    .single()
  if (error) {
    console.error('DB insert failed:', error.message)
    const errorCode = (error as { code?: string })?.code
    if (errorCode === '42703') {
      return jsonError('Media ownership column missing. Run migration 042_vendor_access.sql.', 500)
    }
    return jsonError('Saved file, but DB insert failed.', 500)
  }

  const response = jsonOk({
    id: data?.id || null,
    key: data?.r2_key || key,
    url: data?.url || url,
    alt_text: data?.alt_text || null,
    sort_order: data?.sort_order ?? 0,
    product_id: data?.product_id || null,
  })
  applyCookies(response)
  return response
}
