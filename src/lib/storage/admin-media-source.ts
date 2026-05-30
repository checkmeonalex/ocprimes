import { GetObjectCommand } from '@aws-sdk/client-s3'
import { isR2TimeoutError } from '@/lib/storage/r2'

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

export const proxyRemoteMedia = async (url: string, contentTypeFallback = 'image/webp') => {
  const upstream = await fetch(url, { cache: 'no-store' })
  if (!upstream.ok) {
    throw new Error('Unable to fetch media source.')
  }

  const bytes = await upstream.arrayBuffer()
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || contentTypeFallback,
      'Cache-Control': 'private, no-store',
    },
  })
}

export const readMediaFromStorage = async ({
  r2Key,
  url,
  contentTypeFallback = 'image/webp',
}: {
  r2Key?: string | null
  url?: string | null
  contentTypeFallback?: string
}) => {
  // When a public CDN url is available, proxy it directly — much faster than
  // going through the R2 SDK and avoids SDK-level timeouts entirely.
  if (url) {
    return proxyRemoteMedia(url, contentTypeFallback)
  }

  if (!r2Key) {
    throw Object.assign(new Error('Media source unavailable.'), { code: 'MEDIA_UNAVAILABLE' })
  }

  // No public url — fall back to R2 SDK (private/unattached objects).
  try {
    const { client, config } = await createR2Client()
    const objectResponse = await client.send(
      new GetObjectCommand({
        Bucket: config.bucketName,
        Key: r2Key,
      }),
    )

    const bytes = await objectResponse.Body?.transformToByteArray?.()
    if (!bytes) {
      throw Object.assign(new Error('Media source unavailable.'), { code: 'MEDIA_UNAVAILABLE' })
    }

    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': objectResponse.ContentType || contentTypeFallback,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    if (isR2TimeoutError(error)) {
      throw Object.assign(new Error('Storage timed out while loading media.'), { code: 'R2_TIMEOUT' })
    }
    throw error
  }
}

export const buildAdminMediaSourceUrl = (id: string) => `/api/admin/media/${id}/source`

export const buildAdminComponentMediaSourceUrl = (id: string) =>
  `/api/admin/component-media/${id}/source`
