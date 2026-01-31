import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { cartItemUpsertSchema } from '@/lib/cart/schema'
import { normalizeUpsertItem } from '@/lib/cart/utils'
import {
  bumpCartVersion,
  ensureCartForUser,
  fetchCartSnapshot,
  normalizeSelectionKey,
} from '@/lib/cart/cart-server'

const buildConflictResponse = async (supabase, cartId, cartVersion) => {
  const snapshot = await fetchCartSnapshot(supabase, cartId)
  return NextResponse.json(
    {
      error: 'Cart version conflict.',
      items: snapshot.items,
      cartVersion,
    },
    { status: 409 },
  )
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
    const { data: auth, error: authError } = await supabase.auth.getUser()

    if (authError || !auth.user) {
      return jsonError('Unauthorized.', 401)
    }

  const ifMatch = request.headers.get('if-match')
  if (!ifMatch) {
    return jsonError('Missing cart version.', 400)
  }
  const expectedVersion = Number(ifMatch)
  if (!Number.isFinite(expectedVersion)) {
    return jsonError('Invalid cart version.', 400)
  }

    const body = await request.json().catch(() => null)
    const parsed = cartItemUpsertSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError('Invalid cart payload.', 400)
    }

    const { data: cart, error: cartError } = await ensureCartForUser(
      supabase,
      auth.user.id,
    )
    if (cartError || !cart?.id) {
      return jsonError('Unable to load cart.', 500)
    }

    if (cart.cart_version !== expectedVersion) {
      return buildConflictResponse(supabase, cart.id, cart.cart_version)
    }

    const idempotencyKey = request.headers.get('idempotency-key')
    if (idempotencyKey) {
      const { data: existingKey } = await supabase
        .from('cart_idempotency_keys')
        .select('id')
        .eq('cart_id', cart.id)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (existingKey?.id) {
        const snapshot = await fetchCartSnapshot(supabase, cart.id)
        const response = jsonOk({
          items: snapshot.items,
          cartVersion: cart.cart_version,
        })
        applyCookies(response)
        return response
      }
    }

    const normalized = normalizeUpsertItem(parsed.data)
    const selection = normalizeSelectionKey(normalized)

    if (normalized.quantity <= 0) {
      await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id)
        .match(selection)
    } else {
      const upsertPayload = {
        cart_id: cart.id,
        product_id: normalized.id,
        name: normalized.name,
        slug: normalized.slug,
        price: normalized.price,
        original_price: normalized.originalPrice,
        image: normalized.image,
        selected_variation_id: selection.selected_variation_id,
        selected_variation_label: normalized.selectedVariationLabel,
        selected_color: selection.selected_color,
        selected_size: selection.selected_size,
        quantity: normalized.quantity,
      }

      const { error: upsertError } = await supabase
        .from('cart_items')
        .upsert(upsertPayload, {
          onConflict:
            'cart_id,product_id,selected_variation_id,selected_color,selected_size',
        })
      if (upsertError) {
        return jsonError('Unable to update cart.', 500)
      }
    }

    const nextVersion = await bumpCartVersion(
      supabase,
      cart.id,
      cart.cart_version,
    )

    if (idempotencyKey) {
      await supabase.from('cart_idempotency_keys').upsert(
        {
          cart_id: cart.id,
          idempotency_key: idempotencyKey,
        },
        { onConflict: 'cart_id, idempotency_key' },
      )
    }

    const snapshot = await fetchCartSnapshot(supabase, cart.id)
    const response = jsonOk({
      items: snapshot.items,
      cartVersion: nextVersion,
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('cart items post failed:', error)
    return jsonError('Cart service unavailable.', 503)
  }
}
