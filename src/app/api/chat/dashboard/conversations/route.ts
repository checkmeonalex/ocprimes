import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { listDashboardConversations } from '@/lib/chat/dashboard'

export async function GET(request: NextRequest) {
  try {
    const { applyCookies, user, isAdmin, isVendor } = await requireDashboardUser(request)

    if (!user?.id) {
      return jsonError('Unauthorized.', 401)
    }

    if (!isAdmin && !isVendor) {
      return jsonError('Forbidden.', 403)
    }

    const result = await listDashboardConversations()
    if (result.error) {
      return jsonError('Unable to load conversations.', 500)
    }

    const response = jsonOk({
      currentUserId: user.id,
      role: isAdmin ? 'admin' : 'vendor',
      conversations: result.data,
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat dashboard conversations get failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}
