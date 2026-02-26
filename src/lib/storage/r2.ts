import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import { Agent as HttpsAgent } from 'https'

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
export const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024
export const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
])

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

const createR2Client = (config: ReturnType<typeof getR2Config>) =>
  new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    forcePathStyle: true,
    maxAttempts: 3,
    requestHandler: new NodeHttpHandler({
      httpsAgent: new HttpsAgent({
        keepAlive: true,
        family: 4,
      }),
      connectionTimeout: 5000,
      socketTimeout: 20000,
    }),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })

export const isR2TimeoutError = (error: unknown) => {
  const code = (error as { code?: string })?.code
  const name = (error as { name?: string })?.name
  return code === 'ETIMEDOUT' || name === 'TimeoutError'
}

export const buildObjectKey = (file: File, prefix: string) => {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
  const safeExt = ext ? ext.replace(/[^a-zA-Z0-9]/g, '') : 'bin'
  const safePrefix = prefix.replace(/^\/+|\/+$/g, '')
  const stamp = crypto.randomUUID()
  return `${safePrefix}/${Date.now()}-${stamp}.${safeExt || 'bin'}`
}

type UploadOptions = {
  bucketName?: string
  publicBaseUrl?: string
  cacheControl?: string
}

export const uploadToR2 = async (file: File, key: string, options: UploadOptions = {}) => {
  const r2Config = getR2Config()
  const body = Buffer.from(await file.arrayBuffer())
  const client = createR2Client(r2Config)
  const bucketName = options.bucketName || r2Config.bucketName
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: file.type,
    CacheControl: options.cacheControl || 'public, max-age=31536000, immutable',
  })
  try {
    await client.send(command)
  } catch (error) {
    if (!isR2TimeoutError(error)) {
      throw error
    }
    // One more attempt for transient network timeouts.
    await client.send(command)
  }

  const publicBase = options.publicBaseUrl || r2Config.publicBaseUrl
  const url = publicBase
    ? `${publicBase.replace(/\/+$/, '')}/${key}`
    : `${r2Config.endpoint.replace(/\/+$/, '')}/${bucketName}/${key}`

  return { key, url }
}

export const deleteFromR2 = async (key: string) => {
  const r2Config = getR2Config()
  const client = createR2Client(r2Config)

  await client.send(
    new DeleteObjectCommand({
      Bucket: r2Config.bucketName,
      Key: key,
    }),
  )
}
