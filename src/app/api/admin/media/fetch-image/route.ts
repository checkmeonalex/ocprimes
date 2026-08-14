import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { jsonError, jsonOk } from '@/lib/http/response'
import { isSafeExternalUrl } from '@/lib/http/ssrf-guard'
import { ALLOWED_ADMIN_IMAGE_TYPES } from '@/lib/storage/admin-media'

const bodySchema = z.object({
  url: z.string().url().max(2000),
})

const MAX_FETCH_BYTES = 8_000_000

export async function POST(request: NextRequest) {
  const { applyCookies, canManageCatalog } = await requireDashboardUser(request)
  if (!canManageCatalog) {
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

  const urlCheck = await isSafeExternalUrl(parsed.data.url)
  if (urlCheck.safe === false) {
    return jsonError(`Refusing to fetch that URL: ${urlCheck.reason}`, 400)
  }

  let response: Response
  try {
    response = await fetch(parsed.data.url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })
  } catch (error) {
    console.error('fetch-image failed:', error)
    return jsonError('Unable to fetch that URL.', 400)
  }

  if (!response.ok) {
    return jsonError(`Fetch failed with status ${response.status}.`, 400)
  }

  const mimeType = (response.headers.get('content-type') || '').split(';')[0].trim()
  if (!ALLOWED_ADMIN_IMAGE_TYPES.has(mimeType)) {
    return jsonError(`Unsupported content type: ${mimeType || 'unknown'}.`, 415)
  }

  const contentLength = Number(response.headers.get('content-length') || 0)
  if (contentLength && contentLength > MAX_FETCH_BYTES) {
    return jsonError('Image exceeds the 8MB fetch limit.', 413)
  }

  const arrayBuffer = await response.arrayBuffer()
  if (arrayBuffer.byteLength > MAX_FETCH_BYTES) {
    return jsonError('Image exceeds the 8MB fetch limit.', 413)
  }

  const result = jsonOk({
    mimeType,
    data: Buffer.from(arrayBuffer).toString('base64'),
  })
  applyCookies(result)
  return result
}
