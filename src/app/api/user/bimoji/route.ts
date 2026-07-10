import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { BIMOJI_CHARACTER_IDS } from '@/lib/user/bimoji.mjs'

const payloadSchema = z.object({
  characterId: z.enum(BIMOJI_CHARACTER_IDS as [string, ...string[]]),
})

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return jsonError('Invalid JSON payload.', 400)
  }

  const parsed = payloadSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError('Invalid character selection.', 400)
  }

  const metadata = data.user.user_metadata || {}
  const { error: updateError } = await supabase.auth.updateUser({
    data: { ...metadata, bimoji_character: parsed.data.characterId },
  })
  if (updateError) {
    console.error('Bimoji update failed:', updateError.message)
    return jsonError('Unable to save your character.', 500)
  }

  const response = jsonOk({ characterId: parsed.data.characterId })
  applyCookies(response)
  return response
}
