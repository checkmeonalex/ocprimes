import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { jsonError, jsonOk } from '@/lib/http/response'

const paramsSchema = z.object({
  id: z.string().min(1),
})

const getVideoR2Config = () => {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_VIDEO_BUCKET_NAME || process.env.R2_BUCKET_NAME
  const endpoint = process.env.R2_ENDPOINT

  if (!accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
    throw new Error('R2 is not configured.')
  }

  return { accessKeyId, secretAccessKey, bucketName, endpoint }
}

const fromMediaId = (id: string) => {
  try {
    const decoded = Buffer.from(String(id || ''), 'base64url').toString('utf8')
    return String(decoded || '').trim()
  } catch {
    return ''
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { applyCookies, canManageCatalog } = await requireDashboardUser(request)

  if (!canManageCatalog) {
    return jsonError('Forbidden.', 403)
  }

  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return jsonError('Invalid video id.', 400)
  }

  const key = fromMediaId(parsed.data.id)
  if (!key || !key.startsWith('product-videos/')) {
    return jsonError('Invalid video key.', 400)
  }

  let cfg
  try {
    cfg = getVideoR2Config()
  } catch (configError) {
    console.error('Video R2 config error:', configError)
    return jsonError('Storage configuration missing.', 500)
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  })

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: cfg.bucketName,
        Key: key,
      }),
    )
  } catch (deleteError) {
    console.error('Video R2 delete failed:', deleteError)
    return jsonError('Unable to delete storage object.', 500)
  }

  const response = jsonOk({ id: parsed.data.id, key })
  applyCookies(response)
  return response
}
