import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { getConversationForUser } from '@/lib/chat/chat-server'
import { resolveSellerStatusForConversation } from '@/lib/chat/seller-status'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
    const { data: auth, error: authError } = await supabase.auth.getUser()

    if (authError || !auth.user) {
      return jsonError('Unauthorized.', 401)
    }

    const { conversationId } = await context.params
    if (!conversationId) {
      return jsonError('Missing conversation.', 400)
    }

    const conversationResult = await getConversationForUser(
      supabase,
      conversationId,
      auth.user.id,
    )

    if (conversationResult.error) {
      return jsonError('Unable to load conversation.', 500)
    }

    if (!conversationResult.data?.id) {
      return jsonError('Conversation not found.', 404)
    }

    const sellerStatus = await resolveSellerStatusForConversation({
      conversationId: String(conversationResult.data.id || '').trim(),
      customerUserId: String(conversationResult.data.customer_user_id || '').trim(),
      vendorUserId: String(conversationResult.data.vendor_user_id || '').trim(),
    })

    const response = jsonOk({
      sellerStatusLabel: sellerStatus.sellerStatusLabel,
      sellerOnline: sellerStatus.sellerOnline,
      sellerLastActiveAt: sellerStatus.sellerLastActiveAt,
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat conversation presence get failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}
