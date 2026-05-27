import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import {
  getDashboardConversationById,
} from '@/lib/chat/dashboard'
import {
  getConversationClosureState,
  isSupportConversationRecord,
  maybeAutoCloseConversation,
  purgeExpiredClosedConversations,
  reopenConversation,
} from '@/lib/chat/conversation-closure'
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
      if (supportConversation) {
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
      senderUserId: user.id,
      scope: 'dashboard',
    })

    const uploaded = await uploadToR2(fileEntry, key).catch((error) => {
      console.error('dashboard chat voice upload failed:', error)
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
    console.error('dashboard chat voice upload failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}

