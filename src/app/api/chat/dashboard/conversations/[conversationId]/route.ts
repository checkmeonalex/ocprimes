import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import {
  deleteDashboardConversation,
  getDashboardConversationById,
  setDashboardConversationAdminTakeover,
} from '@/lib/chat/dashboard'

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

    const deleted = await deleteDashboardConversation(conversationId)
    if (deleted.error) {
      return jsonError('Unable to delete conversation.', 500)
    }

    const response = jsonOk({
      deletedConversationId: conversationId,
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

    const { conversationId } = await context.params
    if (!conversationId) {
      return jsonError('Missing conversation.', 400)
    }

    const body = await request.json().catch(() => null)
    const enabled = Boolean(body?.adminTakeoverEnabled)

    const existing = await getDashboardConversationById(conversationId)
    if (existing.error) {
      return jsonError('Unable to load conversation.', 500)
    }

    if (!existing.data?.id) {
      return jsonError('Conversation not found.', 404)
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

    const response = jsonOk({
      conversation: refreshed.data,
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat dashboard conversation takeover patch failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}
