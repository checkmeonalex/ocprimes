import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import {
  getDashboardConversationById,
  setDashboardConversationAdminTakeover,
} from '@/lib/chat/dashboard'
import {
  closeConversation,
  getConversationClosureState,
  purgeExpiredClosedConversations,
  isSupportConversationRecord,
  reopenConversation,
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
    if (!conversationId) {
      return jsonError('Missing conversation.', 400)
    }

    const existing = await getDashboardConversationById(conversationId)
    if (existing.error) {
      return jsonError('Unable to load conversation.', 500)
    }

    if (!existing.data?.id) {
      return jsonError('Conversation not found.', 404)
    }
    const isParticipant =
      String(existing.data.vendorUserId || '').trim() === String(user.id || '').trim() ||
      String(existing.data.customerUserId || '').trim() === String(user.id || '').trim()
    if (!isAdmin && !isParticipant) {
      return jsonError('Forbidden.', 403)
    }
    const supportConversation = await isSupportConversationRecord(existing.data)
    if (supportConversation) {
      return jsonError('Help Center chats cannot be ended.', 403)
    }

    const closeResult = await closeConversation({
      conversationId,
      closedByUserId: user.id,
      closedReason: 'ended_by_user',
    })
    if (closeResult.error) {
      return jsonError('Unable to close conversation.', 500)
    }

    const refreshed = await getDashboardConversationById(conversationId)
    if (refreshed.error || !refreshed.data?.id) {
      return jsonError('Unable to load updated conversation.', 500)
    }
    const closure = getConversationClosureState({
      conversation: refreshed.data,
      isAdmin,
    })

    const response = jsonOk({
      conversation: {
        ...refreshed.data,
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
    console.error('chat dashboard conversation delete failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { applyCookies, user, isAdmin } = await requireDashboardUser(request)

    if (!user?.id) {
      return jsonError('Unauthorized.', 401)
    }

    if (!isAdmin) {
      return jsonError('Forbidden.', 403)
    }
    await purgeExpiredClosedConversations()

    const { conversationId } = await context.params
    if (!conversationId) {
      return jsonError('Missing conversation.', 400)
    }

    const body = await request.json().catch(() => null)
    const enabled = Boolean(body?.adminTakeoverEnabled)
    const shouldReopen = Boolean(body?.reopenChat)

    const existing = await getDashboardConversationById(conversationId)
    if (existing.error) {
      return jsonError('Unable to load conversation.', 500)
    }

    if (!existing.data?.id) {
      return jsonError('Conversation not found.', 404)
    }
    if (shouldReopen) {
      const reopened = await reopenConversation({ conversationId })
      if (reopened.error) {
        return jsonError('Unable to reopen chat.', 500)
      }
      const refreshedAfterReopen = await getDashboardConversationById(conversationId)
      if (refreshedAfterReopen.error || !refreshedAfterReopen.data?.id) {
        return jsonError('Unable to load updated conversation.', 500)
      }
      const closureAfterReopen = getConversationClosureState({
        conversation: refreshedAfterReopen.data,
        isAdmin,
      })
      const response = jsonOk({
        conversation: {
          ...refreshedAfterReopen.data,
          isClosed: closureAfterReopen.isClosed,
          canView: closureAfterReopen.canView,
          canSend: closureAfterReopen.canSend,
          participantNotice: closureAfterReopen.participantNotice,
          participantVisibleUntil: closureAfterReopen.participantVisibleUntil,
          adminRetentionUntil: closureAfterReopen.adminRetentionUntil,
        },
      })
      applyCookies(response)
      return response
    }

    const updated = await setDashboardConversationAdminTakeover(conversationId, {
      enabled,
      adminUserId: user.id,
    })
    if (updated.error) {
      return jsonError('Unable to update chat takeover.', 500)
    }

    const refreshed = await getDashboardConversationById(conversationId)
    if (refreshed.error || !refreshed.data?.id) {
      return jsonError('Unable to load updated conversation.', 500)
    }
    const closure = getConversationClosureState({
      conversation: refreshed.data,
      isAdmin,
    })

    const response = jsonOk({
      conversation: {
        ...refreshed.data,
        isClosed: closure.isClosed,
        canView: closure.canView,
        canSend: closure.canSend,
        participantNotice: closure.participantNotice,
        participantVisibleUntil: closure.participantVisibleUntil,
        adminRetentionUntil: closure.adminRetentionUntil,
      },
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat dashboard conversation takeover patch failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}
