import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { chatHelpCenterReportSchema } from '@/lib/chat/schema'
import { findOrCreateDashboardHelpCenterConversation } from '@/lib/chat/dashboard'
import { insertConversationMessage } from '@/lib/chat/chat-server'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'

const REPORT_REASON_LABELS: Record<string, string> = {
  fraudulent_activity: 'Fraudulent activity',
  misleading_information: 'Misleading information',
  wrong_or_fake_product: 'Wrong or fake product',
  poor_quality_or_damaged: 'Poor quality or damaged item',
  abusive_or_threatening_behavior: 'Abusive or threatening behavior',
  high_pricing: 'High pricing',
  scam: 'Scam',
  other: 'Other',
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
    const { data: auth, error: authError } = await supabase.auth.getUser()

    if (authError || !auth.user) {
      return jsonError('Unauthorized.', 401)
    }

    const roleInfo = await getUserRoleInfoSafe(supabase, auth.user.id, auth.user.email || '')
    if (roleInfo.isAdmin) {
      return jsonError('Admin cannot report via Help Center.', 403)
    }

    const body = await request.json().catch(() => null)
    const parsed = chatHelpCenterReportSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError('Invalid report payload.', 400)
    }

    const reason = parsed.data.reason
    const reasonLabel = REPORT_REASON_LABELS[reason] || 'Other'
    const sellerName = String(parsed.data.reportedSellerName || '').trim()
    const sourceConversationId = String(parsed.data.sourceConversationId || '').trim()
    const productId = String(parsed.data.productId || '').trim()
    const otherDetails = String(parsed.data.otherDetails || '').trim()
    const conversationUrl = sourceConversationId
      ? `/backend/admin/messages?conversation=${encodeURIComponent(sourceConversationId)}`
      : ''
    let productUrl = ''

    if (reason === 'other' && !otherDetails) {
      return jsonError('Please describe the issue.', 400)
    }
    if (productId) {
      const productLookup = await supabase
        .from('products')
        .select('slug')
        .eq('id', productId)
        .maybeSingle()
      const productSlug = String(productLookup.data?.slug || '').trim()
      if (productSlug) {
        productUrl = `/product/${encodeURIComponent(productSlug)}`
      }
    }

    const helpCenterResult = await findOrCreateDashboardHelpCenterConversation(auth.user.id)
    if (helpCenterResult.error || !helpCenterResult.data?.id) {
      return jsonError('Unable to connect Help Center.', 500)
    }

    const lines = [
      'Support Report',
      'A user submitted a chat report.',
      `Reason: ${reasonLabel}`,
      `Reported seller: ${sellerName}`,
      productId ? `Product ID: ${productId}` : '',
      sourceConversationId ? `Source chat ID: ${sourceConversationId}` : '',
      conversationUrl ? `Conversation URL: ${conversationUrl}` : '',
      productUrl ? `Product URL: ${productUrl}` : '',
      otherDetails ? `Details: ${otherDetails}` : '',
    ].filter(Boolean)
    const reportBody = lines.join('\n')

    const insertResult = await insertConversationMessage(
      supabase,
      String(helpCenterResult.data.id || '').trim(),
      auth.user.id,
      reportBody,
    )
    if (insertResult.error || !insertResult.data?.id) {
      return jsonError('Unable to send report.', 500)
    }

    const response = jsonOk({
      sent: true,
      conversationId: String(helpCenterResult.data.id || '').trim(),
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat help center report post failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}
