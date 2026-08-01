import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { MAX_UPLOAD_BYTES, buildObjectKey, uploadToR2 } from '@/lib/storage/r2'
import { ALLOWED_ADMIN_IMAGE_TYPES } from '@/lib/storage/admin-media'
import { isSafeExternalUrl } from '@/lib/http/ssrf-guard'

const bodySchema = z
  .object({
    image_url: z.string().url().max(2000).optional(),
    image_base64: z.string().max(8_000_000).optional(),
    file_name: z.string().max(200).optional(),
    product_id: z.string().uuid().optional(),
    alt_text: z.string().max(200).optional(),
    sort_order: z.number().int().min(0).max(1000).optional(),
  })
  .refine((value) => Boolean(value.image_url) !== Boolean(value.image_base64), {
    message: 'Provide exactly one of image_url or image_base64.',
  })

const DATA_URI_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/

const decodeBase64Image = (input: string): { buffer: Buffer; mimeType: string } | null => {
  const match = DATA_URI_PATTERN.exec(input)
  const mimeType = match ? match[1] : 'image/jpeg'
  const raw = match ? match[2] : input
  try {
    const buffer = Buffer.from(raw, 'base64')
    if (!buffer.length) return null
    return { buffer, mimeType }
  } catch {
    return null
  }
}

const fetchRemoteImage = async (url: string): Promise<{ buffer: Buffer; mimeType: string } | null> => {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) return null

  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim()
  const contentLength = Number(response.headers.get('content-length') || 0)
  if (contentLength && contentLength > MAX_UPLOAD_BYTES) return null

  const arrayBuffer = await response.arrayBuffer()
  if (arrayBuffer.byteLength > MAX_UPLOAD_BYTES) return null

  return { buffer: Buffer.from(arrayBuffer), mimeType: contentType || 'image/jpeg' }
}

const extForMime = (mimeType: string) => {
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/gif') return 'gif'
  return 'jpg'
}

export async function POST(request: NextRequest) {
  const { applyCookies, canManageCatalog, user } = await requireDashboardUser(request)
  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return jsonError('Invalid payload.', 400)
  }

  const parsed = bodySchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid request.', 400)
  }

  let decoded: { buffer: Buffer; mimeType: string } | null = null

  if (parsed.data.image_base64) {
    decoded = decodeBase64Image(parsed.data.image_base64)
    if (!decoded) {
      return jsonError('Invalid base64 image data.', 400)
    }
  } else if (parsed.data.image_url) {
    const urlCheck = await isSafeExternalUrl(parsed.data.image_url)
    if (urlCheck.safe === false) {
      return jsonError(`Refusing to fetch that URL: ${urlCheck.reason}`, 400)
    }
    try {
      decoded = await fetchRemoteImage(parsed.data.image_url)
    } catch (error) {
      console.error('remote image fetch failed:', error)
      return jsonError('Unable to fetch image from that URL.', 400)
    }
    if (!decoded) {
      return jsonError('Unable to fetch image from that URL, or it exceeds the size limit.', 400)
    }
  }

  if (!decoded) {
    return jsonError('No image data provided.', 400)
  }
  if (decoded.buffer.length > MAX_UPLOAD_BYTES) {
    return jsonError('Image exceeds the 5MB size limit.', 413)
  }
  if (!ALLOWED_ADMIN_IMAGE_TYPES.has(decoded.mimeType)) {
    return jsonError(`Unsupported image type: ${decoded.mimeType}`, 415)
  }

  const db = createAdminSupabaseClient()
  const prefix = parsed.data.product_id ? `products/${parsed.data.product_id}` : 'products/unassigned'
  const fileName = parsed.data.file_name || `upload.${extForMime(decoded.mimeType)}`
  const pseudoFile = new File([new Uint8Array(decoded.buffer)], fileName, { type: decoded.mimeType })
  const key = buildObjectKey(pseudoFile, prefix)

  let uploaded
  try {
    uploaded = await uploadToR2(pseudoFile, key)
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
      url,
      alt_text: parsed.data.alt_text || null,
      sort_order: parsed.data.sort_order ?? 0,
      created_by: user.id,
    })
    .select('id, r2_key, url, alt_text, sort_order, product_id')
    .single()

  if (error) {
    console.error('DB insert failed:', error.message)
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
