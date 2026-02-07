import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  buildObjectKey,
  uploadToR2,
} from '@/lib/storage/r2'

const formSchema = z.object({
  category_id: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (error) {
    console.error('Category image parse error:', error)
    return jsonError('Invalid form data.', 400)
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return jsonError('Missing file.', 400)
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return jsonError('Unsupported file type.', 415)
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonError('File too large.', 413)
  }

  const parsed = formSchema.safeParse({
    category_id: formData.get('category_id') || undefined,
  })
  if (!parsed.success) {
    return jsonError('Invalid metadata.', 400)
  }

  const categoryId = parsed.data.category_id
  const prefix = categoryId ? `categories/${parsed.data.category_id}` : 'categories/unassigned'
  const key = buildObjectKey(file, prefix)

  let uploaded
  try {
    uploaded = await uploadToR2(file, key)
  } catch (error) {
    console.error('Category image upload failed:', error)
    return jsonError('Upload failed.', 500)
  }

  try {
    await supabase
      .from('component_images')
      .insert({ r2_key: uploaded?.key || key, url: uploaded?.url || '', alt_text: file.name || null })
  } catch (err) {
    console.error('Component image mirror failed:', err)
  }

  const response = jsonOk({
    key: uploaded?.key || key,
    url: uploaded?.url || '',
  })
  applyCookies(response)
  return response
}
