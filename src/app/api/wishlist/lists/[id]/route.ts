import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

const normalizeVisibility = (value?: string) => {
  const allowed = new Set(['private', 'invite', 'public', 'unlisted'])
  if (value && allowed.has(value)) return value
  return 'private'
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  const { id: listId } = await context.params
  const { data: list, error: listError } = await supabase
    .from('wishlists')
    .select('id,name,description,visibility,share_token,created_at')
    .eq('id', listId)
    .eq('user_id', data.user.id)
    .single()

  if (listError || !list) {
    return jsonError('Wishlist not found.', 404)
  }

  const { data: items, error: itemsError } = await supabase
    .from('wishlist_items')
    .select('id,product_id,product_name,product_slug,product_price,product_image,created_at')
    .eq('wishlist_id', listId)
    .order('created_at', { ascending: false })

  if (itemsError) {
    console.error('Wishlist items fetch failed:', itemsError.message)
    return jsonError('Unable to load wishlist items.', 500)
  }

  const response = jsonOk({ list, items: items || [] })
  applyCookies(response)
  return response
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  let payload: { name?: string; visibility?: string; description?: string }
  try {
    payload = await request.json()
  } catch {
    return jsonError('Invalid JSON payload.', 400)
  }

  const { id: listId } = await context.params
  const updates: { name?: string; description?: string | null; visibility?: string; share_token?: string | null } = {}

  if (payload.name !== undefined) {
    const name = payload.name.trim()
    if (!name) {
      return jsonError('List name is required.', 400)
    }
    updates.name = name
  }

  if (payload.visibility) {
    const visibility = normalizeVisibility(payload.visibility)
    updates.visibility = visibility
  }

  if (payload.description !== undefined) {
    const description = String(payload.description).trim()
    const wordCount = description
      ? description
          .trim()
          .split(/\s+/)
          .filter(Boolean).length
      : 0
    if (wordCount > 50) {
      return jsonError('Description must be 50 words or less.', 400)
    }
    updates.description = description || null
  }

  const { data: existing, error: existingError } = await supabase
    .from('wishlists')
    .select('id,share_token,visibility')
    .eq('id', listId)
    .eq('user_id', data.user.id)
    .single()

  if (existingError || !existing) {
    return jsonError('Wishlist not found.', 404)
  }

  const nextVisibility = updates.visibility || existing.visibility
  if (nextVisibility === 'public' || nextVisibility === 'unlisted') {
    updates.share_token = existing.share_token || crypto.randomUUID()
  } else {
    updates.share_token = null
  }

  const { data: updated, error: updateError } = await supabase
    .from('wishlists')
    .update(updates)
    .eq('id', listId)
    .eq('user_id', data.user.id)
    .select('id,name,description,visibility,share_token,created_at')
    .single()

  if (updateError) {
    console.error('Wishlist update failed:', updateError.message)
    return jsonError('Unable to update wishlist.', 500)
  }

  const response = jsonOk({ item: updated })
  applyCookies(response)
  return response
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  const { id: listId } = await context.params
  const { error: deleteError } = await supabase
    .from('wishlists')
    .delete()
    .eq('id', listId)
    .eq('user_id', data.user.id)

  if (deleteError) {
    console.error('Wishlist delete failed:', deleteError.message)
    return jsonError('Unable to delete wishlist.', 500)
  }

  const response = jsonOk({ success: true })
  applyCookies(response)
  return response
}
