import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError } from '@/lib/http/response'
import { isR2TimeoutError } from '@/lib/storage/r2'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const getR2Config = () => {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_BUCKET_NAME
  const endpoint = process.env.R2_ENDPOINT

  if (!accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
    throw new Error('R2 is not configured.')
  }

  return { accessKeyId, secretAccessKey, bucketName, endpoint }
}

const createR2Client = async () => {
  const { S3Client } = await import('@aws-sdk/client-s3')
  const config = getR2Config()
  return {
    config,
    client: new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }),
  }
}

const proxyRemoteMedia = async (url: string) => {
  const upstream = await fetch(url, { cache: 'no-store' })
  if (!upstream.ok) {
    return jsonError('Unable to fetch media source.', 502)
  }
  const bytes = await upstream.arrayBuffer()
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'image/webp',
      'Cache-Control': 'private, no-store',
    },
  })
}

const resolveVendorBrandIds = async (db: any, userId: string, user: any) => {
  const { data, error } = await db.from('admin_brands').select('id').eq('created_by', userId)
  if (!error && Array.isArray(data) && data.length) {
    return data.map((item: any) => String(item?.id || '')).filter(Boolean)
  }

  const metadata = user?.user_metadata && typeof user.user_metadata === 'object'
    ? user.user_metadata
    : {}
  const profile = metadata?.profile && typeof metadata.profile === 'object'
    ? metadata.profile
    : {}
  const fallbackSlug = String(
    metadata?.brand_slug ||
      metadata?.brand_name ||
      profile?.brand_slug ||
      profile?.brand_name ||
      '',
  )
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!fallbackSlug) return []

  const { data: bySlug } = await db
    .from('admin_brands')
    .select('id')
    .eq('slug', fallbackSlug)
    .limit(1)

  return Array.isArray(bySlug)
    ? bySlug.map((item: any) => String(item?.id || '')).filter(Boolean)
    : []
}

const resolveVendorAccessibleProductIds = async (db: any, userId: string, user: any) => {
  const [brandIds, ownProductsResult] = await Promise.all([
    resolveVendorBrandIds(db, userId, user),
    db.from('products').select('id').eq('created_by', userId),
  ])

  const ownProductIds = ownProductsResult.error
    ? []
    : Array.isArray(ownProductsResult.data)
      ? ownProductsResult.data.map((item: any) => String(item?.id || '')).filter(Boolean)
      : []

  if (!brandIds.length) {
    return ownProductIds
  }

  const { data: brandProductLinks } = await db
    .from('product_brand_links')
    .select('product_id')
    .in('brand_id', brandIds)

  const brandProductIds = Array.isArray(brandProductLinks)
    ? brandProductLinks.map((item: any) => String(item?.product_id || '')).filter(Boolean)
    : []

  return Array.from(new Set([...ownProductIds, ...brandProductIds]))
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { supabase, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(request)

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }

  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return jsonError('Invalid media id.', 400)
  }

  const db = isAdmin ? supabase : createAdminSupabaseClient()
  let vendorAccessibleProductIds: string[] = []
  if (isVendor && user?.id) {
    vendorAccessibleProductIds = await resolveVendorAccessibleProductIds(db, user.id, user)
  }

  let lookupQuery = db
    .from('product_images')
    .select('id, r2_key, url, created_by, product_id')
    .eq('id', parsed.data.id)
    .limit(1)

  if (isVendor) {
    if (vendorAccessibleProductIds.length) {
      const safeIds = vendorAccessibleProductIds.filter((id) => /^[0-9a-fA-F-]{16,}$/.test(id))
      if (safeIds.length) {
        lookupQuery = lookupQuery.or(`created_by.eq.${user.id},product_id.in.(${safeIds.join(',')})`)
      } else {
        lookupQuery = lookupQuery.eq('created_by', user.id)
      }
    } else {
      lookupQuery = lookupQuery.eq('created_by', user.id)
    }
  }

  const { data, error } = await lookupQuery.maybeSingle()

  if (error) {
    console.error('Media source lookup failed:', error.message)
    return jsonError('Unable to load media source.', 500)
  }

  if (!data) {
    return jsonError('Media not found.', 404)
  }

  if (!data.r2_key) {
    if (!data.url) {
      return jsonError('Media source unavailable.', 404)
    }

    try {
      return await proxyRemoteMedia(data.url)
    } catch (fetchError) {
      console.error('Media source proxy failed:', fetchError)
      return jsonError('Unable to fetch media source.', 502)
    }
  }

  try {
    const { client, config } = await createR2Client()
    const objectResponse = await client.send(
      new GetObjectCommand({
        Bucket: config.bucketName,
        Key: data.r2_key,
      }),
    )

    const bytes = await objectResponse.Body?.transformToByteArray?.()
    if (!bytes) {
      return jsonError('Media source unavailable.', 404)
    }

    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': objectResponse.ContentType || 'image/webp',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (storageError) {
    console.error('Media source read failed:', storageError)
    if (isR2TimeoutError(storageError)) {
      return jsonError('Storage timed out while loading media.', 504)
    }
    const storageCode = (storageError as { Code?: string; code?: string; name?: string })?.Code
      || (storageError as { Code?: string; code?: string; name?: string })?.code
      || (storageError as { Code?: string; code?: string; name?: string })?.name
    if (storageCode === 'NoSuchKey' && data.url) {
      try {
        return await proxyRemoteMedia(data.url)
      } catch (fetchError) {
        console.error('Media source fallback proxy failed:', fetchError)
        return jsonError('Unable to load media source.', 500)
      }
    }
    return jsonError('Unable to load media source.', 500)
  }
}
