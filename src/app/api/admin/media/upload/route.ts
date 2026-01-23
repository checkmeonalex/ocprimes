import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const formSchema = z.object({
  product_id: z.string().uuid().optional(),
  alt_text: z.string().max(200).optional(),
  sort_order: z.preprocess(
    (value) => (value === undefined || value === null || value === '' ? undefined : Number(value)),
    z.number().int().min(0).max(1000).optional(),
  ),
})

const getR2Config = () => {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_BUCKET_NAME
  const endpoint = process.env.R2_ENDPOINT
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL || ''

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
    throw new Error('R2 is not configured.')
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName, endpoint, publicBaseUrl }
}

const buildObjectKey = (file: File, productId?: string) => {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
  const safeExt = ext ? ext.replace(/[^a-zA-Z0-9]/g, '') : 'bin'
  const prefix = productId ? `products/${productId}` : 'products/unassigned'
  const stamp = crypto.randomUUID()
  return `${prefix}/${Date.now()}-${stamp}.${safeExt || 'bin'}`
}

export async function POST(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

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
  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonError('Unsupported file type.', 415)
  }
  if (file.size > MAX_FILE_BYTES) {
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

  let r2Config
  try {
    r2Config = getR2Config()
  } catch (error) {
    console.error('R2 config error:', error)
    return jsonError('Storage configuration missing.', 500)
  }

  const key = buildObjectKey(file, parsed.data.product_id)
  const body = Buffer.from(await file.arrayBuffer())

  const client = new S3Client({
    region: 'auto',
    endpoint: r2Config.endpoint,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey,
    },
  })

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
        Body: body,
        ContentType: file.type,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    )
  } catch (error) {
    console.error('R2 upload failed:', error)
    return jsonError('Upload failed.', 500)
  }

  const publicBase = r2Config.publicBaseUrl
  const url = publicBase ? `${publicBase.replace(/\/+$/, '')}/${key}` : `${r2Config.endpoint.replace(/\/+$/, '')}/${r2Config.bucketName}/${key}`

  const { data, error } = await supabase
    .from('product_images')
    .insert({
      product_id: parsed.data.product_id || null,
      r2_key: key,
      url,
      alt_text: parsed.data.alt_text || null,
      sort_order: parsed.data.sort_order ?? 0,
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
