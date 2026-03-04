import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import {
  chatConversationInitSchema,
} from '@/lib/chat/schema'
import {
  findOrCreateConversation,
  getConversationForUser,
  loadCustomerUnreadCountMap,
  loadVendorDisplayNameMap,
  listConversationsForUser,
  listMessagesForConversation,
  resolveVendorUserIdForProduct,
  toChatConversationPayload,
  toChatMessagePayload,
} from '@/lib/chat/chat-server'
import { resolveSellerStatusForConversation } from '@/lib/chat/seller-status'
import { findOrCreateDashboardHelpCenterConversation } from '@/lib/chat/dashboard'
import {
  getConversationClosureState,
  maybeAutoCloseConversation,
  purgeExpiredClosedConversations,
  reopenConversation,
} from '@/lib/chat/conversation-closure'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'

export async function GET(request: NextRequest) {
  try {
    const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
    const { data: auth, error: authError } = await supabase.auth.getUser()

    if (authError || !auth.user) {
      return jsonError('Unauthorized.', 401)
    }

    await purgeExpiredClosedConversations()

    const listResult = await listConversationsForUser(supabase, auth.user.id)
    if (listResult.error) {
      return jsonError('Unable to load conversations.', 500)
    }

    const roleInfo = await getUserRoleInfoSafe(supabase, auth.user.id, auth.user.email || '')
    let helpCenterConversationId = ''
    if (!roleInfo.isAdmin) {
      const helpCenterResult = await findOrCreateDashboardHelpCenterConversation(auth.user.id)
      if (helpCenterResult.data?.id) {
        helpCenterConversationId = String(helpCenterResult.data.id || '').trim()
      }
    }
    const listRows = Array.isArray(listResult.data) ? [...listResult.data] : []
    if (helpCenterConversationId) {
      const helpCenterIndex = listRows.findIndex(
        (row) => String(row?.id || '').trim() === helpCenterConversationId,
      )
      if (helpCenterIndex >= 0) {
        const helpCenterRow = listRows[helpCenterIndex]
        const closure = getConversationClosureState({
          conversation: helpCenterRow,
          isAdmin: roleInfo.isAdmin,
        })
        if (closure.isClosed || !closure.canSend || !closure.canView) {
          const reopenResult = await reopenConversation({ conversationId: helpCenterConversationId })
          if (!reopenResult.error) {
            const refreshed = await getConversationForUser(
              supabase,
              helpCenterConversationId,
              auth.user.id,
            )
            if (refreshed.data?.id) {
              listRows[helpCenterIndex] = refreshed.data
            }
          }
        }
      }
    }
    const unreadCountMap = await loadCustomerUnreadCountMap(
      listRows.map((row) => ({
        id: String(row?.id || '').trim(),
        vendorUserId: String(row?.vendor_user_id || '').trim(),
      })),
    )
    const vendorNameMap = await loadVendorDisplayNameMap(
      listRows.map((row) => String(row?.vendor_user_id || '').trim()),
    )
    const conversations = listRows
      .map((row) => {
        const conversationId = String(row?.id || '').trim()
        const isHelpCenterConversation =
          Boolean(helpCenterConversationId) && conversationId === helpCenterConversationId
        const closure = getConversationClosureState({
          conversation: row,
          isAdmin: roleInfo.isAdmin,
        })
        return {
          ...toChatConversationPayload(row),
          vendorName: isHelpCenterConversation
            ? 'OCPRIMES'
            : vendorNameMap.get(String(row?.vendor_user_id || '').trim()) || '',
          isHelpCenter: isHelpCenterConversation,
          isClosed: closure.isClosed,
          canView: closure.canView,
          canSend: closure.canSend,
          participantNotice: closure.participantNotice,
          participantVisibleUntil: closure.participantVisibleUntil,
          adminRetentionUntil: closure.adminRetentionUntil,
          unreadCount: unreadCountMap.get(conversationId) || 0,
        }
      })
      .filter((conversation) => Boolean(conversation.canView))

    const response = jsonOk({
      currentUserId: auth.user.id,
      helpCenterConversationId,
      conversations,
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

    await purgeExpiredClosedConversations()

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

    const autoCloseResult = await maybeAutoCloseConversation(conversationResult.data)
    if (autoCloseResult.error) {
      return jsonError('Unable to start conversation.', 500)
    }
    const resolvedConversation =
      autoCloseResult.changed
        ? (await getConversationForUser(supabase, conversationResult.data.id, auth.user.id)).data
        : conversationResult.data
    if (!resolvedConversation?.id) {
      return jsonError('Conversation not found.', 404)
    }

    const messagesResult = await listMessagesForConversation(
      supabase,
      resolvedConversation.id,
      10,
    )

    if (messagesResult.error) {
      return jsonError('Unable to load conversation messages.', 500)
    }

    const sellerStatus = await resolveSellerStatusForConversation({
      conversationId: conversationResult.data.id,
      customerUserId: auth.user.id,
      vendorUserId: vendorResult.vendorUserId,
    })
    const roleInfo = await getUserRoleInfoSafe(supabase, auth.user.id, auth.user.email || '')
    const vendorNameMap = await loadVendorDisplayNameMap([
      String(resolvedConversation.vendor_user_id || '').trim(),
    ])
    const closure = getConversationClosureState({
      conversation: resolvedConversation,
      isAdmin: roleInfo.isAdmin,
    })
    if (!closure.canView) {
      return jsonError('This chat is no longer available.', 410)
    }

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
      sellerStatusLabel: sellerStatus.sellerStatusLabel,
      sellerOnline: sellerStatus.sellerOnline,
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat conversations post failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}
