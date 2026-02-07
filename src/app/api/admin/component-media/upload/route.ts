import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  buildObjectKey,
  isR2TimeoutError,
  uploadToR2,
} from '@/lib/storage/r2'

const formSchema = z.object({
  alt_text: z.string().max(200).optional(),
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
    console.error('Upload parse error:', error)
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
    alt_text: formData.get('alt_text') || undefined,
  })
  if (!parsed.success) {
    return jsonError('Invalid metadata.', 400)
  }

  const prefix = 'components/library'
  const key = buildObjectKey(file, prefix)
  let uploaded
  try {
    uploaded = await uploadToR2(file, key)
  } catch (error) {
    console.error('Component upload failed:', error)
    if (isR2TimeoutError(error)) {
      return jsonError('Upload timed out. Check R2 endpoint/network and try again.', 504)
    }
    return jsonError('Upload failed.', 500)
  }

  const url = uploaded?.url || ''

  const { data, error } = await supabase
    .from('component_images')
    .insert({
      r2_key: uploaded?.key || key,
      url: url,
      alt_text: parsed.data.alt_text || null,
    })
    .select('id, r2_key, url, alt_text, created_at')
    .single()
  if (error) {
    console.error('Component media DB insert failed:', error.message)
    return jsonError('Saved file, but DB insert failed.', 500)
  }

  const response = jsonOk({
    id: data?.id || null,
    key: data?.r2_key || key,
    url: data?.url || url,
    alt_text: data?.alt_text || null,
    created_at: data?.created_at || null,
  })
  applyCookies(response)
  return response
}
