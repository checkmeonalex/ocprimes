import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'
import { findOrCreateDashboardHelpCenterConversation } from '@/lib/chat/dashboard'
import { getConversationClosureState } from '@/lib/chat/conversation-closure'
import { loadVendorDisplayNameMap } from '@/lib/chat/chat-server'

export async function POST(request: NextRequest) {
  try {
    const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
    const { data: auth, error: authError } = await supabase.auth.getUser()

    if (authError || !auth.user) {
      return jsonError('Unauthorized.', 401)
    }

    const roleInfo = await getUserRoleInfoSafe(supabase, auth.user.id, auth.user.email || '')
    if (roleInfo.isAdmin) {
      return jsonError('Admin cannot open Help Center with self.', 403)
    }

    const result = await findOrCreateDashboardHelpCenterConversation(auth.user.id)
    if (result.error || !result.data?.id) {
      return jsonError('Unable to initialize Help Center chat.', 500)
    }

    const closure = getConversationClosureState({
      conversation: result.data,
      isAdmin: false,
    })
    if (!closure.canView) {
      return jsonError('This chat is no longer available.', 410)
    }

    const vendorNameMap = await loadVendorDisplayNameMap([
      String(result.data.vendorUserId || '').trim(),
    ])

    const response = jsonOk({
      currentUserId: auth.user.id,
      conversation: {
        ...result.data,
        vendorName:
          vendorNameMap.get(String(result.data.vendorUserId || '').trim()) || 'OCPRIMES',
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
    console.error('chat help-center post failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}
