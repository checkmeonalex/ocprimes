import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError } from '@/lib/http/response'
import { readMediaFromStorage } from '@/lib/storage/admin-media-source'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return jsonError('Invalid media id.', 400)
  }

  const db = createAdminSupabaseClient()
  const { data, error } = await db
    .from('component_images')
    .select('id, r2_key, url')
    .eq('id', parsed.data.id)
    .maybeSingle()

  if (error) {
    console.error('Component media source lookup failed:', error.message)
    return jsonError('Unable to load media source.', 500)
  }

  if (!data) {
    return jsonError('Media not found.', 404)
  }

  try {
    return await readMediaFromStorage({
      r2Key: data.r2_key,
      url: data.url,
      contentTypeFallback: 'image/webp',
    })
  } catch (storageError) {
    console.error('Component media source read failed:', storageError)
    if ((storageError as { code?: string })?.code === 'R2_TIMEOUT') {
      return jsonError('Storage timed out while loading media.', 504)
    }
    if ((storageError as { code?: string })?.code === 'MEDIA_UNAVAILABLE') {
      return jsonError('Media source unavailable.', 404)
    }
    return jsonError('Unable to load media source.', 500)
  }
}
