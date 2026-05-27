import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  buildObjectKey,
  uploadToR2,
} from '@/lib/storage/r2'

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (error) {
    console.error('Avatar upload parse error:', error)
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

  const prefix = `users/${data.user.id}/avatars`
  const key = buildObjectKey(file, prefix)

  let uploaded
  try {
    uploaded = await uploadToR2(file, key)
  } catch (error) {
    console.error('Avatar upload failed:', error)
    return jsonError('Upload failed.', 500)
  }

  const metadata = data.user.user_metadata || {}
  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      ...metadata,
      avatar_url: uploaded.url,
    },
  })

  if (updateError) {
    console.error('Avatar metadata update failed:', updateError.message)
    return jsonError('Unable to save avatar.', 500)
  }

  const response = jsonOk({ avatar_url: uploaded.url })
  applyCookies(response)
  return response
}
