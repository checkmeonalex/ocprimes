import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getConversationForUser, toChatConversationPayload } from '@/lib/chat/chat-server'
import { getConversationClosureState, isSupportConversationRecord } from '@/lib/chat/conversation-closure'
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

    const { conversationId } = await context.params
    if (!conversationId) {
      return jsonError('Missing conversation.', 400)
    }

    const existing = await getConversationForUser(supabase, conversationId, auth.user.id)
    if (existing.error) return jsonError('Unable to load conversation.', 500)
    if (!existing.data?.id) return jsonError('Conversation not found.', 404)

    const supportConversation = await isSupportConversationRecord(existing.data)
    if (supportConversation) return jsonError('Help Center chats cannot be reopened.', 403)

    let admin: any = supabase
    try { admin = createAdminSupabaseClient() } catch { /* use supabase */ }

    const { error: updateError } = await admin
      .from('chat_conversations')
      .update({ closed_at: null, closed_by_user_id: null, closed_reason: null })
      .eq('id', conversationId)

    if (updateError) {
      return jsonError('Unable to reopen conversation.', 500)
    }

    const refreshed = await getConversationForUser(supabase, conversationId, auth.user.id)
    if (refreshed.error || !refreshed.data?.id) return jsonError('Unable to load conversation.', 500)

    const roleInfo = await getUserRoleInfoSafe(supabase, auth.user.id, auth.user.email || '')
    const closure = getConversationClosureState({ conversation: refreshed.data, isAdmin: roleInfo.isAdmin })

    const response = jsonOk({
      conversation: {
        ...toChatConversationPayload(refreshed.data),
        isClosed: closure.isClosed,
        canView: closure.canView,
        canSend: closure.canSend,
        participantNotice: closure.participantNotice,
      },
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat reopen post failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}
