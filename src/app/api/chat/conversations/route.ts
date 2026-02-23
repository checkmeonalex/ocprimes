import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import {
  chatConversationInitSchema,
} from '@/lib/chat/schema'
import {
  findOrCreateConversation,
  listConversationsForUser,
  listMessagesForConversation,
  resolveVendorUserIdForProduct,
  toChatConversationPayload,
  toChatMessagePayload,
} from '@/lib/chat/chat-server'

export async function GET(request: NextRequest) {
  try {
    const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
    const { data: auth, error: authError } = await supabase.auth.getUser()

    if (authError || !auth.user) {
      return jsonError('Unauthorized.', 401)
    }

    const listResult = await listConversationsForUser(supabase, auth.user.id)
    if (listResult.error) {
      return jsonError('Unable to load conversations.', 500)
    }

    const response = jsonOk({
      currentUserId: auth.user.id,
      conversations: listResult.data.map(toChatConversationPayload),
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat conversations get failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
    const { data: auth, error: authError } = await supabase.auth.getUser()

    if (authError || !auth.user) {
      return jsonError('Unauthorized.', 401)
    }

    const body = await request.json().catch(() => null)
    const parsed = chatConversationInitSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError('Invalid chat payload.', 400)
    }

    const { data: visibleProduct, error: visibleProductError } = await supabase
      .from('products')
      .select('id')
      .eq('id', parsed.data.productId)
      .eq('status', 'publish')
      .maybeSingle()

    if (visibleProductError) {
      return jsonError('Unable to verify product.', 500)
    }

    if (!visibleProduct?.id) {
      return jsonError('Product not found.', 404)
    }

    const vendorResult = await resolveVendorUserIdForProduct(parsed.data.productId)
    if (vendorResult.error) {
      return jsonError('Unable to resolve seller.', 500)
    }

    if (!vendorResult.vendorUserId) {
      return jsonError('Seller chat is unavailable for this product.', 409)
    }

    if (vendorResult.vendorUserId === auth.user.id) {
      return jsonError('You cannot open a chat with yourself.', 400)
    }

    const conversationResult = await findOrCreateConversation(
      supabase,
      auth.user.id,
      vendorResult.vendorUserId,
      parsed.data.productId,
    )

    if (conversationResult.error || !conversationResult.data?.id) {
      return jsonError('Unable to start conversation.', 500)
    }

    const messagesResult = await listMessagesForConversation(
      supabase,
      conversationResult.data.id,
      50,
    )

    if (messagesResult.error) {
      return jsonError('Unable to load conversation messages.', 500)
    }

    const response = jsonOk({
      currentUserId: auth.user.id,
      conversation: toChatConversationPayload(conversationResult.data),
      messages: messagesResult.data.map((row) => toChatMessagePayload(row, auth.user.id)),
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat conversations post failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}
