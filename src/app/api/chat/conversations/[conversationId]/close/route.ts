import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { getConversationForUser, toChatConversationPayload } from '@/lib/chat/chat-server'
import {
  closeConversation,
  getConversationClosureState,
  isSupportConversationRecord,
  purgeExpiredClosedConversations,
} from '@/lib/chat/conversation-closure'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
    const { data: auth, error: authError } = await supabase.auth.getUser()

    if (authError || !auth.user) {
      return jsonError('Unauthorized.', 401)
    }

    await purgeExpiredClosedConversations()

    const { conversationId } = await context.params
    if (!conversationId) {
      return jsonError('Missing conversation.', 400)
    }

    const existing = await getConversationForUser(supabase, conversationId, auth.user.id)
    if (existing.error) {
      return jsonError('Unable to load conversation.', 500)
    }
    if (!existing.data?.id) {
      return jsonError('Conversation not found.', 404)
    }
    const supportConversation = await isSupportConversationRecord(existing.data)
    if (supportConversation) {
      return jsonError('Help Center chats cannot be ended.', 403)
    }

    const closeResult = await closeConversation({
      conversationId,
      closedByUserId: auth.user.id,
      closedReason: 'ended_by_user',
    })

    if (closeResult.error) {
      return jsonError('Unable to close conversation.', 500)
    }

    const refreshed = await getConversationForUser(supabase, conversationId, auth.user.id)
    if (refreshed.error || !refreshed.data?.id) {
      return jsonError('Unable to load conversation.', 500)
    }

    const roleInfo = await getUserRoleInfoSafe(supabase, auth.user.id, auth.user.email || '')
    const closure = getConversationClosureState({
      conversation: refreshed.data,
      isAdmin: roleInfo.isAdmin,
    })

    const response = jsonOk({
      currentUserId: auth.user.id,
      conversation: {
        ...toChatConversationPayload(refreshed.data),
        isClosed: closure.isClosed,
        canView: closure.canView,
        canSend: closure.canSend,
        participantNotice: closure.participantNotice,
        participantVisibleUntil: closure.participantVisibleUntil,
        adminRetentionUntil: closure.adminRetentionUntil,
      },
      closed: true,
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat close post failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}
