import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { chatMessageCreateSchema, chatMessagesQuerySchema } from '@/lib/chat/schema'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import {
  getDashboardConversationById,
  insertDashboardMessage,
  listDashboardMessages,
} from '@/lib/chat/dashboard'
import { markVendorConversationMessageReceipts } from '@/lib/chat/chat-server'
import { notifyCustomerOnVendorChatMessage } from '@/lib/chat/notifications'
import {
  getConversationClosureState,
  isSupportConversationRecord,
  maybeAutoCloseConversation,
  purgeExpiredClosedConversations,
  reopenConversation,
} from '@/lib/chat/conversation-closure'

export async function GET(
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

    const conversationResult = await getDashboardConversationById(conversationId)
    if (conversationResult.error) {
      return jsonError('Unable to load conversation.', 500)
    }

    if (!conversationResult.data?.id) {
      return jsonError('Conversation not found.', 404)
    }
    const isParticipant =
      String(conversationResult.data.vendorUserId || '').trim() === String(user.id || '').trim() ||
      String(conversationResult.data.customerUserId || '').trim() === String(user.id || '').trim()
    if (!isAdmin && !isParticipant) {
      return jsonError('Forbidden.', 403)
    }
    const autoCloseResult = await maybeAutoCloseConversation(conversationResult.data)
    if (autoCloseResult.error) {
      return jsonError('Unable to load conversation.', 500)
    }
    let resolvedConversation = autoCloseResult.changed
      ? (await getDashboardConversationById(conversationId)).data
      : conversationResult.data
    if (!resolvedConversation?.id) {
      return jsonError('Conversation not found.', 404)
    }
    const closure = getConversationClosureState({
      conversation: resolvedConversation,
      isAdmin,
    })
    if (!closure.canView) {
      return jsonError('Conversation not found.', 404)
    }

    const isConversationVendor =
      String(resolvedConversation.vendorUserId || '').trim() === String(user.id || '').trim()

    if (isConversationVendor) {
      const adminDb = createAdminSupabaseClient()
      await markVendorConversationMessageReceipts(adminDb, conversationId, user.id)
    }

    const parsed = chatMessagesQuerySchema.safeParse({
      limit: request.nextUrl.searchParams.get('limit') || undefined,
      before: request.nextUrl.searchParams.get('before') || undefined,
    })

    if (!parsed.success) {
      return jsonError('Invalid message query.', 400)
    }
    const beforeCursor = String(parsed.data.before || '').trim()
    if (beforeCursor && Number.isNaN(new Date(beforeCursor).getTime())) {
      return jsonError('Invalid message query.', 400)
    }

    const messagesResult = await listDashboardMessages(
      conversationId,
      parsed.data.limit,
      beforeCursor,
    )
    if (messagesResult.error) {
      return jsonError('Unable to load messages.', 500)
    }

    const response = jsonOk({
      currentUserId: user.id,
      role: isAdmin ? 'admin' : 'vendor',
      conversation: {
        ...resolvedConversation,
        isClosed: closure.isClosed,
        canView: closure.canView,
        canSend: closure.canSend,
        participantNotice: closure.participantNotice,
        participantVisibleUntil: closure.participantVisibleUntil,
        adminRetentionUntil: closure.adminRetentionUntil,
      },
      messages: messagesResult.data,
      pagination: {
        limit: parsed.data.limit,
        hasMore: Boolean(messagesResult.hasMore),
        nextBefore: messagesResult.oldestMessageCreatedAt || null,
      },
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat dashboard messages get failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}

export async function POST(
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

    const conversationResult = await getDashboardConversationById(conversationId)
    if (conversationResult.error) {
      return jsonError('Unable to load conversation.', 500)
    }

    if (!conversationResult.data?.id) {
      return jsonError('Conversation not found.', 404)
    }
    const isParticipant =
      String(conversationResult.data.vendorUserId || '').trim() === String(user.id || '').trim() ||
      String(conversationResult.data.customerUserId || '').trim() === String(user.id || '').trim()
    if (!isAdmin && !isParticipant) {
      return jsonError('Forbidden.', 403)
    }
    const autoCloseResult = await maybeAutoCloseConversation(conversationResult.data)
    if (autoCloseResult.error) {
      return jsonError('Unable to load conversation.', 500)
    }
    let resolvedConversation = autoCloseResult.changed
      ? (await getDashboardConversationById(conversationId)).data
      : conversationResult.data
    if (!resolvedConversation?.id) {
      return jsonError('Conversation not found.', 404)
    }
    let closure = getConversationClosureState({
      conversation: resolvedConversation,
      isAdmin,
    })
    if (!closure.canSend) {
      const supportConversation = await isSupportConversationRecord(resolvedConversation)
      const shouldForceReopen = supportConversation
      if (shouldForceReopen) {
        const reopenResult = await reopenConversation({ conversationId })
        if (!reopenResult.error) {
          const refreshed = await getDashboardConversationById(conversationId)
          if (refreshed.data?.id) {
            resolvedConversation = refreshed.data
            closure = getConversationClosureState({
              conversation: resolvedConversation,
              isAdmin,
            })
          }
        }
      }
    }
    if (!closure.canSend) {
      return jsonError(
        closure.participantNotice || 'This chat is closed. You can no longer send messages.',
        403,
      )
    }

    if (isVendor && resolvedConversation.adminTakeoverEnabled) {
      return jsonError('Admin has taken over this chat. You can no longer send messages.', 403)
    }

    const body = await request.json().catch(() => null)
    const parsed = chatMessageCreateSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError('Invalid message payload.', 400)
    }

    const insertResult = await insertDashboardMessage(conversationId, user.id, parsed.data.body)
    if (insertResult.error || !insertResult.data?.id) {
      return jsonError('Unable to send message.', 500)
    }

    try {
      await notifyCustomerOnVendorChatMessage({
        conversation: resolvedConversation,
        senderUserId: user.id,
      })
    } catch (notificationError) {
      console.error('chat message customer notification failed:', notificationError)
    }

    const response = jsonOk({
      currentUserId: user.id,
      role: isAdmin ? 'admin' : 'vendor',
      conversation: {
        ...resolvedConversation,
        isClosed: closure.isClosed,
        canView: closure.canView,
        canSend: closure.canSend,
        participantNotice: closure.participantNotice,
        participantVisibleUntil: closure.participantVisibleUntil,
        adminRetentionUntil: closure.adminRetentionUntil,
      },
      message: insertResult.data,
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat dashboard messages post failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}
