import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { jsonError, jsonOk } from '@/lib/http/response'
import {
  ALLOWED_VIDEO_TYPES,
  MAX_VIDEO_UPLOAD_BYTES,
  buildObjectKey,
  uploadToR2,
} from '@/lib/storage/r2'

const formSchema = z.object({
  product_id: z.string().uuid().optional(),
})

const resolveVideoBucketName = () => {
  const custom = String(process.env.R2_VIDEO_BUCKET_NAME || '').trim()
  if (custom) return custom
  return undefined
}

const resolveVideoPublicBaseUrl = () => {
  const custom = String(process.env.R2_VIDEO_PUBLIC_BASE_URL || '').trim()
  if (custom) return custom
  return undefined
}

const toMediaId = (key: string) =>
  Buffer.from(String(key || ''), 'utf8').toString('base64url')

export async function POST(request: NextRequest) {
  const { applyCookies, canManageCatalog } = await requireDashboardUser(request)

  if (!canManageCatalog) {
    return jsonError('Forbidden.', 403)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (error) {
    console.error('Video upload parse error:', error)
    return jsonError('Invalid form data.', 400)
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return jsonError('Missing file.', 400)
  }
  if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
    return jsonError('Unsupported video type.', 415)
  }
  if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
    return jsonError('Video file too large.', 413)
  }

  const parsed = formSchema.safeParse({
    product_id: formData.get('product_id') || undefined,
  })
  if (!parsed.success) {
    return jsonError('Invalid metadata.', 400)
  }

  const prefix = parsed.data.product_id
    ? `product-videos/${parsed.data.product_id}`
    : 'product-videos/unassigned'
  const key = buildObjectKey(file, prefix)

  const videoBucketName = resolveVideoBucketName()
  const videoPublicBaseUrl = resolveVideoPublicBaseUrl()

  let uploaded
  try {
    uploaded = await uploadToR2(file, key, {
      bucketName: videoBucketName,
      publicBaseUrl: videoPublicBaseUrl,
      cacheControl: 'public, max-age=31536000, immutable',
    })
  } catch (error) {
    console.error('Product video upload failed:', error)
    return jsonError('Upload failed.', 500)
  }

  const response = jsonOk({
    id: toMediaId(uploaded?.key || key),
    key: uploaded?.key || key,
    url: uploaded?.url || '',
    product_id: parsed.data.product_id || null,
    created_at: new Date().toISOString(),
  })
  applyCookies(response)
  return response
}
