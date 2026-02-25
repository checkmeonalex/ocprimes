import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { cartQuantitySchema } from '@/lib/cart/schema'
import {
  bumpCartVersion,
  fetchCartSnapshot,
  getCartForUser,
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> },
) {
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
    const parsed = cartQuantitySchema.safeParse(body)
    if (!parsed.success) {
      return jsonError('Invalid cart payload.', 400)
    }

    const { data: cart, error: cartError } = await getCartForUser(
      supabase,
      auth.user.id,
    )
    if (cartError || !cart?.id) {
      return jsonError('Unable to load cart.', 500)
    }

    const strictConflict = request.headers.get('x-cart-conflict-strict') === '1'
    const resolvedVersion =
      cart.cart_version !== expectedVersion
        ? strictConflict
          ? null
          : cart.cart_version
        : expectedVersion

    if (resolvedVersion === null) {
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

    const { itemId } = await context.params
    if (!itemId) {
      return jsonError('Missing cart item.', 400)
    }

    const { data: existingItem, error: itemError } = await supabase
      .from('cart_items')
      .select('id')
      .eq('cart_id', cart.id)
      .eq('id', itemId)
      .maybeSingle()

    if (itemError) {
      return jsonError('Unable to load cart item.', 500)
    }
    if (!existingItem?.id) {
      return jsonError('Cart item not found.', 404)
    }

    if (parsed.data.quantity <= 0) {
      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id)
        .eq('id', itemId)
      if (deleteError) {
        return jsonError('Unable to update cart.', 500)
      }
    } else {
      const { error: updateError } = await supabase
        .from('cart_items')
        .update({
          quantity: parsed.data.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('cart_id', cart.id)
        .eq('id', itemId)
      if (updateError) {
        return jsonError('Unable to update cart.', 500)
      }
    }

    const nextVersion = await bumpCartVersion(
      supabase,
      cart.id,
      resolvedVersion,
    )

    if (idempotencyKey) {
      await supabase.from('cart_idempotency_keys').upsert(
        {
          cart_id: cart.id,
          item_id: itemId,
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
    console.error('cart item patch failed:', error)
    return jsonError('Cart service unavailable.', 503)
  }
}
