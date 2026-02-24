import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { listDashboardConversations } from '@/lib/chat/dashboard'
import {
  getConversationClosureState,
  purgeExpiredClosedConversations,
} from '@/lib/chat/conversation-closure'

export async function GET(request: NextRequest) {
  try {
    const { applyCookies, user, isAdmin, isVendor } = await requireDashboardUser(request)

    if (!user?.id) {
      return jsonError('Unauthorized.', 401)
    }

    if (!isAdmin && !isVendor) {
      return jsonError('Forbidden.', 403)
    }
    await purgeExpiredClosedConversations()

    const result = await listDashboardConversations()
    if (result.error) {
      return jsonError('Unable to load conversations.', 500)
    }

    const scopedConversations = isAdmin
      ? result.data
      : result.data.filter((conversation) => {
          const safeUserId = String(user.id || '').trim()
          return (
            String(conversation.vendorUserId || '').trim() === safeUserId ||
            String(conversation.customerUserId || '').trim() === safeUserId
          )
        })

    const conversations = scopedConversations
      .map((conversation) => {
        const closure = getConversationClosureState({
          conversation,
          isAdmin,
        })
        return {
          ...conversation,
          isClosed: closure.isClosed,
          canView: closure.canView,
          canSend: closure.canSend,
          participantNotice: closure.participantNotice,
          participantVisibleUntil: closure.participantVisibleUntil,
          adminRetentionUntil: closure.adminRetentionUntil,
        }
      })
      .filter((conversation) => Boolean(conversation.canView))

    const response = jsonOk({
      currentUserId: user.id,
      role: isAdmin ? 'admin' : 'vendor',
      conversations,
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat dashboard conversations get failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}
