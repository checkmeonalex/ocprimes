import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { jsonError, jsonOk } from '@/lib/http/response'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  filter: z.enum(['all', 'unattached', 'stale']).default('all'),
  stale_days: z.coerce.number().int().min(1).max(3650).default(180),
})

const getR2Config = () => {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const endpoint = process.env.R2_ENDPOINT
  const bucketName = process.env.R2_VIDEO_BUCKET_NAME || process.env.R2_BUCKET_NAME
  const publicBaseUrl =
    String(process.env.R2_VIDEO_PUBLIC_BASE_URL || '').trim() ||
    String(process.env.R2_PUBLIC_BASE_URL || '').trim()

  if (!accessKeyId || !secretAccessKey || !endpoint || !bucketName) {
    throw new Error('R2 is not configured.')
  }

  return { accessKeyId, secretAccessKey, endpoint, bucketName, publicBaseUrl }
}

const toMediaId = (key: string) =>
  Buffer.from(String(key || ''), 'utf8').toString('base64url')

export async function GET(request: NextRequest) {
  const { applyCookies, canManageCatalog } = await requireDashboardUser(request)

  if (!canManageCatalog) {
    return jsonError('Forbidden.', 403)
  }

  const parseResult = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid query.', 400)
  }

  const { page, per_page, filter, stale_days } = parseResult.data
  if (filter === 'unattached') {
    const response = jsonOk({ items: [], pages: 1, page, total_count: 0 })
    applyCookies(response)
    return response
  }

  let cfg
  try {
    cfg = getR2Config()
  } catch (error) {
    console.error('video media list R2 config error:', error)
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

  const targetCount = page * per_page
  const objects: Array<{ Key?: string; LastModified?: Date; Size?: number }> = []
  let continuationToken: string | undefined

  try {
    while (objects.length < targetCount) {
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: cfg.bucketName,
          Prefix: 'product-videos/',
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        }),
      )

      const batch = Array.isArray(result.Contents) ? result.Contents : []
      for (const item of batch) {
        const key = String(item?.Key || '').trim()
        if (!key || key.endsWith('/')) continue
        objects.push(item)
      }

      if (!result.IsTruncated || !result.NextContinuationToken) break
      continuationToken = result.NextContinuationToken
    }
  } catch (error) {
    console.error('video media list from r2 failed:', error)
    return jsonError('Unable to load videos.', 500)
  }

  const cutoffMs = Date.now() - stale_days * 24 * 60 * 60 * 1000
  const sorted = objects.sort((a, b) => {
    const aMs = new Date(a?.LastModified || 0).getTime()
    const bMs = new Date(b?.LastModified || 0).getTime()
    return bMs - aMs
  })

  const filtered = filter === 'stale'
    ? sorted.filter((item) => new Date(item?.LastModified || 0).getTime() < cutoffMs)
    : sorted

  const totalCount = filtered.length
  const from = (page - 1) * per_page
  const to = from + per_page
  const pageItems = filtered.slice(from, to)

  const normalizedBase = cfg.publicBaseUrl.replace(/\/+$/, '')
  const items = pageItems.map((item) => {
    const key = String(item?.Key || '').trim()
    const resolvedUrl = normalizedBase
      ? `${normalizedBase}/${key}`
      : `${cfg.endpoint.replace(/\/+$/, '')}/${cfg.bucketName}/${key}`
    const updatedAt = item?.LastModified ? new Date(item.LastModified).toISOString() : null
    return {
      id: toMediaId(key),
      key,
      r2_key: key,
      url: resolvedUrl,
      title: key.split('/').pop() || 'Video',
      media_type: 'video',
      size_bytes: Number(item?.Size || 0),
      created_at: updatedAt,
      is_stale:
        filter === 'stale'
          ? true
          : new Date(item?.LastModified || 0).getTime() < cutoffMs,
      unattached: false,
    }
  })

  const pages = totalCount ? Math.max(1, Math.ceil(totalCount / per_page)) : 1
  const response = jsonOk({ items, pages, page, total_count: totalCount || 0 })
  applyCookies(response)
  return response
}
