import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { chatMessageCreateSchema, chatMessagesQuerySchema } from '@/lib/chat/schema'
import {
  getConversationForUser,
  insertConversationMessage,
  listMessagesForConversation,
  markCustomerConversationMessageReceipts,
  loadVendorDisplayNameMap,
  toChatConversationPayload,
  toChatMessagePayload,
} from '@/lib/chat/chat-server'
import { notifyVendorOnCustomerChatMessage } from '@/lib/chat/notifications'
import {
  getConversationClosureState,
  isSupportConversationRecord,
  maybeAutoCloseConversation,
  purgeExpiredClosedConversations,
  reopenConversation,
} from '@/lib/chat/conversation-closure'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'

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
    await purgeExpiredClosedConversations()

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
    const autoCloseResult = await maybeAutoCloseConversation(conversationResult.data)
    if (autoCloseResult.error) {
      return jsonError('Unable to load conversation.', 500)
    }
    let resolvedConversation =
      autoCloseResult.changed
        ? (await getConversationForUser(supabase, conversationId, auth.user.id)).data
        : conversationResult.data
    if (!resolvedConversation?.id) {
      return jsonError('Conversation not found.', 404)
    }

    const roleInfo = await getUserRoleInfoSafe(supabase, auth.user.id, auth.user.email || '')
    const closure = getConversationClosureState({
      conversation: resolvedConversation,
      isAdmin: roleInfo.isAdmin,
    })
    if (!closure.canView) {
      return jsonError('Conversation not found.', 404)
    }
    const isConversationCustomer =
      String(resolvedConversation.customer_user_id || '').trim() === String(auth.user.id || '').trim()
    if (isConversationCustomer) {
      const adminDb = createAdminSupabaseClient()
      await markCustomerConversationMessageReceipts(adminDb, conversationId, auth.user.id)
    }

    const queryParse = chatMessagesQuerySchema.safeParse({
      limit: request.nextUrl.searchParams.get('limit') || undefined,
      before: request.nextUrl.searchParams.get('before') || undefined,
    })

    if (!queryParse.success) {
      return jsonError('Invalid message query.', 400)
    }
    const beforeCursor = String(queryParse.data.before || '').trim()
    if (beforeCursor && Number.isNaN(new Date(beforeCursor).getTime())) {
      return jsonError('Invalid message query.', 400)
    }

    const messagesResult = await listMessagesForConversation(
      supabase,
      conversationId,
      queryParse.data.limit,
      beforeCursor,
    )

    if (messagesResult.error) {
      return jsonError('Unable to load messages.', 500)
    }

    const vendorNameMap = await loadVendorDisplayNameMap([
      String(resolvedConversation.vendor_user_id || '').trim(),
    ])

    const response = jsonOk({
      currentUserId: auth.user.id,
      conversation: {
        ...toChatConversationPayload(resolvedConversation),
        vendorName:
          vendorNameMap.get(String(resolvedConversation.vendor_user_id || '').trim()) || '',
        isClosed: closure.isClosed,
        canView: closure.canView,
        canSend: closure.canSend,
        participantNotice: closure.participantNotice,
        participantVisibleUntil: closure.participantVisibleUntil,
        adminRetentionUntil: closure.adminRetentionUntil,
      },
      messages: messagesResult.data.map((row) => toChatMessagePayload(row, auth.user.id)),
      pagination: {
        limit: queryParse.data.limit,
        hasMore: Boolean(messagesResult.hasMore),
        nextBefore: messagesResult.oldestMessageCreatedAt || null,
      },
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat messages get failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}

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
    const autoCloseResult = await maybeAutoCloseConversation(conversationResult.data)
    if (autoCloseResult.error) {
      return jsonError('Unable to load conversation.', 500)
    }
    let resolvedConversation =
      autoCloseResult.changed
        ? (await getConversationForUser(supabase, conversationId, auth.user.id)).data
        : conversationResult.data
    if (!resolvedConversation?.id) {
      return jsonError('Conversation not found.', 404)
    }

    const roleInfo = await getUserRoleInfoSafe(supabase, auth.user.id, auth.user.email || '')
    let closure = getConversationClosureState({
      conversation: resolvedConversation,
      isAdmin: roleInfo.isAdmin,
    })
    if (!closure.canSend) {
      const supportConversation = await isSupportConversationRecord(resolvedConversation)
      const shouldForceReopen = supportConversation
      if (shouldForceReopen) {
        const reopenResult = await reopenConversation({ conversationId })
        if (!reopenResult.error) {
          const refreshed = await getConversationForUser(supabase, conversationId, auth.user.id)
          if (refreshed.data?.id) {
            resolvedConversation = refreshed.data
            closure = getConversationClosureState({
              conversation: resolvedConversation,
              isAdmin: roleInfo.isAdmin,
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

    const body = await request.json().catch(() => null)
    const parsed = chatMessageCreateSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError('Invalid message payload.', 400)
    }

    const insertResult = await insertConversationMessage(
      supabase,
      conversationId,
      auth.user.id,
      parsed.data.body,
    )

    if (insertResult.error || !insertResult.data?.id) {
      return jsonError('Unable to send message.', 500)
    }

    try {
      await notifyVendorOnCustomerChatMessage({
        conversation: resolvedConversation,
        senderUserId: auth.user.id,
      })
    } catch (notificationError) {
      console.error('chat message vendor notification failed:', notificationError)
    }

    const vendorNameMap = await loadVendorDisplayNameMap([
      String(resolvedConversation.vendor_user_id || '').trim(),
    ])

    const response = jsonOk({
      currentUserId: auth.user.id,
      message: toChatMessagePayload(insertResult.data, auth.user.id),
      conversation: {
        ...toChatConversationPayload(resolvedConversation),
        vendorName:
          vendorNameMap.get(String(resolvedConversation.vendor_user_id || '').trim()) || '',
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
    console.error('chat messages post failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}
