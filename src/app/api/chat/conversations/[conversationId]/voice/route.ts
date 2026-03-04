import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import {
  getConversationForUser,
} from '@/lib/chat/chat-server'
import {
  getConversationClosureState,
  isSupportConversationRecord,
  maybeAutoCloseConversation,
  purgeExpiredClosedConversations,
  reopenConversation,
} from '@/lib/chat/conversation-closure'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'
import { uploadToR2 } from '@/lib/storage/r2'
import {
  buildChatVoiceObjectKey,
  normalizeVoiceDurationSeconds,
  validateVoiceFile,
} from '@/lib/chat/voice-upload'

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
      if (supportConversation) {
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

    const formData = await request.formData().catch(() => null)
    if (!formData) {
      return jsonError('Invalid voice payload.', 400)
    }
    const fileEntry = formData.get('audio')
    if (!(fileEntry instanceof File)) {
      return jsonError('Voice file is required.', 400)
    }
    const validationError = validateVoiceFile(fileEntry)
    if (validationError) {
      const isSizeError = validationError.toLowerCase().includes('large')
      const isTypeError = validationError.toLowerCase().includes('unsupported')
      return jsonError(validationError, isSizeError ? 413 : isTypeError ? 415 : 400)
    }

    const key = buildChatVoiceObjectKey(fileEntry, {
      conversationId,
      senderUserId: auth.user.id,
      scope: 'customer',
    })

    const uploaded = await uploadToR2(fileEntry, key).catch((error) => {
      console.error('customer chat voice upload failed:', error)
      return null
    })

    if (!uploaded?.url) {
      return jsonError('Unable to upload voice message.', 500)
    }

    const durationSeconds = normalizeVoiceDurationSeconds(formData.get('durationSeconds'))

    const response = jsonOk({
      url: String(uploaded.url || '').trim(),
      durationSeconds,
      fileSize: Number(fileEntry.size || 0),
      contentType: String(fileEntry.type || '').trim().toLowerCase(),
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat voice upload failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}

