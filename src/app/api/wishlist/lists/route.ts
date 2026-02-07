import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

const normalizeVisibility = (value?: string) => {
  const allowed = new Set(['private', 'invite', 'public', 'unlisted'])
  if (value && allowed.has(value)) return value
  return 'invite'
}

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  const { data: lists, error: listError } = await supabase
    .from('wishlists')
    .select('id,name,description,visibility,share_token,created_at')
    .eq('user_id', data.user.id)
    .order('created_at', { ascending: false })

  if (listError) {
    console.error('Wishlist list fetch failed:', listError.message)
    if (listError.code === '42P01') {
      return jsonError('Wishlist tables are missing. Apply supabase/sql/021_wishlists.sql.', 500)
    }
    return jsonError('Unable to load wishlists.', 500)
  }

  let nextLists = lists || []
  if (!nextLists.length) {
    const { data: created, error: createError } = await supabase
      .from('wishlists')
      .insert({
        user_id: data.user.id,
        name: 'All wishlist',
        visibility: 'invite',
      })
      .select('id,name,description,visibility,share_token,created_at')
      .single()
    if (createError) {
      console.error('Wishlist default list create failed:', createError.message)
    } else if (created) {
      nextLists = [created]
    }
  }

  if (nextLists.length) {
    const listIds = nextLists.map((list) => list.id)
    const { data: items, error: itemsError } = await supabase
      .from('wishlist_items')
      .select('wishlist_id,product_image,created_at')
      .in('wishlist_id', listIds)
      .order('created_at', { ascending: false })
    if (!itemsError && Array.isArray(items)) {
      const previewsByList = new Map()
      items.forEach((item) => {
        const list = previewsByList.get(item.wishlist_id) || []
        if (list.length < 4 && item.product_image) {
          list.push(item.product_image)
        }
        previewsByList.set(item.wishlist_id, list)
      })
      nextLists = nextLists.map((list) => ({
        ...list,
        previews: previewsByList.get(list.id) || [],
      }))
    }
  }

  const response = jsonOk({ items: nextLists })
  applyCookies(response)
  return response
}

export async function POST(request: NextRequest) {
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

  const name = (payload.name || '').trim()
  if (!name) {
    return jsonError('List name is required.', 400)
  }

  const visibility = normalizeVisibility(payload.visibility)
  const shareToken = visibility === 'public' || visibility === 'unlisted' ? crypto.randomUUID() : null
  const description =
    payload.description !== undefined ? String(payload.description).trim() : null
  const wordCount = description
    ? description
        .trim()
        .split(/\s+/)
        .filter(Boolean).length
    : 0
  if (wordCount > 50) {
    return jsonError('Description must be 50 words or less.', 400)
  }

  const { data: list, error: insertError } = await supabase
    .from('wishlists')
    .insert({
      user_id: data.user.id,
      name,
      description: description || null,
      visibility,
      share_token: shareToken,
    })
    .select('id,name,description,visibility,share_token,created_at')
    .single()

  if (insertError) {
    console.error('Wishlist list insert failed:', insertError.message)
    return jsonError('Unable to create list.', 500)
  }

  const response = jsonOk({ item: list })
  applyCookies(response)
  return response
}
