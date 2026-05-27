import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { getDashboardConversationById } from '@/lib/chat/dashboard'
import {
  clearConversation,
  isSupportConversationRecord,
  purgeExpiredClosedConversations,
} from '@/lib/chat/conversation-closure'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { applyCookies, user, isAdmin, isVendor } = await requireDashboardUser(request)

    if (!user?.id) {
      return jsonError('Unauthorized.', 401)
    }
    if (!isAdmin && !isVendor) {
      return jsonError('Forbidden.', 403)
    }
    await purgeExpiredClosedConversations()

    const { conversationId } = await context.params
    const safeConversationId = String(conversationId || '').trim()
    if (!safeConversationId) {
      return jsonError('Missing conversation.', 400)
    }

    const existing = await getDashboardConversationById(safeConversationId)
    if (existing.error) {
      return jsonError('Unable to load conversation.', 500)
    }
    if (!existing.data?.id) {
      return jsonError('Conversation not found.', 404)
    }

    const safeUserId = String(user.id || '').trim()
    const isParticipant =
      String(existing.data.vendorUserId || '').trim() === safeUserId ||
      String(existing.data.customerUserId || '').trim() === safeUserId
    if (!isAdmin && !isParticipant) {
      return jsonError('Forbidden.', 403)
    }

    const supportConversation = await isSupportConversationRecord(existing.data)
    if (supportConversation) {
      return jsonError('Help Center chats cannot be cleared.', 403)
    }

    const cleared = await clearConversation({ conversationId: safeConversationId })
    if (cleared.error) {
      return jsonError('Unable to clear chat.', 500)
    }

    const response = jsonOk({
      cleared: true,
      conversationId: safeConversationId,
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat dashboard conversation clear failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}
