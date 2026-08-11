import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { estimateMeasurements } from '@/lib/size-prediction/estimate'

const TABLE = 'user_body_profiles'
const SELECT_FIELDS =
  'gender, height_cm, weight_kg, estimated_bust_cm, estimated_waist_cm, estimated_hip_cm, ' +
  'age_range, body_shape, bust_cm, waist_cm, hip_cm, usual_size, fit_preference, updated_at'

const buildMissingTableMessage = () =>
  'user_body_profiles table not found. Run migration 114_user_body_profiles.sql.'

const nullableString = (max: number) =>
  z.preprocess((value) => (value === '' ? undefined : value), z.string().max(max).optional())

const bodyProfileSchema = z.object({
  gender: z.enum(['male', 'female']),
  height_cm: z.number().min(50).max(260),
  weight_kg: z.number().min(20).max(400),
  // Detailed Fit — all optional, refine the Quick Fit estimate when present.
  age_range: nullableString(20),
  body_shape: z.enum(['hourglass', 'pear', 'apple', 'rectangle', 'inverted_triangle']).optional(),
  bust_cm: z.number().min(30).max(200).optional(),
  waist_cm: z.number().min(30).max(200).optional(),
  hip_cm: z.number().min(30).max(200).optional(),
  usual_size: nullableString(20),
  fit_preference: z.enum(['fitted', 'regular', 'relaxed']).optional(),
})

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return jsonError('You must be signed in.', 401)
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_FIELDS)
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('body profile fetch failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to load body profile.', 500)
  }

  const response = jsonOk({ item: data || null })
  applyCookies(response)
  return response
}

export async function PUT(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return jsonError('You must be signed in.', 401)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return jsonError('Invalid JSON payload.', 400)
  }

  const parsed = bodyProfileSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid body profile.', 400)
  }

  const estimate = estimateMeasurements(parsed.data.height_cm, parsed.data.weight_kg, parsed.data.gender)

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        user_id: userData.user.id,
        gender: parsed.data.gender,
        height_cm: parsed.data.height_cm,
        weight_kg: parsed.data.weight_kg,
        estimated_bust_cm: estimate.bustCm,
        estimated_waist_cm: estimate.waistCm,
        estimated_hip_cm: estimate.hipCm,
        age_range: parsed.data.age_range ?? null,
        body_shape: parsed.data.body_shape ?? null,
        bust_cm: parsed.data.bust_cm ?? null,
        waist_cm: parsed.data.waist_cm ?? null,
        hip_cm: parsed.data.hip_cm ?? null,
        usual_size: parsed.data.usual_size ?? null,
        fit_preference: parsed.data.fit_preference ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select(SELECT_FIELDS)
    .single()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('body profile save failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to save body profile.', 500)
  }

  const response = jsonOk({ item: data })
  applyCookies(response)
  return response
}

export async function DELETE(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return jsonError('You must be signed in.', 401)
  }

  const { error } = await supabase.from(TABLE).delete().eq('user_id', userData.user.id)
  if (error) {
    const errorCode = (error as { code?: string })?.code
    if (errorCode !== '42P01') {
      console.error('body profile delete failed:', error.message)
      return jsonError('Unable to delete body profile.', 500)
    }
  }

  const response = jsonOk({ deleted: true })
  applyCookies(response)
  return response
}
