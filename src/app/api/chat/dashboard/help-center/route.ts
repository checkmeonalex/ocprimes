import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { findOrCreateDashboardHelpCenterConversation } from '@/lib/chat/dashboard'
import {
  getConversationClosureState,
  purgeExpiredClosedConversations,
} from '@/lib/chat/conversation-closure'

export async function POST(request: NextRequest) {
  try {
    const { applyCookies, user, isAdmin, isVendor } = await requireDashboardUser(request)

    if (!user?.id) {
      return jsonError('Unauthorized.', 401)
    }

    if (!isVendor || isAdmin) {
      return jsonError('Forbidden.', 403)
    }
    await purgeExpiredClosedConversations()

    const result = await findOrCreateDashboardHelpCenterConversation(user.id)
    if (result.error || !result.data?.id) {
      return jsonError(
        String(result.error?.message || 'Unable to initialize Help Center chat.'),
        500,
      )
    }
    const closure = getConversationClosureState({
      conversation: result.data,
      isAdmin: false,
    })
    if (!closure.canView) {
      return jsonError('This chat is no longer available.', 410)
    }

    const response = jsonOk({
      currentUserId: user.id,
      role: 'vendor',
      conversation: {
        ...result.data,
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
    console.error('chat dashboard help-center post failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}
