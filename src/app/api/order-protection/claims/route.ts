import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

const claimSchema = z.object({
  orderId: z.string().trim().min(1).max(120),
  orderItemKey: z.string().trim().max(180).optional(),
  reason: z.string().trim().min(1).max(600),
  evidenceUrls: z.array(z.string().trim().url().max(1000)).max(10).default([]),
})

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: auth, error: authError } = await supabase.auth.getUser()

  if (authError || !auth.user) {
    return jsonError('Unauthorized.', 401)
  }

  const { data, error } = await supabase
    .from('order_protection_claims')
    .select('id, order_id, order_item_key, status, reason, evidence_urls, created_at, reviewed_at, notes')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return jsonError('Unable to load claims.', 500)
  }

  const response = jsonOk({ claims: data || [] })
  applyCookies(response)
  return response
}

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: auth, error: authError } = await supabase.auth.getUser()

  if (authError || !auth.user) {
    return jsonError('Unauthorized.', 401)
  }

  const body = await request.json().catch(() => null)
  const parsed = claimSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid claim payload.', 400)
  }

  const payload = {
    user_id: auth.user.id,
    order_id: parsed.data.orderId,
    order_item_key: parsed.data.orderItemKey || null,
    reason: parsed.data.reason,
    evidence_urls: parsed.data.evidenceUrls,
  }

  const { data, error } = await supabase
    .from('order_protection_claims')
    .insert(payload)
    .select('id, order_id, order_item_key, status, reason, evidence_urls, created_at')
    .single()

  if (error) {
    if (String(error.code || '').trim() === '23505') {
      return jsonError('A claim already exists for this item.', 409)
    }
    return jsonError('Unable to submit claim.', 500)
  }

  const response = jsonOk({ claim: data }, 201)
  applyCookies(response)
  return response
}
